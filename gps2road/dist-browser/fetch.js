import fetchLib from 'fetch-ponyfill';
import pmap from 'p-map';
import log from './log.js';
import { assertRoadCollectionGeoJSON, assertMilemarkerGeoJSON } from './types.js';
import { gps2PotentialGeohashes } from './geohash.js';
const { info } = log.get('fetch');
const { fetch } = fetchLib();
const cache = {};
let baseurl = "https://aultac.github.io/track-patch";
export function setBaseUrl(url) {
    baseurl = url.replace(/\/$/, '');
}
export async function fetchRoadTilesByGeohashes(geohashes) {
    const results = await pmap(geohashes, async (geohash) => {
        if (typeof cache[geohash] === 'undefined') {
            cache[geohash] = await fetch(`${baseurl}/roads-by-geohash/${geohash}.json`)
                // @ts-ignore
                .then(res => {
                if (res.ok) {
                    return res.json();
                }
                return null;
            });
        }
        return cache[geohash]; // could be null if this 404'ed the first time
    }, { concurrency: 5 });
    // Make sure every feature has a geofulladdress, rcl_nguid, and source_datasetid
    const ret = [];
    for (const r of results) {
        if (!r)
            continue;
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
export async function fetchRoadTilesForPoint(point) {
    const geohashes = await gps2PotentialGeohashes(point);
    return fetchRoadTilesByGeohashes(geohashes);
}
// Use fetchMileMarkersForRoad if you have a roadname already.
let _milemarkers = null;
export async function fetchIndexedMileMarkers() {
    if (_milemarkers)
        return _milemarkers;
    const geojson = await fetch(`${baseurl}/milemarkers.geojson`).then(res => {
        if (res.ok) {
            return res.json();
        }
        info('FAILED to retrieve mile markers:', res);
        return null;
    });
    assertMilemarkerGeoJSON(geojson);
    _milemarkers = {};
    for (const f of geojson.features) {
        let [code, roadnum, postnum] = f.properties.POST_NAME.split('_');
        if (code === 'U')
            code = 'I'; // US means same as INTERSTATE
        if (code === 'T')
            code = 'I'; // TOLL means same as INTERSTATE
        const name = `${code}_${roadnum}`;
        if (!_milemarkers[name])
            _milemarkers[name] = [];
        _milemarkers[name].push({
            lon: f.geometry.coordinates[0],
            lat: f.geometry.coordinates[1],
            name,
            number: +(postnum),
        });
    }
    for (const [name, markers] of Object.entries(_milemarkers)) {
        markers.sort((a, b) => a.number - b.number);
    }
    info('Loaded', geojson.features.length, 'milemarkers into', Object.keys(_milemarkers).length, 'roads');
    return _milemarkers;
}
export async function fetchMileMarkersForRoad({ road }) {
    const mm = await fetchIndexedMileMarkers();
    if (road.type !== 'STATE' && road.type !== 'INTERSTATE')
        return []; // no mile markers for local roads
    let name = `${road.type === 'STATE' ? 'S' : 'I'}_${road.number}`;
    return mm[name] || [];
}
//# sourceMappingURL=fetch.js.map