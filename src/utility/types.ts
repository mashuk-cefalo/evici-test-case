export interface DEMResponse {
  elevations: number[];
  width: number;
  height: number;
  rectangle: Rectangle;
  minElevation: number;
  maxElevation: number;
}

export interface Rectangle {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface Marker {
  x: number;
  y: number;
  z: number;
  color: string;
  text: string;
}
