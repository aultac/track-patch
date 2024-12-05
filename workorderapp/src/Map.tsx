import React from 'react';
import { observer } from 'mobx-react-lite';
import ReactMapGl, { Source, Layer, MapLayerMouseEvent, MapRef } from 'react-map-gl';
import { context } from './state';
import { MapHoverInfo } from './MapHoverInfo';
import type { FeatureCollection, } from 'geojson';


const MAPBOX_TOKEN = 'pk.eyJ1IjoiYXVsdGFjIiwiYSI6ImNsMXA4MzU3NTAzbzUzZW55ajhiM2FsOGwifQ.8Umhtpm98ty92vbos4kM3Q';


export let mapRef: React.MutableRefObject<MapRef | null> | null = null;

export const Map = observer(function Map() {
    mapRef = React.useRef<MapRef | null>(null);
    const { state, actions } = React.useContext(context);

    //-------------------------------------------------------------
    // show tracks if loaded
    let tracks: FeatureCollection | null = actions.filteredGeoJSON();
    if (state.filteredGeoJSON.rev < 1 || !tracks) {
        tracks = null;
    }

    let roadSegPoints = React.useMemo(() => {
        if (state.chosenSegment && state.chosenSegment.trim() !== '') {
            try {
                return actions.segPointsMap(state.chosenSegment);
            } catch (error) {
                console.error('Error fetching segment points:', error);
                return null;
            }
        }
        return null;
    }, [state.chosenSegment]); // Reactively recompute when chosenSegment changes

    const dataToPlot = state.chosenSegment ? roadSegPoints : tracks;

    if (mapRef?.current && dataToPlot && dataToPlot.features?.length > 0) {
        const firstFeature = dataToPlot.features[0];
        if (firstFeature && firstFeature.geometry) {
            const { geometry } = firstFeature;

            if (geometry.type === 'Point') {
                const [lon, lat] = geometry.coordinates;
                mapRef.current.flyTo({ center: [lon, lat], zoom: 10, essential: true });
            } else if (geometry.type === 'LineString') {
                const [lon, lat] = geometry.coordinates[0];
                mapRef.current.flyTo({ center: [lon, lat], zoom: 10, essential: true });
            } else if (geometry.type === 'Polygon') {
                const [lon, lat] = geometry.coordinates[0][0];
                mapRef.current.flyTo({ center: [lon, lat], zoom: 10, essential: true });
            } else {
                console.warn('Unsupported geometry type:', geometry.type);
            }
        } else {
            console.warn('No valid geometry in firstFeature:', firstFeature);
        }
    } else {
        console.log('Zoom conditions not met');
        console.log('mapRef:', mapRef?.current);
        console.log('dataToPlot:', dataToPlot);
    }



    return (
        <ReactMapGl
            ref={mapRef}
            mapboxAccessToken={MAPBOX_TOKEN}
            initialViewState={state.viewport}
            style={{ width: '52vw', height: '90vh' }}
            mapStyle="mapbox://styles/mapbox/satellite-streets-v11"
        >
            <MapHoverInfo />

            {state.chosenSegment?.includes('IDEAL') ? (
                <Source key="scatter-source" type="geojson" data={dataToPlot as any}>
                    <Layer
                        id="scatter-points"
                        type="circle"
                        paint={{
                            'circle-radius': 5,
                            'circle-color': 'red',
                            'circle-opacity': 0.8,
                        }}
                    />
                </Source>
            ) : dataToPlot ? (
                <Source key="line-source" type="geojson" data={dataToPlot as any} lineMetrics={true}>
                    <Layer
                        id="tracks"
                        type="line"
                        paint={{
                            'line-color': 'red',
                            'line-width': [
                                'interpolate',
                                ['linear'],
                                ['line-progress'],
                                5,
                                5,
                            ],
                            'line-gradient': [
                                'interpolate',
                                ['linear'],
                                ['line-progress'],
                                0,
                                'red',
                                state.sliderValue,
                                'blue',
                                state.sliderValue + 0.01,
                                'rgba(0, 0, 0, 0)',
                            ],
                        }}
                    />
                </Source>
            ) : (
                <React.Fragment />
            )}
        </ReactMapGl>


    );
});