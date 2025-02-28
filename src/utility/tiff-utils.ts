// import {
//   Cartesian3,
//   ComponentDatatype,
//   Geometry,
//   GeometryAttribute,
//   Material,
//   PrimitiveType,
//   Rectangle,
// } from 'cesium';

// @ts-ignore
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
  // rectangle: Rectangle;
  boundingBox: number[];
  demData2: Float32Array;
}> => {
  const demImage = await loadTiff(demAsset);
  console.log('DEM Image:', demImage);
  // Get DEM bounding box and dimensions
  const boundingBox = demImage.getBoundingBox(); // [west, south, east, north]
  const width = demImage.getWidth();
  const height = demImage.getHeight();
  // const rectangle = Rectangle.fromDegrees(
  //   boundingBox[0],
  //   boundingBox[1],
  //   boundingBox[2],
  //   boundingBox[3]
  // );
  console.log('width: ', width, 'height: ', height, 'rectangle:', boundingBox);
  console.log(
    'Difference in width and height:',
    boundingBox[2] - boundingBox[0],
    boundingBox[3] - boundingBox[1]
  );
  // Read DEM elevation values
  const demRaster = await demImage.readRasters({ samples: [0] });
  const elevationData = demRaster[0] as TypedArray;
  console.log('Elevation Data:', elevationData);

  const data = await demImage.readRasters({ interleave: true });
  const demData2 = new Float32Array(data as ArrayBuffer);
  console.log('DEM Data2:', demData2, data);
  return { width, height, boundingBox, elevationData, demData2 };
};

export const addImageToDom = (canvas: HTMLCanvasElement) => {
  const url = canvas.toDataURL('image/png');
  const img = document.createElement('img');
  img.src = url;
  img.style.maxWidth = '80vw';
  img.style.maxHeight = '80vh';
  img.style.marginTop = '40px';
  document.body.appendChild(img);
};

export const readSatelliteData = async (satAsset: string) => {
  // 2️⃣ Load Satellite TIFF (RGB Texture)
  const satImage = await loadTiff(satAsset);
  console.log('Satellite Image:', satImage);

  const width = satImage.getWidth();
  const height = satImage.getHeight();
  console.log('satellite width: ', width, 'height: ', height);

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

  console.log('Red Band:', redBand[0].length, redBand[0].slice(0, 10));
  console.log('Green Band:', greenBand[0].length, greenBand[0].slice(0, 10));
  console.log('Blue Band:', blueBand[0].length, blueBand[0].slice(0, 10));

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
  addImageToDom(canvas);
};
