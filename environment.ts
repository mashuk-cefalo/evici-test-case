declare global {
  interface Window {
    CESIUM_BASE_URL: string;
  }
}
export const environment = {
  production: false,
  CESIUM_BASE_URL: '/assets/Cesium/',
};

window.CESIUM_BASE_URL = '/assets/cesium/';

export const CesiumToken =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI4ZDI2ZmJiMC1iZWQ2LTQyOWEtOTdhZC05NzQyM2U2OTMwMzMiLCJpZCI6Mjc3MDgyLCJpYXQiOjE3Mzk4OTYwMDV9.paP2R0pWZh84W4TExx0J6TFq3-nhvaiOA_VBL029W2k';

export const demAsset = 'assets/dem.tif';
export const satAsset = 'assets/satellite.tiff';
export const blendedAsset = 'assets/test-evici.tiff';
