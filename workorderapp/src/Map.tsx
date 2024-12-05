import React from 'react';
import { observer } from 'mobx-react-lite';
import log from './log';
import ReactMapGl, { Source, Layer, MapLayerMouseEvent, Marker, MapRef } from 'react-map-gl';
import { context } from './state';
import { MapHoverInfo } from './MapHoverInfo';
import type { GeoJSON, FeatureCollection, LineString, Position } from 'geojson';
import { DayTracks } from '@track-patch/lib';


const MAPBOX_TOKEN = 'pk.eyJ1IjoiYXVsdGFjIiwiYSI6ImNsMXA4MzU3NTAzbzUzZW55ajhiM2FsOGwifQ.8Umhtpm98ty92vbos4kM3Q';


export let mapRef: React.MutableRefObject<MapRef | undefined> | null = null;

export const Map = observer(function Map() {
    mapRef = React.useRef<MapRef>()!;
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
                return actions.segPointMap(state.chosenSegment);
            } catch (error) {
                console.error('Error fetching segment points:', error);
                return null;
            }
        }
        return null;
    }, [state.chosenSegment]); // Reactively recompute when chosenSegment changes

    console.log(JSON.stringify(roadSegPoints, null, 2))
    //------------------------------------------------------------
    // Mouse Events:
    const onHover = React.useCallback((evt: MapLayerMouseEvent) => {
        const active = evt.features && evt.features.length > 0 || false;
        actions.hover({
            x: evt.point.x,
            y: evt.point.y,
            lat: evt.lngLat.lat,
            lon: evt.lngLat.lng,
            features: (((evt.features as unknown) || []) as any[]),
            active,
        });
    }, []);

    const onLeave = () => {
        actions.hover({ x: 0, y: 0, lat: 0, lon: 0, features: [], active: false });
    }

    const onClick = async (evt: MapLayerMouseEvent) => {
        await navigator.clipboard.writeText(`{ lon: ${evt.lngLat.lng}, lat: ${evt.lngLat.lat} }`);
    }

    const dataToPlot = state.chosenSegment ? roadSegPoints : tracks;

    return (
        <ReactMapGl
            key={state.chosenSegment?.includes('IDEAL') ? 'scatter-mode' : 'line-mode'}
            mapboxAccessToken={MAPBOX_TOKEN}
            initialViewState={state.viewport}
            style={{ width: '52vw', height: '90vh' }}
            mapStyle="mapbox://styles/mapbox/satellite-streets-v11"
            onClick={onClick}
            onMouseMove={onHover}
            onMouseLeave={onLeave}
        >
            <MapHoverInfo />

            {
                state.chosenSegment?.includes('IDEAL')
                    ? (
                        <Source type="geojson" data={dataToPlot as any}>
                            <Layer
                                id="scatter-points"
                                type="circle"
                                paint={{
                                    'circle-radius': 6,
                                    'circle-color': 'red',
                                    'circle-opacity': 0.8,
                                }}
                            />
                        </Source>
                    )
                    : (
                        dataToPlot
                            ? (
                                <Source type="geojson" data={dataToPlot as any} lineMetrics={true}>
                                    <Layer
                                        id="tracks"
                                        type="line"
                                        paint={{
                                            'line-color': 'red',
                                            'line-width': [
                                                'interpolate',
                                                ['linear'],
                                                ['line-progress'],
                                                0,
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
                            )
                            : <React.Fragment />
                    )
            }
        </ReactMapGl>

    );
});