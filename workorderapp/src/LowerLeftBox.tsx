import * as React from 'react';
import { observer } from 'mobx-react-lite';
import log from './log';
import { context } from './state';

import "@fontsource/oleo-script"
const { info } = log.get('navbar');

// Mostly from the MaterialUI example page
export const LowerLeftBox = observer(() => {
  const { state, actions } = React.useContext(context);

  return (
    <div style={{ 
      background: 'rgba(0, 0, 0, 0.5)',
      color: '#fff',
      position: 'absolute',
      bottom: '40px',
      left: '10px',
      padding: '5px 10px',
      margin: '0',
      fontSize: '11px',
      lineHeight: '18px',
      borderRadius: '3px',
      }}
    >
      Longitude: {state.hover.lon}<br/>
      Latitude: {state.hover.lat}<br/>
      Click anywhere on map to copy.
    </div>
  );
});

