// Sadly, this this only works in Node.  It fails when vite loads it into the browser
// because vite says it can't use Stream.Readable.
// import shape2geohash from 'shape2geohash';
import geohash from 'latlon-geohash';
import type { Point } from './types.js';
import { buffer, bbox, point } from '@turf/turf';
import { MAXROADWIDTH_FEET, GEOHASH_LENGTH } from '@track-patch/constants';

export function gps2PotentialGeohashes({ lat, lon }: Point): string[] {
  const [minx, miny, maxx, maxy] = bbox(buffer(point([lon, lat]), MAXROADWIDTH_FEET));
  const geohashes: { [hash: string]: true } = {};
  const points = [
    { lat: miny, lon: minx },
    { lat: miny, lon: maxx },
    { lat: maxy, lon: minx },
    { lat: maxy, lon: maxx },
  ];
  for (const p of points) {
    geohashes[geohash.encode(p.lat, p.lon, GEOHASH_LENGTH)] = true;
  }
  return Object.keys(geohashes);
}
