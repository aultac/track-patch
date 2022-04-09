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
  activityLog: ActivityMessage[],
  speedbuckets: number[],
  date: string | null,
  days: BigData,
  geojson: BigData,
};

export const state = observable<State>({
  activityLog: [],
  speedbuckets: [ 10, 20, 30, 40 ],
  date: null,
  days: { rev: 0 },
  geojson: { rev: 0 },
});


