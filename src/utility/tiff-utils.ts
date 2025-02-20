import {
  Cartesian3,
  ComponentDatatype,
  Geometry,
  GeometryAttribute,
  Material,
  PrimitiveType,
  Rectangle,
} from 'cesium';
import { fromArrayBuffer, GeoTIFFImage, TypedArray } from 'geotiff';

export async function loadTiff(url: string): Promise<GeoTIFFImage> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const tiff = await fromArrayBuffer(arrayBuffer);
  return await tiff.getImage();
}

export function createImageFromData(
  rData: Uint8Array,
  gData: Uint8Array,
  bData: Uint8Array,
  width: number,
  height: number
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to get canvas rendering context');
  }

  const dataLength = width * height * 4;
  const imageDataArray = new Uint8ClampedArray(dataLength);

  for (let i = 0, j = 0; i < dataLength; i += 4, j++) {
    imageDataArray[i] = rData[j]; // Red
    imageDataArray[i + 1] = gData[j]; // Green
    imageDataArray[i + 2] = bData[j]; // Blue
    imageDataArray[i + 3] = 255; // Alpha
  }

  const imageData = new ImageData(imageDataArray, width, height);
  context.putImageData(imageData, 0, 0);

  return canvas.toDataURL('image/png');
}

export const readDEMData = async (
  demAsset: string
): Promise<{
  width: number;
  height: number;
  elevationData: TypedArray;
  rectangle: Rectangle;
  boundingBox: number[];
}> => {
  const demImage = await loadTiff(demAsset);

  // Get DEM bounding box and dimensions
  const boundingBox = demImage.getBoundingBox(); // [west, south, east, north]
  const width = demImage.getWidth();
  const height = demImage.getHeight();
  const rectangle = Rectangle.fromDegrees(
    boundingBox[0],
    boundingBox[1],
    boundingBox[2],
    boundingBox[3]
  );
  console.log('DEM:', boundingBox, width, height);

  // Read DEM elevation values
  const demRaster = await demImage.readRasters({ samples: [0] });
  const elevationData = demRaster[0] as TypedArray;
  console.log('Elevation Data:', elevationData);
  return { width, height, boundingBox, elevationData, rectangle };
};

export const readSatelliteData = async (
  satAsset: string,
  boundingBox: number[],
  width: number,
  height: number,
  elevationData: TypedArray
) => {
  // 2️⃣ Load Satellite TIFF (RGB Texture)
  const satImage = await loadTiff(satAsset);
  console.log('Satellite:', satImage);

  // Read RGB bands (4,3,2)
  const redBand = (await satImage.readRasters({
    samples: [3],
  })) as TypedArray[];
  const greenBand = (await satImage.readRasters({
    samples: [2],
  })) as TypedArray[];
  const blueBand = (await satImage.readRasters({
    samples: [1],
  })) as TypedArray[];

  // Create canvas to generate texture
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const imageData = ctx.createImageData(width, height);

  for (let i = 0; i < width * height; i++) {
    imageData.data[i * 4] = redBand[0][i];
    imageData.data[i * 4 + 1] = greenBand[0][i];
    imageData.data[i * 4 + 2] = blueBand[0][i];
    imageData.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  const textureUrl = canvas.toDataURL('image/png');

  // 3️⃣ Create Cesium 3D Terrain Surface (Primitive)
  const positions: Cartesian3[] = [];
  const indices: number[] = [];

  // Normalize elevation (adjust scale if needed)
  const scale = 1.0; // Adjust as needed

  // Generate 3D positions from heightmap
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const lon =
        boundingBox[0] + ((boundingBox[2] - boundingBox[0]) * x) / width;
      const lat =
        boundingBox[1] + ((boundingBox[3] - boundingBox[1]) * y) / height;
      const elevation = elevationData[y * width + x] * scale;

      positions.push(Cartesian3.fromDegrees(lon, lat, elevation));
    }
  }

  // Create triangle indices
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const i = y * width + x;
      indices.push(i, i + 1, i + width);
      indices.push(i + 1, i + width + 1, i + width);
    }
  }

  // 🟡 Create Geometry
  const geoValues = new Float64Array(positions.flatMap((p) => [p.x, p.y, p.z]));
  console.log('geoValues', geoValues);

  const geometry = new Geometry({
    attributes: {
      position: new GeometryAttribute({
        componentDatatype: ComponentDatatype.DOUBLE,
        componentsPerAttribute: 3,
        values: geoValues,
      }),
      normal: undefined, // No need for normal calculation here
      st: undefined, // Texture coordinates (optional, if you need UV mapping)
      bitangent: undefined, // Not needed for basic geometry
      tangent: undefined, // Not needed for basic geometry
      color: undefined, // Not needed for this case
    },
    indices: new Uint16Array(indices),
    primitiveType: PrimitiveType.TRIANGLES,
  });

  // Create Material from Texture
  const material = new Material({
    fabric: {
      type: 'Image',
      uniforms: {
        image: textureUrl,
      },
    },
  });
  console.log('Material:', material);
  return { geometry, material };
};
