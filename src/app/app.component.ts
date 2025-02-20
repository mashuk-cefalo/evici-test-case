import { AfterViewInit, Component } from '@angular/core';
import * as Cesium from 'cesium';
import {
  blendedAsset,
  CesiumToken,
  demAsset,
  satAsset,
} from '../../environment';
import '../../environment.ts';
import { readDEMData, readSatelliteData } from '../utility/tiff-utils';

Cesium.Ion.defaultAccessToken = CesiumToken;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements AfterViewInit {
  viewer!: Cesium.Viewer;
  demArrayBuffer!: ArrayBuffer;
  satArrayBuffer!: ArrayBuffer;

  ngAfterViewInit(): void {
    // Show blended tiff together
    // this.showBlendedFile();

    // Calculate terrain model
    this.showSatelliteView();
  }

  private async showBlendedFile() {
    // show it in viewer
    const provider = await Cesium.CesiumTerrainProvider.fromUrl(blendedAsset);
    this.viewer = new Cesium.Viewer('cesiumContainer', {
      baseLayerPicker: false,
      terrainProvider: provider,
    });
    // enable pinch zoom
    this.viewer.scene.screenSpaceCameraController.enableZoom = true;
  }

  async showSatelliteView() {
    this.viewer = new Cesium.Viewer('cesiumContainer', {
      // imageryProvider: false,
      baseLayerPicker: false,
      terrainProvider: undefined,
    });
    // enable pinch zoom
    this.viewer.scene.screenSpaceCameraController.enableZoom = true;
    this.viewer.scene.globe.show = false;
    await this.loadTerrainModel(demAsset, satAsset);
  }

  async loadTerrainModel(demAsset: string, satAsset: string) {
    const { width, height, boundingBox, elevationData, rectangle } =
      await readDEMData(demAsset);
    // Get DEM bounding box and dimensions

    console.log('DEM Data:', boundingBox, width, height);
    console.log('elevationData', elevationData);
    const { geometry, material } = await readSatelliteData(
      satAsset,
      boundingBox,
      width,
      height,
      elevationData
    );

    // Create Primitive with Material
    this.viewer.scene.primitives.add(
      new Cesium.Primitive({
        geometryInstances: new Cesium.GeometryInstance({
          geometry: geometry,
        }),
        appearance: new Cesium.MaterialAppearance({
          material,
          translucent: false,
        }),
      })
    );
    console.log('Primitive added to scene');

    // 🟡 Zoom to Model
    this.viewer.camera.setView({ destination: rectangle });
  }
}
