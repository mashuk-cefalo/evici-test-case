import { AfterViewInit, Component, OnDestroy } from '@angular/core';

import { demAsset, satelliteAsset } from '../../environment';
import { MapService } from '../services/MapService';
import { loadDEMData, loadSatelliteCanvas } from '../utility/tiff-utils';
import { SpinnerComponent } from './components/spinner/spinner.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [SpinnerComponent],
})
export class AppComponent implements AfterViewInit, OnDestroy {
  mapService!: MapService;
  startTime = Date.now();
  loading: boolean = true; // Spinner flag.

  async ngAfterViewInit(): Promise<void> {
    console.log('Component initialization started.');
    try {
      this.mapService = new MapService('mapContainer');
      // Load DEM and satellite image
      const demResult = await loadDEMData(demAsset);
      const demTime = Date.now();
      console.log(
        `DEM loaded: ${demResult.width} x ${demResult.height} in ${
          (demTime - this.startTime) / 1000
        } ms.`
      );

      const canvas = await loadSatelliteCanvas(satelliteAsset);
      const satelliteTime = Date.now();
      console.log(
        `Satellite image loaded in ${(satelliteTime - demTime) / 1000}s.`
      );
      // rendering the terrain mesh with the DEM and satellite canvas.
      await this.mapService.renderMesh(demResult, canvas);

      console.log(
        `Terrain mesh created in ${
          (Date.now() - satelliteTime) / 1000
        }s.\nTotal time  ${(Date.now() - this.startTime) / 1000}s.`
      );
      this.loading = false;
    } catch (error) {
      console.error('Error loading assets:', error);
      this.loading = false;
    }
  }

  ngOnDestroy(): void {
    console.log('Component destroyed - cleaning up.');
    this.mapService?.destroy();
  }
}
