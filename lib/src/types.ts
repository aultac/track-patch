import type { Dayjs } from 'dayjs';
import type {Road} from '@track-patch/gps2road';
export * from '@track-patch/gps2road';

export type Point = {
  time: Dayjs,
  lat: number,
  lon: number,
  speed: number, // this has been converted to mph
  heading: number,
  road?: Road,
  [key: string]: any
};

export type Track = Point[];

// A "VehicleDayTrack" represents possibly multiple single Tracks traveled by the same vehicle in one day.
export type VehicleDayTrack = {
  id: string,
  day: string, // YYYY-MM-DD
  track: Point[],
};

// This holds all the days/tracks for all the vehicles on a given day
export type VehicleDayTracks = {
  [vehicleid: string]: VehicleDayTrack,
};

// Top-level index of all the days that have tracks
export type DayTracks = {
  [day: string]: VehicleDayTracks,
};


