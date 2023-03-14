export function assertPoint(o) {
    if (!o || typeof o !== 'object')
        throw new Error('Point must be an object');
    if (typeof o.lat !== 'number')
        throw new Error('Point.lat must be a number');
    if (typeof o.lon !== 'number')
        throw new Error('Point.lon must be a number');
}
;
export function assertMileMarker(o) {
    if (!o || typeof o !== 'object')
        throw new Error('MileMarker must be an object');
    if (typeof o.name !== 'string')
        throw new Error('MileMarker name must be a string');
    if (typeof o.number !== 'number')
        throw new Error('MileMarker number must be a number');
    assertPoint(o);
}
export function assertRoad(o) {
    if (!o || typeof o !== 'object')
        throw new Error('Road must be an object');
    assertRoadTypeInfo(o);
    if ('milemarkers' in o) {
        if (!o.milemarkers || typeof o.milemarkers !== 'object')
            throw new Error('MileMarkers on a road must be an object');
        if (!('min' in o.milemarkers))
            throw new Error('MileMarker in road must have a min');
        assertMileMarker(o.milemarkers.min);
        if (!('max' in o.milemarkers))
            throw new Error('MileMarker in road must have a max');
        assertMileMarker(o.milemarkers.max);
    }
    ;
    // skipping geojson for now
}
export function assertRoadTypeInfo(o) {
}
export function assertRoadGeoJSON(obj) {
    if (!obj || typeof obj !== 'object')
        throw `assertRoadGeoJSON: value is not an object or is null`;
    if (obj.type !== 'Feature')
        throw `assertRoadGeoJSON: value has no type key with value 'Features'`;
    if (!obj.properties)
        throw `assertRoadGeoJSON: has no properties`;
    if (!obj.properties.geofulladdress)
        throw `assertRoadGeoJSON: properties has no geofulladdress`;
    if (!obj.properties.rcl_nguid)
        throw `assertRoadGeoJSON: properties has no rcl_nguid`;
    if (!obj.properties.source_datasetid)
        throw `assertRoadGeoJSON: properties has no source_datasetid`;
}
export function assertRoadCollectionGeoJSON(obj) {
    if (!obj || typeof obj !== 'object')
        throw `assertRoadCollectionGeoJSON: value is not an object or is null`;
    if (obj.type !== 'FeatureCollection')
        throw `assertRoadCollectionGeoJSON: value has no type = 'FeatureCollection'`;
    if (!obj.features || !Array.isArray(obj.features))
        throw `assertRoadCollectionGeoJSON: features does not exist or is not an array`;
    for (const [index, f] of obj.features.entries()) {
        try {
            assertRoadGeoJSON(f);
        }
        catch (e) {
            throw `assertRoadCollectionGeoJSON: feature at index ${index} failed assertRoadGeoJSON with error: ${e.toString()}`;
        }
    }
}
export function assertMileMarkerProperties(obj) {
    if (!obj)
        throw new Error(`cannot be falsey`);
    if (typeof obj !== 'object')
        throw new Error(`must be an object`);
    if (typeof obj.POST_NAME !== 'string')
        throw new Error(`POST_NAME property must be a string`);
}
export function assertMileMarkerFeature(obj) {
    if (!obj)
        throw new Error(`cannot be falsey`);
    if (typeof obj !== 'object')
        throw new Error(`must be an object`);
    if (obj.type !== 'Feature')
        throw new Error(`must be a GeoJSON feature`);
    if (!obj.geometry)
        throw new Error(`must have a geometry`);
    if (obj.geometry.type !== 'Point')
        throw new Error('Must be a point feature');
    assertMileMarkerProperties(obj.properties);
}
export function assertMilemarkerGeoJSON(obj) {
    if (!obj)
        throw new Error(`cannot be falsey`);
    if (typeof obj !== 'object')
        throw new Error(`must be an object`);
    if (obj.type !== 'FeatureCollection')
        throw new Error('must be a feature collection');
    if (!Array.isArray(obj.features))
        throw new Error(`features must be an array`);
    for (const f of obj.features) {
        assertMileMarkerFeature(f);
    }
}
//# sourceMappingURL=types.js.map