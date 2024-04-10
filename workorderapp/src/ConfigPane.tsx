import React from 'react';
import { observer } from 'mobx-react-lite';
import log from './log';
import { context } from './state';
import { Button, LinearProgress, Select, Autocomplete, MenuItem, TextField, SelectChangeEvent } from '@mui/material';
import numeral from 'numeral';

const { info, warn } = log.get('config-pane');

const columns = [ 'LATITUDE', 'LONGITUDE', 'COMMISION_NUMBER', 'SPEED_MILES_PER_HOUR', 'VEHICLE_HEADING', 'VEHICLE_ID', 'VEHICLE_TIMESTAMP_GMT' ];
const columnIndexMap: { [columnName: string]: number } = {}; // fill this in when header is parsed

export const ConfigPane = observer(function ConfigPane() {
  const { state, actions } = React.useContext(context);

  const [ inzone, setInzone ] = React.useState<Boolean>(false);

  const [selectedDate, setSelectedDate] = React.useState(state.chosenDate);
  const [selectedVehicle, setSelectedVehicle] = React.useState<string | null>(state.chosenVehicleID);

  const dateList = actions.getDateList();
  const vehicleList = actions.getVehicleIDsForDate(selectedDate || '');

  const handleChangeDate = (event: SelectChangeEvent<string | null>) => {
    const selectedDate = event.target.value as string;
    setSelectedDate(selectedDate);
    actions.updateChosenDate(selectedDate); // Update chosenDate in state

    // Reset selected vehicle when date changes
    setSelectedVehicle('');
    actions.updateChosenVehicleID('');
  };

  const handleChangeVehicle = (event: SelectChangeEvent<string | null>) => {
    const selectedVehicle = event.target.value as string | null;
    setSelectedVehicle(selectedVehicle);
    actions.updateChosenVehicleID(selectedVehicle); // Update chosenVehicleID in state
    
    if(state.chosenDate !== null && state.chosenVehicleID != null){
      actions.filterDayTracks({vehicleid: state.chosenVehicleID, day: state.chosenDate});
      actions.filterGeoJSON({vid: state.chosenVehicleID, day: state.chosenDate})
      actions.updateMap();
    }
  };

  const handleReset = () => {
    // Reset selected date and vehicle
    actions.resetMap();
  };

  const handleFile = ({filetype, eventtype, inout} : { filetype: 'tracks' | 'workorders' | 'vehicleactivities', eventtype: 'drop' | 'drag', inout?: boolean }): React.DragEventHandler  => async (evt) => {
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
        switch(filetype) {
          case 'tracks': 
            actions.parsingInProgress(true);
            actions.loadDayTracks(files[0]!);
          break;
          case 'workorders': 
            actions.loadKnownWorkorders(files[0]!);
          break;
          case 'vehicleactivities': 
            actions.loadVehicleActivities(files[0]!);
          break;
        }
      }
    };

  const numrows = state.parsing.currentNumRows;
  

  return (
    <div style={{ width: '30vw', height: '90vh', padding: '5px' }} >

      { !window.location.toString().match(/debug/) ? <React.Fragment /> :
        <Autocomplete 
          style={{marginTop: '10px', marginBottom: '5px'}}
          options={state.geojsonviz.files}  
          value={state.geojsonviz.selectedFile} 
          onChange={(_evt, value) => actions.selectGeojsonVizFile(value as string)}
          renderInput={(params) => <TextField {...params} label="Load Road Tile" />}
        />
      }

      <div style={{ padding: '10px', margin: '5px', height: '20%', alignItems: 'center', justifyContent: 'center', display: 'flex', border: '3px dashed #000088', borderRadius: '3px' }}
        onDragOver={handleFile({ filetype: 'tracks', eventtype: 'drag' })}
        onDrop={handleFile({ filetype: 'tracks', eventtype: 'drop' })}
        onDragEnter={handleFile({ filetype: 'tracks', eventtype: 'drag', inout: true })}
        onDragLeave={handleFile({ filetype: 'tracks', eventtype: 'drag', inout: false })}
      >
        {
          !state.parsing.inprogress && !state.daytracks.rev ? 'Drop GPS tracks file here.' :
          <div style={{flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
            { state.parsing.state === 'roads'
              ? <div>Identifying roads: {numeral(numrows).format('0,0')} Points</div>
              : state.parsing.state === 'preprocessed'
                ? <div>Loading preprocessd tracks...</div>
                : <div>Loaded {numeral(numrows).format('0,0')} Points ({state.parsing.state})</div>
            }

            { state.parsing.state !== 'preprocessed'
              ? <div style={{flexGrow: 1, width: '100%'}}>
                  <LinearProgress variant="determinate" value={100 * numrows / (state.parsing.estimatedRows || 1)} />
                </div>
              : <React.Fragment />
            }

            { state.parsing.inprogress ? <React.Fragment/> : 
              <Button onClick={() => actions.exportProcessedTracks() }>Export Processed Tracks</Button>
            }
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
          state.knownWorkorders.parsing 
          ? 'Reading work orders...'
          : !state.knownWorkorders.orders.rev 
            ? 'Drop work orders spreadsheet here to validate.'
            : <div style={{flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
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


      <div style={{ padding: '10px', margin: '5px', height: '20%', alignItems: 'center', justifyContent: 'center', display: 'flex', border: '3px dashed #008800', borderRadius: '3px' }}
        onDragOver={handleFile({ filetype: 'vehicleactivities', eventtype: 'drag' })}
        onDrop={handleFile({ filetype: 'vehicleactivities', eventtype: 'drop' })}
        onDragEnter={handleFile({ filetype: 'vehicleactivities', eventtype: 'drag', inout: true })}
        onDragLeave={handleFile({ filetype: 'vehicleactivities', eventtype: 'drag', inout: false })}
      >
        {
          state.createdWorkOrders.parsing 
          ? 'Reading vehicle activities...'
          : !state.createdWorkOrders.vehicleActivities.rev 
            ? 'Drop vehicle activities spreadsheet here.'
            : <div style={{flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
                <div>Found {numeral((actions.vehicleActivities() || []).length).format('0,0')} Vehicle Activities</div>
                { state.createdWorkOrders.workorders.rev > 0 
                  ? <div>Successfully created {numeral(actions.createdWorkOrders()?.length || 0).format('0,0')} Work Orders</div>
                  : <React.Fragment/>
                }
              </div>
        }
      </div>

      <div style={{ alignItems: 'center', justifyContent: 'center', display: 'flex' }}>
        <Button 
          style={{ flexGrow: 1 }}
          onClick={() => { 
            if (state.createdWorkOrders.parsing) return;
            actions.createWorkOrders() 
          } }
          variant="contained" 
          disabled={!actions.vehicleActivities() || !actions.daytracks() || state.createdWorkOrders.parsing || state.createdWorkOrders.workorders.rev > 0}
        >
          Create Work Records from GPS Tracks (PoC)
        </Button>
      </div>

      <div style={{ position: 'fixed', bottom: 35, right: 20 }}>
        <Select
          value={selectedDate}
          onChange={handleChangeDate}
          displayEmpty
        >
          <MenuItem value="" disabled>Select Date</MenuItem>
          {actions.getDateList().map(date => (
            <MenuItem key={date} value={date}>
              {date}
            </MenuItem>
          ))}
        </Select>
      </div>

      <div style={{ position: 'fixed', bottom: 35, right: 150 }}>
        <Button 
          style={{ marginRight: '10px' }} // Adjust styling as needed
          variant="outlined" 
          onClick={handleReset}
        >
          Reset
        </Button>
      </div>

      <div style={{ position: 'fixed', bottom: 35, right: 250 }}>
        <Select
          value={selectedVehicle}
          onChange={handleChangeVehicle}
          displayEmpty
        >
          <MenuItem value="" disabled>Select Vehicle</MenuItem>
          {vehicleList.map(vehicle => (
            <MenuItem key={vehicle} value={vehicle}>
              {vehicle}
            </MenuItem>
          ))}
        </Select>
      </div>


    </div>
  );

});


