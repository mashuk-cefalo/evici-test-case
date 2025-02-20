import {
  Credit,
  GeographicTilingScheme,
  HeightmapTerrainData,
  TerrainProvider,
  TilingScheme,
  TileAvailability,
  Event,
  Math as CesiumMath,
  Request,
  TerrainData,
} from 'cesium';

function createHeightmapTerrainData(
  demData: number[],
  width: number,
  height: number
): HeightmapTerrainData {
  const options = {
    width,
    height,
    buffer: demData,
    structure: {
      heightScale: 1.0,
      heightOffset: 0,
      elementsPerHeight: 1,
      stride: 1,
      elementMultiplier: 256,
      isBigEndian: false,
    },
  };
  return new HeightmapTerrainData(options as any);
}

export class CustomTerrainProvider implements TerrainProvider {
  // Required properties
  readonly errorEvent = new Event();
  readonly credit: Credit = new Credit('Custom Terrain Provider');
  readonly tilingScheme: TilingScheme;
  readonly ready: boolean = true;
  readonly hasWaterMask: boolean = false;
  readonly hasVertexNormals: boolean = false;

  private heightmapTerrainData: HeightmapTerrainData;

  constructor(demData: number[], width: number, height: number) {
    this.tilingScheme = new GeographicTilingScheme();
    this.heightmapTerrainData = createHeightmapTerrainData(
      demData,
      width,
      height
    );
  }
  requestTileGeometry(
    x: number,
    y: number,
    level: number,
    request?: Request
  ): Promise<TerrainData> | undefined {
    throw new Error('Method not implemented.');
  }
  availability!: TileAvailability;
  loadTileDataAvailability(
    x: number,
    y: number,
    level: number
  ): undefined | Promise<void> {
    throw new Error('Method not implemented.');
  }

  getLevelMaximumGeometricError(level: number): number {
    // Adjust the error based on your data
    return CesiumMath.factorial(level);
  }

  getTileDataAvailable(
    x: number,
    y: number,
    level: number
  ): boolean | undefined {
    // Return true if tile data is available
    return true;
  }
}
