# Evici-test-case

This is a test project to create a 3d terrain with  two tiff files, one with 1-channel elevation data, called a DEM (Digital Elevation Model), and another which is a Sentinel-2 satellite image with 12 channels, including RGB channels (channels 4,3 and 2 respectively).

## Approaches

- Read single array `DEM` data as elevation from the `DEM` file
- Create a texture from the satellite image using channels 4,3 and 2 as RGB.
- Use `three js` library to draw the terrain with elavation and put the texture on it

## Installation

To run this project we need to install packages and run it

```shell
npm i
npm run start
```

## Libraries

- angular: 19.1
- typescript: 5.7.2
- three: 0.154.1
- geotiff: 1.0.0

## Important Classes

- The main entry point og this `app.component.ts`  class

- `tiff-utils` utility function is used to extract data from both the `tiff` files.

- The `map service` is used to initialize three js map. And then blend all data to show the maps.

## Screenshots

![Alt text](/screenshots/1.png?raw=true)


![Alt text](/screenshots/2.png?raw=true)


![Alt text](/screenshots/3.png?raw=true)


![Alt text](/screenshots/4.png?raw=true)


![Alt text](/screenshots/5.png?raw=true)
