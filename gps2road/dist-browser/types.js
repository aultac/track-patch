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
//# sourceMappingURL=types.js.map