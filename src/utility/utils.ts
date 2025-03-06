import { Rectangle } from './types';

export const minMaxFromRaster = (raster: any): [number, number, number[]] => {
  if (raster?.length === 0) {
    return [0, 0, []];
  }
  const data: number[] = [];
  for (let i = 0; i < raster.length; i++) {
    data.push(raster[i]);
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  return [min, max, data];
};

export const getRectangleFromBox = (box: number[]): Rectangle => {
  if (box?.length !== 4) {
    throw new Error('Invalid bounding box');
  }
  const [left, bottom, right, top] = box;
  const globalWidth = right - left;
  const globalHeight = top - bottom;

  // We want the DEM to occupy 20% of the window's width and height.
  const desiredWidth = window.innerWidth * 0.2;
  const desiredHeight = window.innerHeight * 0.2;
  console.log('Desired DEM size (px):', desiredWidth, desiredHeight);

  // Calculate scale factors for X and Y.
  const scaleFactorX = desiredWidth / globalWidth;
  const scaleFactorY = desiredHeight / globalHeight;

  // Use the smaller scale factor to preserve aspect ratio.
  const scaleFactor = Math.min(scaleFactorX, scaleFactorY);
  console.log('Dynamic scale factor:', scaleFactor);

  // Compute the local (scaled) width and height.
  const width = globalWidth * scaleFactor;
  const height = globalHeight * scaleFactor;

  // Center the extent around (0,0).
  const minX = -width / 2;
  const maxX = width / 2;
  const minY = -height / 2;
  const maxY = height / 2;
  const rectangle = { minX, maxX, minY, maxY };
  console.log('Computed DEM extent (local coordinates):', rectangle);
  return rectangle;
};
