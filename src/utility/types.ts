export interface DEMResponse {
  elevations: Float32Array;
  width: number;
  height: number;
  rectangle: Rectangle;
}

export interface Rectangle {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}
