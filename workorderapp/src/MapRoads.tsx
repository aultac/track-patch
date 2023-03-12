import React from 'react';
import { observer } from 'mobx-react-lite';
import log from './log';
import { Source, Layer, MapLayerMouseEvent } from 'react-map-gl';
import { context } from './state';
import { MapHoverInfo } from './MapHoverInfo';
import type { FeatureCollection } from 'geojson';

const { info, warn } = log.get('map-roads');

const bad = { color: 'red' };
const good = { color: 'green' };
export const MapRoads = observer(function MapRoads() {
  const { state, actions } = React.useContext(context);

  let roads = actions.roads() as FeatureCollection;
  let milemarkers = actions.milemarkers();

  // Hover panel: you have to call useCallback BEFORE any returns
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
  },[]);
  const onLeave = () => {
    actions.hover({ x: 0, y: 0, lat: 0, lon: 0, features: [], active: false });
  }
    
  const onClick = async (evt: MapLayerMouseEvent) => {
    await navigator.clipboard.writeText(`{ lon: ${evt.lngLat.lng}, lat: ${evt.lngLat.lat} }`);
  }

  // Access the rev so we are updated when it changes.  Have to access it BEFORE !geojson or it might not re-render
  if (state.roads.rev < 1 || !roads || state.milemarkers.rev < 1 || !milemarkers) {
    info('No roads or mile markers loaded');
    return <React.Fragment></React.Fragment>;
  }

  // filter features to include only those that match the search:
  if (roads && state.search) {
    roads = {
      ...roads, 
      features: roads.features.filter(f => JSON.stringify(f.properties).match(state.search)),
    };
  }

  // A good intro to Mapbox styling expressions is: https://docs.mapbox.com/help/tutorials/mapbox-gl-js-expressions/

  return (
    <React.Fragment>

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

    </React.Fragment>
  );
});

