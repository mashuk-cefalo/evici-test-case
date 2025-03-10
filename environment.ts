import { Marker } from './src/utility/types';

export const demAsset = 'assets/dem.tif'; // Path to the DEM file.
export const satelliteAsset = 'assets/lunar.tiff'; // Path to the satellite image file.
export const maxElevation = 16; // Maximum elevation value for the terrain.
export const maxSatelliteImage = 0.5; // Maximum width for the satellite image wrt window width.

export const sampleMarkers: Marker[] = [
  { x: 10.45, y: 10.0, z: 6.6, color: 'orange', text: 'Building' },
  { x: 10.35, y: 14.0, z: 6.6, color: 'green', text: 'Playground' },
  { x: 4.8, y: 36.0, z: 6.6, color: 'blue', text: 'Lake' },
  { x: -17.8, y: 1.0, z: 15.6, color: 'brown', text: 'Mountain' },
];
