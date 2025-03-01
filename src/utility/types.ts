export interface DEMResponse {
  elevations: number[];
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
