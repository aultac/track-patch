import fetchLib from 'fetch-ponyfill';
import pmap from 'p-map';

import log from './log.js';

import type { FeatureCollection } from 'geojson';
import { Point, RoadCollectionGeoJSON, assertRoadCollectionGeoJSON, IndexedMileMarkers, assertMilemarkerGeoJSON, Road, MileMarker } from './types.js';
import { gps2PotentialGeohashes }  from './geohash.js';

const { info } = log.get('fetch');

const { fetch } = fetchLib();

const cache: { [geohash: string]: RoadCollectionGeoJSON } = {};

export async function fetchRoadTilesByGeohashes(geohashes: string[]): Promise<RoadCollectionGeoJSON[]> {
  const results = await pmap(
    geohashes, 
    async (geohash) => {
      if (!cache[geohash]) {
        cache[geohash] = await fetch(`https://aultac.github.io/track-patch/roads-by-geohash/${geohash}.json`)
        // @ts-ignore
          .then(res => res.json());
      }
      return cache[geohash];
    }, { concurrency: 5 }
  );

  // Make sure every feature has a geofulladdress, rcl_nguid, and source_datasetid
  const ret: RoadCollectionGeoJSON[] = [];
  for (const r of results) {
    const fc = (r as FeatureCollection);
    for (const f of fc.features) {
      if (!f.properties) f.properties = {};
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

export async function fetchRoadTilesForPoint(point: Point): Promise<RoadCollectionGeoJSON[]> {
  const geohashes = await gps2PotentialGeohashes(point);
  return fetchRoadTilesByGeohashes(geohashes);
}

// Use fetchMileMarkersForRoad if you have a roadname already.
let _milemarkers: IndexedMileMarkers | null = null;
export async function fetchIndexedMileMarkers(): Promise<IndexedMileMarkers> {
  if (_milemarkers) return _milemarkers;
  const geojson = await fetch(`https://aultac.github.io/track-patch/milemarkers.geojson`).then(res => res.json());
  assertMilemarkerGeoJSON(geojson);
  _milemarkers = {};
  for (const f of geojson.features) {
    let [code, roadnum, postnum] = f.properties.POST_NAME.split('_');
    if (code === 'U') code = 'I'; // US means same as INTERSTATE
    if (code === 'T') code = 'I'; // TOLL means same as INTERSTATE
    const name = `${code}_${roadnum}`;
    if (!_milemarkers[name]) _milemarkers[name] = [];
    _milemarkers[name]!.push({
      lon: f.geometry.coordinates[0]!,
      lat: f.geometry.coordinates[1]!,
      name,
      number: +(postnum!),
    });
  }
  for (const [name, markers] of Object.entries(_milemarkers)) {
    markers.sort((a,b) => a.number - b.number);
  }
  info('Loaded',geojson.features.length,'milemarkers into',Object.keys(_milemarkers).length,'roads');
  return _milemarkers;
}

export async function fetchMileMarkersForRoad({ road }: { road: Road }): Promise<MileMarker[]> {
  const mm = await fetchIndexedMileMarkers();
  if (road.type !== 'STATE' && road.type !== 'INTERSTATE') return []; // no mile markers for local roads
  let name = `${road.type === 'STATE' ? 'S' : 'I'}_${road.number}`;
  return mm[name] || [];
}
