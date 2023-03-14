import { observable } from 'mobx';
import log from '../log';

import type { DayTracks, VehicleDayTracks, VehicleDayTrack, Track, Point } from '@track-patch/lib';

import geojsonvizfiles from './geojsonvizfiles.json';

const { info, warn } = log.get('state');

export type ActivityMessage = {
  msg: string,
  type: 'good' | 'bad',
};


export type BigData = { rev: number };

export type State = {
  page: 'map',
  activityLog: ActivityMessage[],
  search: string,

  show: {
    roads: Boolean,
    milemarkers: Boolean,
    tracks: Boolean,
  },

  parsing: {
    inprogress: boolean,
    estimatedRows: number,
    currentNumRows: number,
    state: string, // tracks, roads, geojson
  },

  validating: {
    inprogress: boolean,
    workordersProcessed: number,
  },

  knownWorkorders: {
    parsing: boolean, // whether it is currently being parsed
    orders: BigData,
    validated: boolean,
  },

  daytracks: BigData,
  daytracksGeoJSON: BigData,
  roads: BigData,
  milemarkers: BigData,

  geojsonviz: {
    selectedFile: string,
    files: string[],
  },

  hover: {
    x: number,
    y: number,
    lat: number, 
    lon: number,
    features: any[],
    active: boolean,
  },

};

export const state = observable<State>({
  page: 'map',
  show: {
    roads: false,
    milemarkers: false,
    tracks: false,
  },
  activityLog: [],
  search: '',
  parsing: {
    inprogress: false,
    estimatedRows: 0,
    currentNumRows: 0,
    state: '',
  },
  knownWorkorders: {
    parsing: false,
    orders: { rev: 0 },
    validated: false,
  },
  validating: {
    inprogress: false,
    workordersProcessed: 0,
  },
  roads: { rev: 0 },
  milemarkers: { rev: 0 },
  daytracks: { rev: 0 },
  daytracksGeoJSON: { rev: 0 },
  hover: {
    x: 0,
    y: 0,
    lat: 0,
    lon: 0,
    features: [],
    active: false,
  },
  geojsonviz: {
    selectedFile: "dp4cc.json",
    files: geojsonvizfiles,
  },
});

