import type { Dayjs } from 'dayjs';
export type { Point, Track, VehicleDayTrack, VehicleDayTracks, DayTracks } from '@track-patch/lib';

export type GeoJSONLineProps = {
  vehicleid: string,
  maxspeed: number,
  minspeed: number,
  speedbucket: number,
  mph: number,
  time: Dayjs,
  color: string,
};

export type GeoJSONVehicleFeature = GeoJSON.Feature<GeoJSON.LineString, GeoJSONLineProps>;
export type GeoJSONAllVehicles = {
  type: 'FeatureCollection',
  features: GeoJSONVehicleFeature[],
};

