import fetchLib from 'fetch-ponyfill';
import pmap from 'p-map';
import { assertRoadCollectionGeoJSON } from './types.js';
const { fetch } = fetchLib();
export async function fetchRoadsByGeohashes(geohashes) {
    const results = await pmap(geohashes, geohash => fetch(`https://aultac.github.io/track-patch/roads-by-geohash/${geohash}.json`).then(res => res.json()), { concurrency: 5 });
    // Make sure every feature has a geofulladdress, rcl_nguid, and source_datasetid
    const ret = [];
    for (const r of results) {
        const fc = r;
        for (const f of fc.features) {
            if (!f.properties)
                f.properties = {};
            if (!f.properties.geofulladdress) {
                f.properties.geofulladdress = 'UNKNOWN';
            }
            if (!f.properties.rcl_nguid) {
                f.properties.rcl_nguid = 'UNKNOWN';
            }
            if (!f.properties.source_datasetid) {
                f.properties.source_datasetid = 'UNKNOWN';
            }
        }
        assertRoadCollectionGeoJSON(fc);
        ret.push(fc);
    }
    return ret;
}
//# sourceMappingURL=fetch.js.map