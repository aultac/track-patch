import React from 'react';
import { observer } from 'mobx-react-lite';
import log from './log';
import ReactMapGl, { Source, Layer, MapLayerMouseEvent } from 'react-map-gl';
import { context } from './state';
import { MapHoverInfo } from './MapHoverInfo';
import type { FeatureCollection } from 'geojson';

const { info, warn } = log.get('map');

const MAPBOX_TOKEN = 'pk.eyJ1IjoiYXVsdGFjIiwiYSI6ImNsMXA4MzU3NTAzbzUzZW55ajhiM2FsOGwifQ.8Umhtpm98ty92vbos4kM3Q';

const bad = { color: 'red' };
const good = { color: 'green' };
export const Map = observer(function Map() {
  const { state, actions } = React.useContext(context);

  let roads = actions.roads() as FeatureCollection;
  let milemarkers = actions.milemarkers();

  // Hover panel: you have to call useCallback BEFORE any returns
  const onHover = React.useCallback((evt: MapLayerMouseEvent) => {
    const active = evt.features && evt.features.length > 0 || false;
    actions.hover({ 
      x: evt.point.x, 
      y: evt.point.y, 
      features: (((evt.features as unknown) || []) as any[]),
      active,
    });
  },[]);
  const onLeave = () => {
    actions.hover({ x: 0, y: 0, features: [], active: false });
  }
    


  // Access the rev so we are updated when it changes.  Have to access it BEFORE !geojson or it might not re-render
  if (state.roads.rev < 1 || !roads || state.milemarkers.rev < 1 || !milemarkers) {
    return (
      <div style={{padding: '10px'}}>
        Click above to load mile markers and roads
        {state.activityLog.map((msg, index) => 
          <div key={`activity${index}`} style={msg.type === 'good' ? good : bad}>
            {msg.msg}
          </div>
        )}
      </div>
    );
  }

// XXX STOPPED HERE: 
// - index the milemarkers by POST_NAME prefix
// - identify road type by road names
// - Index all roads by geohash/road_type
//   * determine road type from the myriad places road names come from in spreadsheet
// - create GPS to RoadSegment 
//   * if near geohash border, include multiple geohashes
//   * priority by road type: Interstate/US -> wide distance
//   * include state: previous road name estimate for same path (avoid jumps onto side roads)
// - create GPS+RoadSegment to MileMarker
//

  // filter features to include only those that match the search:
  if (roads && state.search) {
    roads = {
      ...roads, 
      features: roads.features.filter(f => JSON.stringify(f.properties).match(state.search)),
    };
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
      onMouseMove={onHover}
      onMouseLeave={onLeave}
      interactiveLayerIds={['roads', 'milemarkers']}
    >
      <Source type="geojson" data={roads as any}>
        <Layer id="roads" type="line" paint={{
          'line-color': '#FF0000',
          'line-width': 2,
        }} />
      </Source>

      <MapHoverInfo />

      { !state.search
        ? <Source type="geojson" data={milemarkers as any}>
            <Layer id="milemarkers" type="circle" paint={{ 
              'circle-radius': 2,
              'circle-color': '#FF00FF',
              'circle-stroke-width': 1,
            }} />
          </Source>
        : ''
      }


    </ReactMapGl>
  );
});

