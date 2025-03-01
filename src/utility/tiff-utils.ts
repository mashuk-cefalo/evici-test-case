import { CanvasTexture, Texture } from 'three';
// @ts-ignore
import { fromArrayBuffer, GeoTIFFImage } from 'geotiff';
import { DEMResponse } from './types';
import { getRectangleFromBox, minMaxFromRaster } from './utils';

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
    const elevations = new Float32Array(rasterData);

    console.log(`DEM loaded with dimensions: ${width} x ${height}`);
    return {
      elevations,
      width,
      height,
      rectangle: getRectangleFromBox(image.getBoundingBox()),
    };
  } catch (error) {
    console.error('Error loading DEM:', error);
    throw error;
  }
};

export const loadSatelliteImage = async (url: string): Promise<Texture> => {
  const maxCanvasWidth = window.innerWidth * 0.7;
  console.log(`Loading satellite image from ${url}...`);
  try {
    const image = await loadTiff(url);
    const width = image.getWidth();
    const height = image.getHeight();
    const rasterData = await image.readRasters();
    // For Sentinel-2: channels 4, 3, and 2 (indices 3, 2, 1) are used as R, G, B.
    const channelR = rasterData[3];
    const channelG = rasterData[2];
    const channelB = rasterData[1];

    // Create a canvas with the original image size.
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(width, height);
    const [redMin, redMax] = minMaxFromRaster(channelR);
    const [greenMin, greenMax] = minMaxFromRaster(channelG);
    const [blueMin, blueMax] = minMaxFromRaster(channelB);

    console.log('Red min/max:', redMin, redMax);
    console.log('Green min/max:', greenMin, greenMax);
    console.log('Blue min/max:', blueMin, blueMax);

    const redAspect = (redMax - redMin) / 255;
    const greenAspect = (greenMax - greenMin) / 255;
    const blueAspect = (blueMax - blueMin) / 255;

    for (let i = 0; i < width * height; i++) {
      const r = (channelR[i] - redMin) / redAspect;
      const g = (channelG[i] - greenMin) / greenAspect;
      const b = (channelB[i] - blueMin) / blueAspect;

      imageData.data[i * 4] = r;
      imageData.data[i * 4 + 1] = g;
      imageData.data[i * 4 + 2] = b;
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
    addImageToDom(resizedCanvas);

    const texture = new CanvasTexture(resizedCanvas);
    texture.needsUpdate = true;
    return texture;
  } catch (error) {
    console.error('Error loading satellite image:', error);
    throw error;
  }
};
