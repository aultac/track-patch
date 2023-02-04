import shape2geohash from 'shape2geohash';
import { buffer, point } from '@turf/turf';
import { GEOHASH_LENGTH } from '@track-patch/constants';
export async function gps2PotentialGeohashes({ lat, lon }) {
    const buf = buffer(point([lon, lat]));
    return shape2geohash(buf, { precision: GEOHASH_LENGTH, allowDuplicates: false });
}
//# sourceMappingURL=geohash.js.map