import { Marker } from './src/utility/types';

export const demAsset = 'assets/dem.tif'; // Path to the DEM file.
export const satelliteAsset = 'assets/lunar.tiff'; // Path to the satellite image file.
export const maxElevation = 16; // Maximum elevation value for the terrain.
export const maxSatelliteImage = 0.5; // Maximum width for the satellite image wrt window width.

export const sampleMarkers: Marker[] = [
  { x: 55.64, y: 55.353, z: 6.8, color: 'orange', text: 'Building' },
  { x: 55.61, y: 57.495, z: 5.9, color: 'green', text: 'Playground' },
  { x: 52.58, y: 69.272, z: 6.6, color: 'blue', text: 'Lake' },
  { x: 40.44, y: 50.535, z: 15.6, color: 'brown', text: 'Mountain' },
];
