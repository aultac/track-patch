import React from 'react';
import { observer } from 'mobx-react-lite';
import log from './log';
import { context } from './state';
import { Button, LinearProgress, Select, Autocomplete, MenuItem, TextField } from '@mui/material';
import numeral from 'numeral';

const { info, warn } = log.get('config-pane');

const columns = [ 'LATITUDE', 'LONGITUDE', 'COMMISION_NUMBER', 'SPEED_MILES_PER_HOUR', 'VEHICLE_HEADING', 'VEHICLE_ID', 'VEHICLE_TIMESTAMP_GMT' ];
const columnIndexMap: { [columnName: string]: number } = {}; // fill this in when header is parsed

export const ConfigPane = observer(function ConfigPane() {
  const { state, actions } = React.useContext(context);

  const [ inzone, setInzone ] = React.useState<Boolean>(false);

  const handleFile = ({filetype, eventtype, inout} : { filetype: 'tracks' | 'workorders', eventtype: 'drop' | 'drag', inout?: boolean }): React.DragEventHandler  => async (evt) => {
    evt.preventDefault();
    evt.stopPropagation();
    switch(eventtype) {

      case 'drag':
        if (inzone !== inout) {
          setInzone(inout || false);
          if (inout) evt.dataTransfer.dropEffect = "copy"; // makes a green plus on mac
        }
      break;

      case 'drop':
        const files = [ ...evt.dataTransfer.files ]; // It is dumb that I have to do this
        if (files.length < 1) {
          info('No files dropped!');
          return;
        }
        if (filetype === 'tracks') {
          actions.parsingInProgress(true);
          actions.loadDayTracks(files[0]!);
        } else {
          actions.knownWorkOrdersParsing(true);
          actions.loadKnownWorkorders(files[0]!);
          actions.knownWorkOrdersParsing(false);
        }
      }
    };

  return (
    <div style={{ width: '30vw', height: '90vh', padding: '5px' }} >

      <Autocomplete 
        style={{marginTop: '10px', marginBottom: '5px'}}
        options={state.geojsonviz.files}  
        value={state.geojsonviz.selectedFile} 
        onChange={(evt, value) => actions.selectGeojsonVizFile(value as string)}
        renderInput={(params) => <TextField {...params} label="Load Road Tile" />}
      />

      <div style={{ padding: '10px', margin: '5px', height: '20%', alignItems: 'center', justifyContent: 'center', display: 'flex', border: '3px dashed #000088', borderRadius: '3px' }}
        onDragOver={handleFile({ filetype: 'tracks', eventtype: 'drag' })}
        onDrop={handleFile({ filetype: 'tracks', eventtype: 'drop' })}
        onDragEnter={handleFile({ filetype: 'tracks', eventtype: 'drag', inout: true })}
        onDragLeave={handleFile({ filetype: 'tracks', eventtype: 'drag', inout: false })}
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

      <div style={{ padding: '10px', margin: '5px', height: '20%', alignItems: 'center', justifyContent: 'center', display: 'flex', border: '3px dashed #008800', borderRadius: '3px' }}
        onDragOver={handleFile({ filetype: 'workorders', eventtype: 'drag' })}
        onDrop={handleFile({ filetype: 'workorders', eventtype: 'drop' })}
        onDragEnter={handleFile({ filetype: 'workorders', eventtype: 'drag', inout: true })}
        onDragLeave={handleFile({ filetype: 'workorders', eventtype: 'drag', inout: false })}
      >
        {
          !state.knownWorkorders.parsing && !state.knownWorkorders.orders.rev ? 'Drop work orders spreadsheet here to validate.' :
          <div style={{flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
            <div>Loaded {numeral(actions.numKnownWorkorders()).format('0,0')} Work Orders</div>
          </div>
        }
      </div>

      <div style={{ alignItems: 'center', justifyContent: 'center', display: 'flex' }}>
        <Button 
          style={{ flexGrow: 1 }}
          onClick={() => actions.validateWorkorders()} 
          variant="contained" 
          disabled={!actions.knownWorkorders() || !actions.daytracks() }
        >
          Validate Work Orders (PoC)
        </Button>
      </div>


    </div>
  );

});


