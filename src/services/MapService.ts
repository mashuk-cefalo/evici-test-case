import {
  AmbientLight,
  BufferGeometry,
  CanvasTexture,
  Float32BufferAttribute,
  Mesh,
  MeshLambertMaterial,
  MOUSE,
  PerspectiveCamera,
  Scene,
  Texture,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three-stdlib';
import { DEMResponse } from '../utility/types';

/**
 * Service class for managing the Three.js scene and rendering the terrain mesh.
 * The class constructor initializes the Three.js scene, camera, renderer, and controls.
 * The renderMesh method creates a terrain mesh from the provided DEM data and satellite image.
 * The constructor inputs the ID of the container element where the renderer will be appended.
 * The renderMesh method takes the DEM data and satellite image canvas as input.
 */

export class MapService {
  mapContainer: string; // ID of the container element.
  scene!: Scene;
  camera!: PerspectiveCamera;
  renderer!: WebGLRenderer;
  mesh?: Mesh;
  controls!: OrbitControls;
  animationId: number = 0;

  constructor(mapContainer: string) {
    this.mapContainer = mapContainer;
    this.initThree();
    this.addLights();
    this.addControls();
    console.log('Three.js scene initialization complete.');
    this.animate();
  }

  destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.controls?.dispose();
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      if (this.mesh.material instanceof MeshLambertMaterial) {
        this.mesh.material.map?.dispose();
        this.mesh.material.dispose();
      }
    }
    if (this.renderer) {
      this.renderer.dispose();
      const container = document.getElementById(this.mapContainer);
      if (container && this.renderer.domElement) {
        container.removeChild(this.renderer.domElement);
      }
    }
    console.log('MapService destroyed.');
  }

  animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  initThree(): void {
    console.log('Initializing Three.js scene...');
    this.scene = new Scene();
    this.camera = new PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 150, 50);
    this.camera.lookAt(new Vector3(0, 0, 0));

    this.renderer = new WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    const container = document.getElementById(this.mapContainer);
    if (!container) {
      console.error('No container element found with id "mapContainer".');
      return;
    }
    container.appendChild(this.renderer.domElement);
    console.log('Renderer appended to container.');
  }

  addLights(): void {
    // // Add ambient light only.
    const ambientLight = new AmbientLight(0xffffff, 5.0);
    this.scene.add(ambientLight);
    console.log('Ambient light added to scene.');
  }

  addControls(): void {
    // Initialize OrbitControls for interactive map view.
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.minDistance = 5; // Minimum distance from the zoom out.
    this.controls.maxDistance = 1000;
    this.controls.enablePan = true;
    this.controls.screenSpacePanning = true; // Allows panning in screen space.

    this.controls.mouseButtons = {
      LEFT: MOUSE.PAN,
      MIDDLE: MOUSE.DOLLY,
      RIGHT: MOUSE.ROTATE,
    };
    console.log('OrbitControls initialized.');
  }

  async renderMesh(
    DEMResponse: DEMResponse,
    canvas: HTMLCanvasElement
  ): Promise<void> {
    const { elevations, width, height, rectangle } = DEMResponse;
    const { minX, maxX, minY, maxY } = rectangle;

    console.log('Creating terrain mesh from DEM data...');
    // Create positions, UVs, and indices for the terrain mesh.
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const dx = (maxX - minX) / (width - 1);
    const dy = (maxY - minY) / (height - 1);

    console.log(
      `Using local rectangle: [${minX}, ${minY}, ${maxX}, ${maxY}]. Grid dimensions: ${width} x ${height}, dx: ${dx}, dy: ${dy}`
    );

    // Create positions and UVs.
    for (let h = 0; h < height; h++) {
      for (let w = 0; w < width; w++) {
        // Calculate the local X and Z coordinates based on the grid position.
        const localX = minX + w * dx;
        const localZ = minY + h * dy;
        // Get the elevation value from the DEM data.
        const elevation = elevations[h * width + w];
        // Add the vertex position to the position array.
        positions.push(localX, elevation, localZ);

        // Normalize UV coordinates to the range [0, 1].
        const u = w / (width - 1);
        const v = 1 - h / (height - 1);
        uvs.push(u, v);
      }
    }
    console.log('Total vertices:', positions.length / 3);

    // Build indices for triangles.
    for (let h = 0; h < height - 1; h++) {
      for (let w = 0; w < width - 1; w++) {
        // Calculate the indices of the four corners of the current grid cell.
        const a = h * width + w;
        const b = h * width + w + 1;
        const c = (h + 1) * width + w;
        const d = (h + 1) * width + w + 1;
        // Create two triangles for the current grid cell.
        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }
    console.log('Total triangles:', indices.length / 3);

    // Create a BufferGeometry object and set its attributes.
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    // Create a texture from the provided satellite canvas.
    const texture = new CanvasTexture(canvas);
    texture.needsUpdate = true;

    // Create a MeshLambertMaterial with the texture.
    const material = new MeshLambertMaterial({ map: texture });
    console.log('Material created with satellite texture.');

    // Create a MeshLambertMaterial with the texture.
    this.mesh = new Mesh(geometry, material);
    this.scene.add(this.mesh);
    console.log('Terrain mesh added to scene.');
  }
}
