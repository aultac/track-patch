import React from 'react';
import { observer } from 'mobx-react-lite';
import './App.css';
import debug from 'debug';
import ReactMapGl, { Source, Layer, MapLayerMouseEvent } from 'react-map-gl';
import { context } from './state';
import type { GeoJSONVehicleFeature } from './types';
import { MapHoverInfo } from './MapHoverInfo';

const info = debug('trackpatch/app#App:info');
const warn = debug('trackpatch/app#App:warn');

const MAPBOX_TOKEN = 'pk.eyJ1IjoiYXVsdGFjIiwiYSI6ImNsMXA4MzU3NTAzbzUzZW55ajhiM2FsOGwifQ.8Umhtpm98ty92vbos4kM3Q';

const bad = { color: 'red' };
const good = { color: 'green' };
export const Map = observer(function Map() {
  const { state, actions } = React.useContext(context);
  let geojson = actions.geojson();

  // Hover panel: you have to call useCallback BEFORE any returns
  const onHover = React.useCallback((evt: MapLayerMouseEvent) => {
    const active = evt.features && evt.features.length > 0 || false;
    actions.hover({ 
      x: evt.point.x, 
      y: evt.point.y, 
      features: (((evt.features as unknown) || []) as GeoJSONVehicleFeature[]),
      active,
    });
  },[]);
  const onLeave = () => {
    actions.hover({ x: 0, y: 0, features: [], active: false });
  }
    



  // Access the rev so we are updated when it changes.  Have to access it BEFORE !geojson or it might not re-render
  if (state.geojson.rev < 1 || !geojson) {
    return (
      <div style={{padding: '10px'}}>
        Loading map: 
        {state.activityLog.map((msg, index) => 
          <div key={`activity${index}`} style={msg.type === 'good' ? good : bad}>
            {msg.msg}
          </div>
        )}
      </div>
    );
  }

  // A good intro to Mapbox styling expressions is: https://docs.mapbox.com/help/tutorials/mapbox-gl-js-expressions/
  geojson = { ...geojson }; // clone the top level
  if (state.filterbucket >= 0) {
    // Now filter the features for any chosen speedbucket (in the clone only)
    geojson.features = geojson.features.filter(f => f.properties.speedbucket === state.filterbucket);
    info('Filtered features to only those with speedbucket ', state.filterbucket, '.  There are ', geojson.features.length, ' of them after filtering: ', geojson);
  }

  // Filter all features for times before the "simulate endtime"
  const endtime = state.simulate.endtime;
  geojson.features = geojson.features.filter(f => { 
    return endtime.isAfter(f.properties.time);
  });

  return (
    <ReactMapGl
      mapboxAccessToken={MAPBOX_TOKEN}
      initialViewState={{
        longitude: -86.8,
        latitude: 39.5,
        zoom: 4.5
      }}
      style={{width: '100vw', height: '90vh'}}
      mapStyle="mapbox://styles/mapbox/satellite-streets-v11"
      onMouseMove={onHover}
      onMouseLeave={onLeave}
      interactiveLayerIds={['data']}
    >
      <Source type="geojson" data={geojson}>
        <Layer id="data" type="line" paint={{
          'line-color': [ 'get', 'color' ],
          'line-width': [
            'interpolate', // this is the "operator" 
            ['linear'], // arg1 to the 'interpolate' operator
            ['zoom'], 
            10,
            ['/', ['-', 150, ['number', ['get', 'maxspeed']]], 10],
            13,
            ['/', ['-', 150, ['number', ['get', 'maxspeed']]], 20],
          ],
        }} />

      </Source>
      <MapHoverInfo />
    </ReactMapGl>
  );
});

