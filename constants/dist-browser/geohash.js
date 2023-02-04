import shape2geohash from 'shape2geohash';
import { buffer, point } from '@turf/turf';
import './constants.js';
export function gps2PotentialGeohashes({ lat, lon }) {
    const buf = buffer(point([lon, lat]));
    return shape2geohash(buf);
}
//# sourceMappingURL=geohash.js.map