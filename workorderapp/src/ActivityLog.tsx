import React from 'react';
import { observer } from 'mobx-react-lite';
import log from './log';
import { context } from './state';

const { info, warn } = log.get('config-pane');

export const ActivityLog = observer(function ActivityLog() {
  const { state } = React.useContext(context);
  
  if (state.activityLog.length < 1) return <React.Fragment/>;

  const good = { color: 'green' };
  const bad = { color: 'red' };
  // column-reverse keeps latest div at the top!
  return (
    <div style={{ display: 'flex', flexDirection: 'column-reverse', width: '100%', maxHeight: '200px', overflowY: 'scroll'}} >
      <hr/>
      {state.activityLog.map((m, index) => 
        <div key={`activitylog-${index}`} style={m.type === 'good' ? good : bad}>
          {m.msg}
          <hr/>
        </div>
      )}
    </div>
  );
});

