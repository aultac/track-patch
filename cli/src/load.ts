import { createReadStream } from 'fs';
import { parse } from 'csv-parse';
import debug from 'debug';
import dayjs from 'dayjs';
import fs from 'fs';
import type { DayTracks } from './types';

const info = debug('indot/cli#load:info');
const warn = debug('indot/cli#load:warn');

export async function loadFromJSON(): Promise<DayTracks> {
  return (JSON.parse(fs.readFileSync('./data.json').toString()) as DayTracks);
}

export async function csvToDayTracksJSON(filepath: string): Promise<DayTracks> {
  const days: DayTracks = {};
  // Initialize the parser
  const parser = parse();
  const stream = createReadStream(filepath);
  stream.pipe(parser);
  
  let count = 0;
  let header = [];
  for await (const csvrecord of parser) {
    if (count === 0) { // this is the first row, grab the headers
      header = csvrecord;
      for (const [index, val] of csvrecord.entries()) {
        header[index] = val.toString().trim(); // I don't know why, but vehicleId comes in with a space on the front
      }
      count++;
      continue;
    }
    // Otherwise, make an object with the keys from the headers:
    const record: any = {};
    for (const [index, key] of header.entries()) {
      record[key] = csvrecord[index];
    }
    const date = dayjs(record.timestamp, 'YYYY-MM-DD HH:mm:ss.SS');
    const di = date.format('YYYY-MM-DD');
    if (!days[di]) days[di] = {};
    const day = days[di]!;
    const vid = record['vehicleId'];

    if (!day[vid]) day[vid] = {
      id: vid,
      day: di,
      tracks: {},
      points: [],
    };
    day[vid]!.points!.push({
      lat: +(record['geo.Lat']),
      lon: +(record['geo.Long']),
      time: date,
      speed: +(record['speedkph']),
    });
    if (!(count++ % 1000)) info('Finished reading record ', count);
  }
  info('Have ', count, ' records loaded');

  // Now walk through all things and sort their points
  for (const vdtracks of Object.values(days)) {
    for (const vdt of Object.values(vdtracks)) {
      if (!vdt.points || vdt.points.length < 1) {
        warn('The VehicleDayTrack had no points or was empty: ', vdt);
        continue;
      }
      for (const point of vdt.points) {
        const starttime = vdt.points[0]!.time.unix();
        vdt.tracks[starttime] = point; // We are just using all the points as a single track for now
      }
    }
  }

  return days;
}

export function writeToJSON(dt: DayTracks) {
  info('Writing in-memory data to json');
  fs.writeFileSync('./data.json', JSON.stringify(dt, null, '  '));
}


