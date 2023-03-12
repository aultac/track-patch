import React from 'react';
import { observer } from 'mobx-react-lite';
import log from './log';
import { context } from './state';
import { parse } from 'papaparse';
import { LinearProgress } from '@mui/material';
import numeral from 'numeral';

const { info, warn } = log.get('config-pane');

const columns = [ 'LATITUDE', 'LONGITUDE', 'COMMISION_NUMBER', 'SPEED_MILES_PER_HOUR', 'VEHICLE_HEADING', 'VEHICLE_ID', 'VEHICLE_TIMESTAMP_GMT' ];
const columnIndexMap: { [columnName: string]: number } = {}; // fill this in when header is parsed

export const ConfigPane = observer(function ConfigPane() {
  const { state, actions } = React.useContext(context);

  const [ inzone, setInzone ] = React.useState<Boolean>(false);

  const handleFile = ({type, inout} : { type: 'drop' | 'drag', inout?: boolean }): React.DragEventHandler  => async (evt) => {
    evt.preventDefault();
    evt.stopPropagation();
    switch(type) {

      case 'drag':
        if (inzone !== inout) {
          setInzone(inout || false);
          if (inout) evt.dataTransfer.dropEffect = "copy"; // makes a green plus on mac
        }
      break;

      case 'drop':
        info('file dropped, evt = ', evt);
        actions.parsingInProgress(true);
        const files = [ ...evt.dataTransfer.files ]; // It is dumb that I have to do this
        if (files.length < 1) {
          info('No files dropped!');
          return;
        }
        info('dropped files: ', files);
        actions.loadDayTracks(files[0]!);
      }
    };

  return (
    <div style={{ width: '30vw', height: '90vh', padding: '5px' }} >
      <div style={{ padding: '10px', height: '20%', alignItems: 'center', justifyContent: 'center', display: 'flex', border: '3px dashed #000088', borderRadius: '3px' }}
        onDragOver={handleFile({ type: 'drag' })}
        onDrop={handleFile({ type: 'drop' })}
        onDragEnter={handleFile({ type: 'drag', inout: true })}
        onDragLeave={handleFile({ type: 'drag', inout: false })}
      >
        {
          !state.parsing.inprogress && !state.daytracks.rev ? 'Drop GPS tracks file here.' :
          <div style={{flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
            <div>Loaded {numeral(state.parsing.currentNumRows).format('0,0')} Points ({state.parsing.state})</div>
            <div style={{flexGrow: 1, width: '100%'}}>
              <LinearProgress variant="determinate" value={100 * state.parsing.currentNumRows / (state.parsing.estimatedRows || 1)} />
            </div>
          </div>
        }
      </div>

    </div>
  );

});


