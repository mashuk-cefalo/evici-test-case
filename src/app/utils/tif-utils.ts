import GeoTIFF, { fromArrayBuffer, ReadRasterResult } from 'geotiff';

export const convertTiffToBuffer = async (
  event: Event,
  returnFn: (arrayBuffer: ArrayBuffer) => void
) => {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = async () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      //   const demTiff = await fromArrayBuffer(arrayBuffer);
      //   const demImage = await demTiff.getImage();
      //   const rasters = await demImage.readRasters();
      returnFn(arrayBuffer);
    };

    reader.readAsArrayBuffer(file);
  }
};

export const processDEMFile = async (arrayBuffer: ArrayBuffer) => {
  const demTiff = await fromArrayBuffer(arrayBuffer);
  const demImage = await demTiff.getImage();
  const demRaster = await demImage.readRasters();
  const demData = convertTo2DArray(
    Array.from(demRaster[0]! as Uint16Array),
    demImage.getWidth(),
    demImage.getHeight()
  );
  return { demData, demImage };
};
export const processSatelliteUrl = async (arrayBuffer: ArrayBuffer) => {
  const satTiff = await fromArrayBuffer(arrayBuffer);
  const satImage = await satTiff.getImage();
  const satRaster = await satImage.readRasters();

  // Extract RGB Channels (Sentinel-2: 4=Red, 3=Green, 2=Blue)
  const r = satRaster[3] as number[] | Uint8Array | Float32Array;
  const g = satRaster[2] as number[] | Uint8Array | Float32Array;
  const b = satRaster[1] as number[] | Uint8Array | Float32Array;

  // Create an ImageData object for the canvas
  const width = satImage.getWidth();
  const height = satImage.getHeight();
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const imgData = ctx.createImageData(width, height);

  const rArray = Array.from(r);
  const gArray = Array.from(g);
  const bArray = Array.from(b);

  for (let i = 0; i < rArray.length; i++) {
    imgData.data[i * 4] = rArray[i]; // Red
    imgData.data[i * 4 + 1] = gArray[i]; // Green
    imgData.data[i * 4 + 2] = bArray[i]; // Blue
    imgData.data[i * 4 + 3] = 255; // Alpha
  }

  // Draw the image on the canvas
  ctx.putImageData(imgData, 0, 0);

  // Convert canvas to data URL
  return canvas.toDataURL();
};

const convertTo2DArray = (
  data: number[],
  width: number,
  height: number
): number[][] => {
  const array2D = [];
  for (let i = 0; i < height; i++) {
    const row = data.slice(i * width, (i + 1) * width);
    array2D.push(row);
  }
  return array2D;
};
