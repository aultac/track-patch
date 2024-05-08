import React from 'react';
import { observer } from 'mobx-react-lite';
import log from './log';
import ReactMapGl, { Source, Layer, MapLayerMouseEvent, ViewState, Marker } from 'react-map-gl';
import { context } from './state';
import { MapHoverInfo } from './MapHoverInfo';
import type { GeoJSON, FeatureCollection, LineString } from 'geojson';


const { info, warn } = log.get('map');

const MAPBOX_TOKEN = 'pk.eyJ1IjoiYXVsdGFjIiwiYSI6ImNsMXA4MzU3NTAzbzUzZW55ajhiM2FsOGwifQ.8Umhtpm98ty92vbos4kM3Q';

const bad = { color: 'red' };
const good = { color: 'green' };

export const Map = observer(function Map() {
  const { state, actions } = React.useContext(context);
  const [viewport, setViewport] = React.useState<ViewState>({
    longitude: -86.8,
    latitude: 39.8,
    zoom: 6.3,
    bearing: 0,
    pitch: 0,
    padding: { top: 0, bottom: 0, right: 0, left: 0 }
  });

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

  const [lastTrackCoordinate, setLastTrackCoordinate] = React.useState([-86.8, 39.8]);
  const [firstTrackCoordinate, setFirstTrackCoordinate] = React.useState([-86.8, 39.8]);

  React.useEffect(() => {
    if (tracks && tracks.features.length > 0) {
      const firstTrack = tracks.features[0];
      const firstCoordinate = (firstTrack.geometry as LineString).coordinates[0];
      setFirstTrackCoordinate([firstCoordinate[0], firstCoordinate[1]]);
      setViewport({
        ...viewport,
        longitude: firstCoordinate[0],
        latitude: firstCoordinate[1],
        zoom: 9.3 // Adjust zoom level as necessary
      });
    }
  }, [tracks]);

  console.log(tracks)

  React.useEffect(() => {
    if (tracks && tracks.features.length > 0) {
      const lastTrack = tracks.features[tracks.features.length - 1];
      const total_coord = (lastTrack.geometry as LineString).coordinates.length
      const lastCoordinate = (lastTrack.geometry as LineString).coordinates[total_coord - 1];
      setLastTrackCoordinate([lastCoordinate[0], lastCoordinate[1]]);
    }
  }, [tracks]);


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
  if (tracks) interactiveLayerIds.push('tracks');

  return (
    <ReactMapGl
      mapboxAccessToken={MAPBOX_TOKEN}
      {...viewport}
      style={{ width: '70vw', height: '90vh' }}
      mapStyle="mapbox://styles/mapbox/satellite-streets-v11"
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

      {!tracks ? <React.Fragment /> :
        <Source type="geojson" data={tracks as any} lineMetrics={true}>
          <Layer id="tracks" type="line" paint={{
            'line-color': 'red',
            'line-width': 10,
            'line-gradient': [
              'interpolate',
              ['linear'],
              ['line-progress'],
              0, 'red',               // Start at 0 with red
              state.sliderValue, 'red',    // Continue with red until the slider value
              state.sliderValue + 0.01, 'rgba(0, 0, 0, 0)' // Transition to transparent immediately after slider value
            ],
          }} />
        </Source>
      }


      {firstTrackCoordinate && (
        <Marker longitude={firstTrackCoordinate[0]} latitude={firstTrackCoordinate[1]}>
          <div style={{ backgroundColor: 'pink', borderRadius: '50%', width: '20px', height: '20px', border: '3px solid white' }} />
        </Marker>
      )}

      {lastTrackCoordinate && (
        <Marker longitude={lastTrackCoordinate[0]} latitude={lastTrackCoordinate[1]}>
          <div style={{ backgroundColor: 'blue', borderRadius: '50%', width: '20px', height: '20px', border: '3px solid white' }} />
        </Marker>
      )}

    </ReactMapGl>
  );
});


