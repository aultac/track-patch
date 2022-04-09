import { createReadStream } from 'fs';
import { parse } from 'csv-parse';
import debug from 'debug';
import dayjs from 'dayjs';
import { access, writeFile } from 'fs/promises';
import fs from 'fs';
import type { DayTracks, Track } from './types';

const info = debug('indot/cli#load:info');
const warn = debug('indot/cli#load:warn');

const datafilepath = './dist/data.json';
export async function loadFromJSON(): Promise<DayTracks> {
  try {
    await access(datafilepath, fs.constants.R_OK);
  } catch(e: any) {
    warn(`${datafilepath} does not exist or is not readable.  You need to run this program with the "tojson" option first.`);
    throw new Error(`${datafilepath} does not exist.  Run tojson first.`);
  }
  return (JSON.parse(fs.readFileSync(datafilepath).toString()) as DayTracks);
}

const kphToMph = (kph: number) => kph * 0.6213712;
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
      speed: kphToMph(+(record['speedkph'])),
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
      // A track is just the points array indexed by time
      const trk: Track = {};
      for (const point of vdt.points) {
        const time = point.time.unix();
        trk[time] = point; // We are just using all the points as a single track for now
      }

      // store the track at the start time:
      const starttime = vdt.points[0]!.time.unix();
      vdt.tracks[starttime] = trk;
      delete vdt.points; // don't need points array anymore
    }
  }

  return days;
}

export async function writeToJSON(dt: DayTracks) {
  info('Writing in-memory data to json at dist/data.json');
  await writeFile(datafilepath, JSON.stringify(dt, null, '  '));
}


