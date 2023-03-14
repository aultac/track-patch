import fetchLib from 'fetch-ponyfill';
import pmap from 'p-map';
import log from './log.js';
import { assertRoadCollectionGeoJSON, assertMilemarkerGeoJSON, assertMileMarkerFeature } from './types.js';
import { gps2PotentialGeohashes } from './geohash.js';
const { info } = log.get('fetch');
const { fetch } = fetchLib();
const cache = {};
let baseurl = "https://aultac.github.io/track-patch";
export function setBaseUrl(url) {
    baseurl = url.replace(/\/$/, '');
}
async function fetchToJSONWithRetries(url, retries) {
    if (!retries)
        retries = 5;
    while (retries-- > 0) {
        try {
            const res = await fetch(url);
            if (res.ok)
                return res.json();
        }
        catch (e) {
            info('Fetch failed, retrying...');
        }
    }
    info('Fetch failed on URL ' + url + ' after all retries');
    return null;
}
export async function fetchRoadTilesByGeohashes(geohashes) {
    const results = await pmap(geohashes, async (geohash) => {
        if (typeof cache[geohash] === 'undefined') {
            cache[geohash] = await fetchToJSONWithRetries(`${baseurl}/roads-by-geohash/${geohash}.json`);
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
    const geohashes = gps2PotentialGeohashes(point);
    return fetchRoadTilesByGeohashes(geohashes);
}
// Use fetchMileMarkersForRoad if you have a roadname already.
let _milemarkers = null;
export async function fetchIndexedMileMarkers() {
    if (_milemarkers)
        return _milemarkers;
    _milemarkers = new Promise(async (resolve) => {
        let geojson = await fetchToJSONWithRetries(`${baseurl}/milemarkers.geojson`);
        if (!geojson || !Array.isArray(geojson.features)) {
            throw new Error('ERROR: did not receive valid geojson when retrieving milemarkers.');
        }
        // Filter out all posts which do not have geometries (some have null instead for some reason)
        let allcount = geojson?.features?.length;
        geojson = {
            ...geojson,
            features: geojson.features.filter((f) => {
                try {
                    assertMileMarkerFeature(f);
                    return true;
                }
                catch (e) {
                    return false;
                }
            }),
        };
        if (allcount !== geojson.features.length) {
            info('There were', allcount - geojson.features.length, 'bad mile markers that we filtered out.');
        }
        try {
            assertMilemarkerGeoJSON(geojson);
        }
        catch (e) {
            info('FAILED to assert milemarkers retrieved from', `${baseurl}/milemarkers.geojson`);
        }
        let milemarkers = {};
        for (const f of geojson.features) {
            let [code, roadnum, postnum] = f.properties.POST_NAME.split('_');
            if (code === 'U')
                code = 'I'; // US means same as INTERSTATE
            if (code === 'T')
                code = 'I'; // TOLL means same as INTERSTATE
            const name = `${code}_${roadnum}`;
            if (!milemarkers[name])
                milemarkers[name] = [];
            milemarkers[name].push({
                lon: f.geometry.coordinates[0],
                lat: f.geometry.coordinates[1],
                name,
                number: +(postnum),
            });
        }
        for (const [name, markers] of Object.entries(milemarkers)) {
            markers.sort((a, b) => a.number - b.number);
        }
        info('Loaded', geojson.features.length, 'milemarkers into', Object.keys(milemarkers).length, 'roads');
        resolve(milemarkers);
    });
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