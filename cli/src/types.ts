import type { Dayjs } from 'dayjs';

export type Point = {
  time: Dayjs,
  lat: number,
  lon: number,
  speed: number,
  [key: string]: any
};

// A "Track" is a contiguous path traveled by the vehicle
export type Track = {
  [time: string]: Point,
};

// A "VehicleDayTrack" represents possibly multiple single Tracks traveled by the same vehicle in one day.
export type VehicleDayTrack = {
  id: string,
  day: string, // YYYY-MM-DD
  tracks: {
    [starttime: string]: Track,
  },
  points?: Point[],
};

// This holds all the days/tracks for all the vehicles on a given day
export type VehicleDayTracks = {
  [vehicleid: string]: VehicleDayTrack,
};

// Top-level index of all the days that have tracks
export type DayTracks = {
  [day: string]: VehicleDayTracks,
};


