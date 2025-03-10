import {
  CanvasTexture,
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
    console.log('Marker mesh:', markerMesh?.position);
    console.log(' position:', position);
    markerMesh.position.copy(position);

    // Save marker text in userData for later use.
    markerMesh.userData = { text: marker.text, color: marker.color };
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
    const material = new SpriteMaterial({
      map: texture,
      transparent: true,
    });
    const sprite = new Sprite(material);
    sprite.scale.set(3, 3, 3);
    return sprite;
  }

  /**
   * Attaches a click listener to the renderer DOM element.
   */
  addClickListener(): void {
    this.renderer.domElement.addEventListener('click', (event) =>
      this.onClick(event)
    );
  }

  /**
   * Handles click events: uses a Raycaster to detect if a marker was clicked.
   * If so, shows a label above the marker.
   */
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

  /**
   * Creates and shows a label above the clicked marker.
   */
  showLabel(markerObj: Object3D): void {
    // Remove an existing label if present.
    if (markerObj.userData['label']) {
      this.scene.remove(markerObj.userData['label']);
    }
    const text = markerObj.userData['text'] || '';
    const color = markerObj.userData['color'] || 'black';
    const label = this.createLabelSprite(text, color);
    // Position the label 2 units above the marker.
    label.position.copy(markerObj.position).add(new Vector3(0, 2, 0));
    this.scene.add(label);
    markerObj.userData['label'] = label;
    // Remove the label after 3 seconds.
    setTimeout(() => {
      this.scene.remove(label);
      markerObj.userData['label'] = null;
    }, 3000);
  }

  /**
   * Creates a label sprite (a small box with text).
   */
  createLabelSprite(text: string, color: string): Sprite {
    const lines = text.split('\n').map((line) => line.trim());
    const canvas = document.createElement('canvas');
    const lineHeight = 16;

    canvas.height = lineHeight * lines.length + 10;
    canvas.width = 256;
    console.log('Label canvas size:', canvas.width, canvas.height);
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw a background box.
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Draw border.
    ctx.strokeStyle = 'white';
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${lineHeight - 4}px`;
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let y = 2;
    for (const line of lines) {
      ctx.fillText(line, canvas.width / 2, y);
      y += lineHeight;
    }
    const texture = new CanvasTexture(canvas);
    const material = new SpriteMaterial({ map: texture, transparent: true });
    const sprite = new Sprite(material);
    return sprite;
  }
}
