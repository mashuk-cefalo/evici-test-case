import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';

// @ts-ignore
import { fromArrayBuffer } from 'geotiff';

const demAsset = 'assets/dem.tif';
const satelliteAsset = 'assets/lunar.tiff';

// Optional helper to display the processed satellite image.
const addImageToDom = (canvas: HTMLCanvasElement) => {
  const url = canvas.toDataURL('image/png');
  const img = document.createElement('img');
  img.src = url;
  img.style.maxWidth = '80vw';
  img.style.maxHeight = '80vh';
  img.style.marginTop = '40px';
  document.body.appendChild(img);
};

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  // Three.js essentials.
  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  renderer!: THREE.WebGLRenderer;
  mesh?: THREE.Mesh;
  controls!: OrbitControls;
  animationId: number = 0;

  // DEM and satellite image data.
  demElevation!: Float32Array;
  demWidth!: number;
  demHeight!: number;
  satelliteTexture!: THREE.Texture;

  // Extent in local coordinates. Initially set to a default placeholder.
  extent = { minX: -50, maxX: 50, minY: -50, maxY: 50 };
  elevationFactor: number = 1 / 50;

  // Spinner flag.
  loading: boolean = true;

  constructor() {}

  async ngOnInit(): Promise<void> {
    console.log('Component initialization started.');
    try {
      // Load DEM and satellite image concurrently.
      const demResult = await this.loadDEM(demAsset);

      const texture = await this.loadSatelliteImage(satelliteAsset);

      // Set extent based on DEM bounding box.
      this.setExtent(demResult.boundingBox);

      this.demElevation = demResult.data;
      this.demWidth = demResult.width;
      this.demHeight = demResult.height;
      this.satelliteTexture = texture;
      console.log(`DEM loaded: ${this.demWidth} x ${this.demHeight}`);
      console.log('Satellite texture loaded.');
      // Create the terrain mesh.
      this.createTerrainMesh();
      this.loading = false;
    } catch (error) {
      console.error('Error loading assets:', error);
      this.loading = false;
    }
  }

  ngAfterViewInit(): void {
    this.initThree();
    this.animate();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animationId);
    if (this.controls) this.controls.dispose();
  }

  /**
   * Initialize the Three.js scene, camera, renderer, and OrbitControls.
   */
  initThree(): void {
    console.log('Initializing Three.js scene...');
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 150, 150);
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    const container = document.getElementById('mapContainer');
    if (!container) {
      console.error('No container element found with id "mapContainer".');
      return;
    }
    container.appendChild(this.renderer.domElement);
    console.log('Renderer appended to container.');

    // // Add ambient light only.
    const ambientLight = new THREE.AmbientLight(0xffffff, 5.0);
    this.scene.add(ambientLight);
    console.log('Ambient light added to scene.');

    // Initialize OrbitControls for interactive map view.
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.minDistance = 50;
    this.controls.maxDistance = 1000;
    console.log('OrbitControls initialized.');

    console.log('Three.js scene initialization complete.');
  }

  /**
   * Render loop: update controls and render the scene.
   */
  animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Create the terrain mesh from DEM data and apply the satellite texture.
   */
  createTerrainMesh(): void {
    console.log('Creating terrain mesh from DEM data...');
    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const gridWidth = this.demWidth;
    const gridHeight = this.demHeight;
    const dx = (this.extent.maxX - this.extent.minX) / (gridWidth - 1);
    const dy = (this.extent.maxY - this.extent.minY) / (gridHeight - 1);

    console.log(
      `Using local extent: [${this.extent.minX}, ${this.extent.minY}, ${this.extent.maxX}, ${this.extent.maxY}]. ` +
        `Grid dimensions: ${gridWidth} x ${gridHeight}, dx: ${dx}, dy: ${dy}`
    );

    // Create vertices and UVs.
    for (let j = 0; j < gridHeight; j++) {
      for (let i = 0; i < gridWidth; i++) {
        const localX = this.extent.minX + i * dx;
        const localZ = this.extent.minY + j * dy;
        // Adjust elevation scale as needed.
        const elevation =
          this.demElevation[j * gridWidth + i] * this.elevationFactor;
        vertices.push(localX, elevation, localZ);

        const u = i / (gridWidth - 1);
        const v = 1 - j / (gridHeight - 1);
        uvs.push(u, v);
      }
    }
    console.log('Total vertices:', vertices.length / 3);
    console.log('UV sample start:', uvs.slice(0, 6), 'end:', uvs.slice(-6));

    // Build indices for triangles.
    for (let j = 0; j < gridHeight - 1; j++) {
      for (let i = 0; i < gridWidth - 1; i++) {
        const a = j * gridWidth + i;
        const b = j * gridWidth + i + 1;
        const c = (j + 1) * gridWidth + i;
        const d = (j + 1) * gridWidth + i + 1;
        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }
    console.log('Total triangles:', indices.length / 3);

    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(vertices, 3)
    );
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshLambertMaterial({
      map: this.satelliteTexture,
      color: 0xffffff, // Use white as base to let the texture's contrast show.
    });
    console.log('Material created with satellite texture.');
    this.mesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.mesh);
    console.log('Terrain mesh added to scene.');
  }

  /**
   * Load DEM data from a TIFF file using GeoTIFF.
   * Also reads the bounding box from metadata.
   */
  async loadDEM(url: string): Promise<{
    data: Float32Array;
    width: number;
    height: number;
    boundingBox: number[];
  }> {
    console.log(`Loading DEM from ${url}...`);
    try {
      const image = await this.loadTiff(url);
      const width = image.getWidth();
      const height = image.getHeight();
      const rasterData = await image.readRasters({ interleave: true });
      const data = new Float32Array(rasterData);
      const boundingBox = image.getBoundingBox();
      console.log(`DEM loaded with dimensions: ${width} x ${height}`);
      return { data, width, height, boundingBox };
    } catch (error) {
      console.error('Error loading DEM:', error);
      throw error;
    }
  }

  /**
   * Load the satellite image from a TIFF file, extract RGB channels, adjust contrast, and create a texture.
   */
  async loadSatelliteImage(url: string): Promise<THREE.Texture> {
    console.log(`Loading satellite image from ${url}...`);
    try {
      const image = await this.loadTiff(url);
      const width = image.getWidth();
      const height = image.getHeight();
      const rasterData = await image.readRasters();
      // For Sentinel-2: channels 4, 3, and 2 (indices 3, 2, 1) are used as R, G, B.
      const channelR = rasterData[3];
      const channelG = rasterData[2];
      const channelB = rasterData[1];

      // Create a canvas with the original image size.
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      const imageData = ctx.createImageData(width, height);

      let redMin = 255,
        redMax = 0,
        greenMin = 255,
        greenMax = 0,
        blueMin = 255,
        blueMax = 0;

      for (let i = 0; i < width * height; i++) {
        let r = channelR[i];
        let g = channelG[i];
        let b = channelB[i];
        // Track min/max values for each channel.
        redMin = Math.min(redMin, r);
        redMax = Math.max(redMax, r);
        greenMin = Math.min(greenMin, g);
        greenMax = Math.max(greenMax, g);
        blueMin = Math.min(blueMin, b);
        blueMax = Math.max(blueMax, b);
      }

      const redAspect = (redMax - redMin) / 255;
      const greenAspect = (greenMax - greenMin) / 255;
      const blueAspect = (blueMax - blueMin) / 255;
      for (let i = 0; i < width * height; i++) {
        let r = (channelR[i] - redMin) / redAspect;
        let g = (channelG[i] - greenMin) / greenAspect;
        let b = (channelB[i] - blueMin) / blueAspect;

        imageData.data[i * 4] = r;
        imageData.data[i * 4 + 1] = g;
        imageData.data[i * 4 + 2] = b;
        imageData.data[i * 4 + 3] = 255;

        // Track min/max values for each channel.
        redMin = Math.min(redMin, r);
        redMax = Math.max(redMax, r);
        greenMin = Math.min(greenMin, g);
        greenMax = Math.max(greenMax, g);
        blueMin = Math.min(blueMin, b);
        blueMax = Math.max(blueMax, b);
      }

      console.log('Red min/max:', redMin, redMax);
      console.log('Green min/max:', greenMin, greenMax);
      console.log('Blue min/max:', blueMin, blueMax);
      ctx.putImageData(imageData, 0, 0);
      console.log('Satellite image processed into canvas.');

      // Resize the canvas to 70% of the window's innerWidth while preserving aspect ratio.
      const desiredWidth = window.innerWidth * 0.7;
      const scale = desiredWidth / canvas.width;
      const desiredHeight = canvas.height * scale;
      const resizedCanvas = document.createElement('canvas');
      resizedCanvas.width = desiredWidth;
      resizedCanvas.height = desiredHeight;
      const resizedCtx = resizedCanvas.getContext('2d')!;
      resizedCtx.drawImage(canvas, 0, 0, desiredWidth, desiredHeight);
      console.log(
        `Resized satellite image to ${desiredWidth} x ${desiredHeight}`
      );

      // Optionally, attach the resized canvas to the DOM for debugging.
      addImageToDom(resizedCanvas);

      const texture = new THREE.CanvasTexture(resizedCanvas);
      texture.needsUpdate = true;
      return texture;
    } catch (error) {
      console.error('Error loading satellite image:', error);
      throw error;
    }
  }

  /**
   * Set the local extent based on the DEM's bounding box.
   * Also computes a dynamic scale factor based on window dimensions.
   * Expected box format: [minX, minY, maxX, maxY].
   */
  setExtent(box: number[]): void {
    if (box) {
      const [left, bottom, right, top] = box;
      const globalWidth = right - left;
      const globalHeight = top - bottom;

      // We want the DEM to occupy 20% of the window's width and height.
      const desiredWidth = window.innerWidth * 0.2;
      const desiredHeight = window.innerHeight * 0.2;
      console.log('Window dimensions:', window.innerWidth, window.innerHeight);
      console.log('Desired DEM size (px):', desiredWidth, desiredHeight);

      // Calculate scale factors for X and Y.
      const scaleFactorX = desiredWidth / globalWidth;
      const scaleFactorY = desiredHeight / globalHeight;

      // Use the smaller scale factor to preserve aspect ratio.
      const scaleFactor = Math.min(scaleFactorX, scaleFactorY);
      console.log('Dynamic scale factor:', scaleFactor);

      // Compute the local (scaled) width and height.
      const width = globalWidth * scaleFactor;
      const height = globalHeight * scaleFactor;

      // Center the extent around (0,0).
      const minX = -width / 2;
      const maxX = width / 2;
      const minY = -height / 2;
      const maxY = height / 2;

      this.extent = { minX, maxX, minY, maxY };
      console.log('Computed DEM extent (local coordinates):', this.extent);
    } else {
      console.warn('No bounding box found; using default extent.');
    }
  }

  /**
   * Helper method to load a TIFF file using fetch and GeoTIFF.
   */
  async loadTiff(url: string): Promise<any> {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const tiff = await fromArrayBuffer(arrayBuffer);
      const image = await tiff.getImage();
      return image;
    } catch (error) {
      console.error('Error loading TIFF:', error);
      throw error;
    }
  }
}
