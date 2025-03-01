import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';

import { demAsset, satelliteAsset } from '../../environment';
import { loadDEMData, loadSatelliteImage } from '../utility/tiff-utils';
import { Rectangle } from '../utility/types';

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
  demElevation!: number[];
  demWidth!: number;
  demHeight!: number;
  satelliteTexture!: THREE.Texture;

  // Extent in local coordinates. Initially set to a default placeholder.
  rectangle!: Rectangle;

  // Spinner flag.
  loading: boolean = true;

  // time
  startTime = Date.now();
  constructor() {}

  async ngOnInit(): Promise<void> {
    console.log('Component initialization started.');
    try {
      // Load DEM and satellite image concurrently.
      const demResult = await loadDEMData(demAsset);
      this.demElevation = demResult.elevations;
      this.demWidth = demResult.width;
      this.demHeight = demResult.height;
      this.rectangle = demResult.rectangle;
      const demTime = Date.now();
      console.log(`DEM loaded: ${this.demWidth} x ${this.demHeight}`);
      console.log(`DEM loaded in ${(demTime - this.startTime) / 1000} ms.`);

      const texture = await loadSatelliteImage(satelliteAsset);
      const satelliteTime = Date.now();
      console.log(
        `Satellite image loaded in ${(satelliteTime - demTime) / 1000}s.`
      );

      this.satelliteTexture = texture;
      console.log('Satellite texture loaded.');

      // Create the terrain mesh.
      this.createTerrainMesh();
      console.log(
        `Terrain mesh created in ${
          (Date.now() - satelliteTime) / 1000
        }s.\nTotal time  ${(Date.now() - this.startTime) / 1000}s.`
      );
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
      2000
    );
    this.camera.position.set(0, 150, 250);
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

  // Render loop: update controls and render the scene.
  animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  //Create the terrain mesh from DEM data and apply the satellite texture.
  createTerrainMesh(): void {
    console.log('Creating terrain mesh from DEM data...');
    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const gridWidth = this.demWidth;
    const gridHeight = this.demHeight;
    const dx = (this.rectangle.maxX - this.rectangle.minX) / (gridWidth - 1);
    const dy = (this.rectangle.maxY - this.rectangle.minY) / (gridHeight - 1);

    console.log(
      `Using local extent: [${this.rectangle.minX}, ${this.rectangle.minY}, ${this.rectangle.maxX}, ${this.rectangle.maxY}]. ` +
        `Grid dimensions: ${gridWidth} x ${gridHeight}, dx: ${dx}, dy: ${dy}`
    );

    // Create vertices and UVs.
    for (let j = 0; j < gridHeight; j++) {
      for (let i = 0; i < gridWidth; i++) {
        const localX = this.rectangle.minX + i * dx;
        const localZ = this.rectangle.minY + j * dy;

        // Adjust elevation scale as needed.
        const elevation = this.demElevation[j * gridWidth + i];
        vertices.push(localX, elevation, localZ);

        const u = i / (gridWidth - 1);
        const v = 1 - j / (gridHeight - 1);
        uvs.push(u, v);
      }
    }
    console.log('Total vertices:', vertices.length / 3);

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
    });
    console.log('Material created with satellite texture.');
    this.mesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.mesh);
    console.log('Terrain mesh added to scene.');
  }
}
