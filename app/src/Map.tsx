import React from 'react';
import { observer } from 'mobx-react-lite';
import './App.css';
import debug from 'debug';
import ReactMapGl, { Source, Layer } from 'react-map-gl';
import { context } from './state';

const info = debug('indot/app#App:info');
const warn = debug('indot/app#App:warn');

const MAPBOX_TOKEN = 'pk.eyJ1IjoiYXVsdGFjIiwiYSI6ImNsMXA4MzU3NTAzbzUzZW55ajhiM2FsOGwifQ.8Umhtpm98ty92vbos4kM3Q';

const bad = { color: 'red' };
const good = { color: 'green' };
export const Map = observer(function Map() {
  const { state, actions } = React.useContext(context);
  const geojson = actions.geojson();

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
    >
      <Source type="geojson" data={geojson}>
        <Layer id="data" type="line" paint={{
          'line-color': [ 'get', 'color' ],
          'line-width': [
            'interpolate', // this is the "operator" 
            ['linear'], // arg1 to the 'interpolate' operator
            ['zoom'], 
            10,
            ['/', ['-', 100, ['number', ['get', 'maxspeed']]], 10],
            13,
            ['/', ['-', 100, ['number', ['get', 'maxspeed']]], 20],
          ],
        }} />

      </Source>
    </ReactMapGl>
  );
});

