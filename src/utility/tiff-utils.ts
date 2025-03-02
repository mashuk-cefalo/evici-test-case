import { CanvasTexture, Texture } from 'three';
// @ts-ignore
import { fromArrayBuffer, GeoTIFFImage } from 'geotiff';
import { DEMResponse } from './types';
import { getRectangleFromBox, minMaxFromRaster } from './utils';
import { maxElevation, maxSatelliteImage } from '../../environment';

const loadTiff = async (url: string): Promise<GeoTIFFImage> => {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const tiff = await fromArrayBuffer(arrayBuffer);
    const image = await tiff.getImage();
    return image;
  } catch (error) {
    console.error('Error loading TIFF:', error);
    throw error;
  }
};

//  helper to display the processed satellite image.
export const addImageToDom = (canvas: HTMLCanvasElement) => {
  const url = canvas.toDataURL('image/png');
  const img = document.createElement('img');
  img.src = url;
  img.style.maxWidth = '80vw';
  img.style.maxHeight = '80vh';
  img.style.marginTop = '40px';
  document.body.appendChild(img);
};

/**
 * Load DEM data from a TIFF file using GeoTIFF.
 * Also reads the bounding box from metadata.
 */
export const loadDEMData = async (url: string): Promise<DEMResponse> => {
  console.log(`Loading DEM from ${url}...`);
  try {
    const image = await loadTiff(url);
    const width = image.getWidth();
    const height = image.getHeight();
    const rasterData = await image.readRasters({ interleave: true });
    const [min, max, elevations] = minMaxFromRaster(rasterData);
    const factor = (max - min) / maxElevation;
    console.log(`DEM loaded with dimensions: ${width} x ${height}`);
    return {
      elevations: elevations.map((elevation) => (elevation - min) / factor), // normalize elevation between 0 and maxElevation
      width,
      height,
      rectangle: getRectangleFromBox(image.getBoundingBox()),
    };
  } catch (error) {
    console.error('Error loading DEM:', error);
    throw error;
  }
};

export const loadSatelliteCanvas = async (
  url: string
): Promise<HTMLCanvasElement> => {
  const maxCanvasWidth = window.innerWidth * maxSatelliteImage;
  console.log(`Loading satellite image from ${url}...`);
  try {
    const image = await loadTiff(url);
    const width = image.getWidth();
    const height = image.getHeight();
    const rasterData = await image.readRasters();

    // For Sentinel-2: channels 4, 3, and 2 (indices 3, 2, 1) are used as R, G, B.
    const [redMin, redMax, red] = minMaxFromRaster(rasterData[3]);
    const [greenMin, greenMax, green] = minMaxFromRaster(rasterData[2]);
    const [blueMin, blueMax, blue] = minMaxFromRaster(rasterData[1]);

    const redFactor = (redMax - redMin) / 255;
    const greenFactor = (greenMax - greenMin) / 255;
    const blueFactor = (blueMax - blueMin) / 255;

    // Create a canvas with the original image size.
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(width, height);

    for (let i = 0; i < width * height; i++) {
      imageData.data[i * 4] = (red[i] - redMin) / redFactor;
      imageData.data[i * 4 + 1] = (green[i] - greenMin) / greenFactor;
      imageData.data[i * 4 + 2] = (blue[i] - blueMin) / blueFactor;
      imageData.data[i * 4 + 3] = 255;
    }

    console.log('Red min/max:', redMin, redMax);
    console.log('Green min/max:', greenMin, greenMax);
    console.log('Blue min/max:', blueMin, blueMax);
    ctx.putImageData(imageData, 0, 0);
    console.log('Satellite image processed into canvas.');

    // Resize the canvas to 70% of the window's innerWidth while preserving aspect ratio.
    const scale = maxCanvasWidth / canvas.width;
    const desiredHeight = canvas.height * scale;
    const resizedCanvas = document.createElement('canvas');
    resizedCanvas.width = maxCanvasWidth;
    resizedCanvas.height = desiredHeight;
    const resizedCtx = resizedCanvas.getContext('2d')!;
    resizedCtx.drawImage(canvas, 0, 0, maxCanvasWidth, desiredHeight);
    console.log(
      `Resized satellite image to ${maxCanvasWidth} x ${desiredHeight}`
    );

    // Optionally, attach the resized canvas to the DOM for debugging.
    // addImageToDom(resizedCanvas);

    return resizedCanvas;
  } catch (error) {
    console.error('Error loading satellite image:', error);
    throw error;
  }
};
