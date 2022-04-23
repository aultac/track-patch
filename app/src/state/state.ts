import { observable, autorun } from 'mobx';
import debug from 'debug';
import type { DayTracks } from '@indot-activity/lib';
import type GeoJSON from 'geojson';

const warn = debug('@indot-activity/app#state:warn');
const info = debug('@indot-activity/app#state:info');

export type ActivityMessage = {
  msg: string,
  type: 'good' | 'bad',
};

export type BigData = { rev: number };

export type State = {
  page: 'get-domain' | 'get-token' | 'login' | 'map',
  oada: {
    domain: string | null,
    token: string | null,
  },
  activityLog: ActivityMessage[],
  speedbuckets: number[],
  date: string | null,
  daytracks: BigData,
  geojson: BigData,
  vehicleColors: { [vehicleid: string]: string },
};

export const state = observable<State>({
  page: 'map',
  oada: {
    // Default domain to environment, or load from localstorage if we have it, or it's just empty
    domain: '',
    token: '',
  },
  activityLog: [],
  speedbuckets: [ 10, 20, 30, 40 ],
  date: null,
  daytracks: { rev: 0 },
  geojson: { rev: 0 },
  vehicleColors: {},
});

