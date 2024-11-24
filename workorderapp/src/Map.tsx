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
    //-------------------------------------------------------------------
    // Filter any roads/milemarkers if available:
    // Access the rev so we are updated when it changes.  Have to access it BEFORE !geojson or it might not re-render
    let roads: FeatureCollection | null = actions.roads() as FeatureCollection;
    let milemarkers: GeoJSON | null = actions.milemarkers();

    if (state.roads.rev < 1 || !roads) {
        roads = null;
    }
    if (state.milemarkers.rev < 1 || !milemarkers) {
        milemarkers = null;
    }
    // filter features to include only those that match the search:
    if (roads && state.search) {
        roads = {
            ...roads,
            features: roads.features.filter(f => JSON.stringify(f.properties).match(state.search)),
        };
    }

    //-------------------------------------------------------------
    // show tracks if loaded
    let tracks: FeatureCollection | null = actions.filteredGeoJSON();
    
    
    if (state.filteredGeoJSON.rev < 1 || !tracks) {
        tracks = null;
    }

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

    const interactiveLayerIds = [];
    if (roads) interactiveLayerIds.push('roads');
    if (milemarkers) interactiveLayerIds.push('milemarkers');

    return (
        <ReactMapGl
            mapboxAccessToken={MAPBOX_TOKEN}
            initialViewState={state.viewport}
            style={{ width: '52vw', height: '90vh' }}
            mapStyle="mapbox://styles/mapbox/streets-v12"
            onClick={onClick}
            onMouseMove={onHover}
            onMouseLeave={onLeave}
            interactiveLayerIds={interactiveLayerIds}
        >

            {!roads ? <React.Fragment /> :
                <Source type="geojson" data={roads as any}>
                    <Layer id="roads" type="line" paint={{
                        'line-color': '#FF0000',
                        'line-width': 2,
                    }} />
                </Source>
            }

            <MapHoverInfo />

            {!milemarkers ? <React.Fragment /> :
                <Source type="geojson" data={milemarkers as any}>
                    <Layer id="milemarkers" type="circle" paint={{
                        'circle-radius': 2,
                        'circle-color': '#FF00FF',
                        'circle-stroke-width': 1,
                    }} />
                </Source>
            }

            {
                !tracks ? <React.Fragment />
                    : (
                        <Source type="geojson" data={tracks as any} lineMetrics={true}>
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
                                        5
                                    ],
                                    'line-gradient': [
                                        'interpolate',
                                        ['linear'],
                                        ['line-progress'],
                                        0,
                                        'red', // Start at red
                                        state.sliderValue,
                                        'blue', // Continue with red until the slider value
                                        state.sliderValue + 0.01,
                                        'rgba(0, 0, 0, 0)', // Transition to transparent immediately after slider value
                                    ],
                                }}
                            />
                        </Source>
                    )
            }

        </ReactMapGl>
    );
});


