import shape2geohash from 'shape2geohash';
import { buffer, point } from '@turf/turf';
import { MAXROADWIDTH_FEET, GEOHASH_LENGTH } from '@track-patch/constants';

export async function gps2PotentialGeohashes({ lat, lon }: { lat: number, lon: number }): Promise<string[]> {
  const buf = buffer(point([lon, lat]));
  return shape2geohash(buf, { precision: GEOHASH_LENGTH, allowDuplicates: false });
}
