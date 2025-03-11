import {
  Object3D,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Sprite,
  SpriteMaterial,
  Texture,
  TextureLoader,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { Marker, Rectangle } from '../utility/types';

export class MarkerService {
  // We assume these are provided (for example, from your MapService):
  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;

  // A list to keep track of marker sprites.
  markers: Sprite[] = [];

  // For computing world positions:
  // worldRectangle defines the DEM’s horizontal extents.
  rectangle: Rectangle;
  svgIcon!: string;

  constructor(
    scene: Scene,
    camera: PerspectiveCamera,
    renderer: WebGLRenderer,
    rectangle: Rectangle
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.rectangle = rectangle;

    this.addClickListener();
  }

  private async fetchSvgText(): Promise<string> {
    if (this.svgIcon) {
      return this.svgIcon;
    }
    const response = await fetch('assets/marker.svg');
    if (!response.ok) {
      throw new Error(`Failed to load SVG`);
    }
    this.svgIcon = await response.text();
    console.log('Loaded SVG:', this.svgIcon);
    return this.svgIcon;
  }

  /**
   * Adds a marker to the scene.
   * Marker coordinates (x, y, z) are normalized (0 to 1).
   */
  async addMarker(marker: Marker): Promise<void> {
    console.log('Adding marker:', marker);

    const position = new Vector3(marker.x, marker.z, marker.y);
    const markerMesh = await this.createMarkerSprite(marker.color);
    markerMesh.position.copy(position);

    // Save marker text in userData for later use.
    markerMesh.userData = {
      text: marker.text,
      color: marker.color,
      baseY: 0,
      clicked: false,
    };
    this.scene.add(markerMesh);
    this.markers.push(markerMesh);
  }

  private async createMarkerSprite(color: string): Promise<Sprite> {
    const svgText = await this.fetchSvgText();
    const coloredSvgText = svgText.replace(/fill="[^"]*"/, `fill="${color}"`);
    const svgDataUrl = `data:image/svg+xml;base64,${btoa(coloredSvgText)}`;
    const textureLoader = new TextureLoader();
    const texture = await new Promise<Texture>((resolve, reject) => {
      textureLoader.load(
        svgDataUrl,
        (tex) => resolve(tex),
        undefined,
        (err) => reject(err)
      );
    });

    // 5. Create a sprite from the texture.
    const material = new SpriteMaterial({ map: texture, transparent: true });
    const sprite = new Sprite(material);
    sprite.scale.set(3, 3, 3);
    return sprite;
  }

  // Attaches a click listener to the renderer DOM element.
  addClickListener(): void {
    this.renderer.domElement.addEventListener('click', (event) =>
      this.onClick(event)
    );
  }

  // If so, shows a label above the marker.
  onClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const mouse = new Vector2();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new Raycaster();
    raycaster.setFromCamera(mouse, this.camera);
    const intersects = raycaster.intersectObjects(this.markers);
    if (intersects.length > 0) {
      const markerSprite = intersects[0].object;
      this.showLabel(markerSprite);
    }
  }

  showLabel(markerObj: Object3D): void {
    markerObj.userData['clicked'] = true;
    const text = markerObj.userData['text'];
    const color = markerObj.userData['color'];
    const labelDiv = document.createElement('div');
    labelDiv.innerText = text;
    labelDiv.style.position = 'absolute';
    labelDiv.style.background = color;
    labelDiv.style.color = 'white';
    labelDiv.style.padding = '10px';
    labelDiv.style.border = '1px solid white';
    labelDiv.style.borderRadius = '5px';
    labelDiv.style.fontFamily = 'roboto';

    document.body.appendChild(labelDiv);

    // Convert marker 3D position to 2D screen coords.
    const vector = markerObj.position.clone();
    vector.project(this.camera); // project to normalized device coordinates

    // Map NDC to screen coords
    const halfWidth = this.renderer.domElement.clientWidth / 2;
    const halfHeight = this.renderer.domElement.clientHeight / 2;

    const screenX = vector.x * halfWidth + halfWidth;
    const screenY = -vector.y * halfHeight + halfHeight;

    // Position the div
    // Adjust for the renderer's DOM element offset if needed.
    const canvasRect = this.renderer.domElement.getBoundingClientRect();
    labelDiv.style.left = canvasRect.left + screenX + 'px';
    labelDiv.style.top = canvasRect.top + screenY + 'px';

    // Remove after 3s
    setTimeout(() => {
      document.body.removeChild(labelDiv);
      markerObj.userData['clicked'] = false;
    }, 3000);
  }

  animateMarkers(): void {
    const time = Date.now() * 0.002;
    // Assuming you keep track of all marker sprites in an array this.markers.
    this.markers.forEach((sprite: Sprite) => {
      // If baseY has not been set, initialize it.
      if (sprite.userData['clicked']) {
        return;
      }
      if (sprite.userData['baseY'] === 0) {
        sprite.userData['baseY'] = sprite.position.y;
      }
      // Apply a jump effect: oscillate the y-position by 0.5 units.
      sprite.position.y = sprite.userData['baseY'] + Math.sin(time * 2) * 0.5;
      // Apply a small rotation to the sprite material.
      //   sprite.material.rotation = Math.sin(time) * 0.2;
    });
  }
}
