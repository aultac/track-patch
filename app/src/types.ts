import type { Dayjs } from 'dayjs';
export type { Point, Track, VehicleDayTrack, VehicleDayTracks, DayTracks } from '@track-patch/lib';
import type { Position } from 'geojson';

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


export type GeoJSONVehicleMarkerProps = GeoJSONLineProps & { 
  point: Position,
}

export type GeoJSONVehicleMarkerFeature = GeoJSON.Feature<GeoJSON.Point, GeoJSONVehicleMarkerProps>;
export type GeoJSONVehicleMarkers = {
  type: 'FeatureCollection',
  features: GeoJSONVehicleMarkerFeature[],
};
