import React from 'react';
import { observer } from 'mobx-react-lite';
import log from './log';
import { context } from './state';

const { info, warn } = log.get('maphoverinfo');

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
      color: '#222222',
      maxWidth: '300px',
      fontSize: '12px',
      zIndex: 9,
      pointerEvents: 'none',
    }}>
      {state.hover.features.map((f,i) => {
        return <div key={`hoverinfo${i}`}>
          Feature {i}:
          <pre>{JSON.stringify(f.properties, null,'  ')}</pre>
        </div>
      })}
    </div>
  );
});

