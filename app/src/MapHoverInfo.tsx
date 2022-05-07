import React from 'react';
import { observer } from 'mobx-react-lite';
import debug from 'debug';
import { context } from './state';

const info = debug('trackpatch/app#MapHoverInfo:info');
const warn = debug('trackpatch/app#MapHoverInfo:warn');

export const MapHoverInfo = observer(function MapHoverInfo() {
  const { state } = React.useContext(context);
  if (!state.hover.active) return <div></div>;
  return (
    <div style={{ 
      left: state.hover.x, 
      top: state.hover.y,
      position: 'absolute',
      margin: '8px',
      padding: '4px',
      background: 'rgba(255, 255, 255, 0.9)',
      color: '#ffffff',
      maxWidth: '300px',
      fontSize: '12px',
      zIndex: 9,
      pointerEvents: 'none',
    }}>
      {state.hover.features.map((f,i) => 
        <div key={`hoverinfo${i}`} style={{ color: f.properties.color }}>
          {f.properties.vehicleid}: {f.properties.minspeed} - {f.properties.maxspeed} mph
        </div>
      )}
    </div>
  );
});

