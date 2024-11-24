import React from 'react';
import { observer } from 'mobx-react-lite';
import log from './log';
import { context } from './state';
import { Button, LinearProgress, Select } from '@mui/material';
import { MenuItem, SelectChangeEvent, Slider } from '@mui/material';
import { Table, TableHead, TableBody, TableRow, TableCell, TableContainer, Paper } from '@mui/material';
import numeral from 'numeral';

const { info, warn } = log.get('config-pane');

export function fHrsToHrsMin(hoursString: string): string {
    const totalMinutes = Math.round(parseFloat(hoursString) * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
}


export const ConfigPane = observer(function ConfigPane() {
    const { state, actions } = React.useContext(context);

    const [inzone, setInzone] = React.useState<Boolean>(false);

    const handleSliderChange = (event: Event, newValue: number | number[]) => {
        state.sliderValue = newValue as number; // Update the state directly
    };

    const [selectedDate, setSelectedDate] = React.useState(state.chosenDate);
    const [selectedVehicle, setSelectedVehicle] = React.useState<string | null>(state.chosenVehicleID);

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

        if (state.chosenDate !== null && state.chosenVehicleID != null) {
            actions.filterDayTracks({ vehicleid: state.chosenVehicleID, day: state.chosenDate });
            actions.filterGeoJSON({ vid: state.chosenVehicleID, day: state.chosenDate })
            //actions.updateMap();
        }
    };

    const handleFile = ({ filetype, eventtype, inout }: { filetype: 'tracks' | 'workorders' | 'vehicleactivities', eventtype: 'drop' | 'drag', inout?: boolean }): React.DragEventHandler => async (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        switch (eventtype) {

            case 'drag':
                if (inzone !== inout) {
                    setInzone(inout || false);
                    if (inout) evt.dataTransfer.dropEffect = "copy"; // makes a green plus on mac
                }
                break;

            case 'drop':
                const files = [...evt.dataTransfer.files]; // It is dumb that I have to do this
                if (files.length < 1) {
                    info('No files dropped!');
                    return;
                }
                switch (filetype) {
                    case 'tracks':
                        actions.parsingInProgress(true);
                        actions.loadDayTracks({ file: files[0]! });
                        break;
                    case 'workorders':
                        actions.loadKnownWorkorders({ file: files[0]! });
                        break;
                    case 'vehicleactivities':
                        actions.loadVehicleActivities({ file: files[0]! });
                        break;
                }
        }
    };

    const selectedVehicleComputedHrs = vehicleList.find(v => v.vehicleId === selectedVehicle)?.computedHrs || 0;


    const tableData = actions.getAnalysisData({
        vehicleid: state.chosenVehicleID as string,
        date: state.chosenDate as string,
    });

    const totals = (tableData || []).reduce(
        (acc, row) => {
            acc.computedHours += isNaN(Number(row.computedHours)) ? 0 : Number(row.computedHours);
            acc.reportedHours += isNaN(Number(row.reportedHours)) ? 0 : Number(row.reportedHours);
            return acc;
        },
        { computedHours: selectedVehicleComputedHrs, reportedHours: 0 } // Initialize with selected vehicle's computedHrs
    );
    const numrows = state.parsing.currentNumRows;




    return (
        <div style={{ width: '48vw', height: '90vh', padding: '3px', overflow: 'auto' }}>

            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-around' }}>

                <div style={{ margin: '5px', width: '16vw', height: '10vh', alignItems: 'center', justifyContent: 'center', display: 'flex', border: '3px dashed #000088', borderRadius: '3px' }}
                    onDragOver={handleFile({ filetype: 'tracks', eventtype: 'drag' })}
                    onDrop={handleFile({ filetype: 'tracks', eventtype: 'drop' })}
                    onDragEnter={handleFile({ filetype: 'tracks', eventtype: 'drag', inout: true })}
                    onDragLeave={handleFile({ filetype: 'tracks', eventtype: 'drag', inout: false })}
                >
                    {
                        !state.parsing.inprogress && !state.daytracks.rev ? 'Drop GPS tracks.' :
                            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                {state.parsing.state === 'roads'
                                    ? <div>Identifying roads: {numeral(numrows).format('0,0')} Points</div>
                                    : state.parsing.state === 'preprocessed'
                                        ? <div>Loading preprocessd tracks...</div>
                                        : <div style={{ fontSize: '12px' }}>Loaded {numeral(numrows).format('0,0')} Points ({state.parsing.state})</div>
                                }

                                {state.parsing.state !== 'preprocessed'
                                    ? <div style={{ flexGrow: 1, width: '80%' }}>
                                        <LinearProgress variant="determinate" value={100 * numrows / (state.parsing.estimatedRows || 1)} />
                                    </div>
                                    : <React.Fragment />
                                }

                                {state.parsing.inprogress ? <React.Fragment /> :
                                    <Button onClick={() => actions.exportProcessedTracks()} style={{ fontSize: '12px' }}>Export Processed Tracks</Button>
                                }
                            </div>
                    }
                </div>

                <div style={{ margin: '5px', width: '16vw', height: '10vh', alignItems: 'center', justifyContent: 'center', display: 'flex', border: '3px dashed #008800', borderRadius: '3px' }}
                    onDragOver={handleFile({ filetype: 'workorders', eventtype: 'drag' })}
                    onDrop={handleFile({ filetype: 'workorders', eventtype: 'drop' })}
                    onDragEnter={handleFile({ filetype: 'workorders', eventtype: 'drag', inout: true })}
                    onDragLeave={handleFile({ filetype: 'workorders', eventtype: 'drag', inout: false })}
                >
                    {
                        state.knownWorkorders.parsing
                            ? 'Reading work orders...'
                            : !state.knownWorkorders.orders.rev
                                ? 'Drop work orders.'
                                : <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ fontSize: '12px' }}>Loaded {numeral(actions.numKnownWorkorders()).format('0,0')} Work Orders</div>
                                </div>
                    }
                </div>

                <div style={{ margin: '5px', width: '16vw', height: '10vh', alignItems: 'center', justifyContent: 'center', display: 'flex', border: '3px dashed #008800', borderRadius: '3px' }}
                    onDragOver={handleFile({ filetype: 'vehicleactivities', eventtype: 'drag' })}
                    onDrop={handleFile({ filetype: 'vehicleactivities', eventtype: 'drop' })}
                    onDragEnter={handleFile({ filetype: 'vehicleactivities', eventtype: 'drag', inout: true })}
                    onDragLeave={handleFile({ filetype: 'vehicleactivities', eventtype: 'drag', inout: false })}
                >
                    {
                        state.createdWorkOrders.parsing
                            ? 'Reading vehicle activities...'
                            : !state.createdWorkOrders.vehicleActivities.rev
                                ? 'Drop vehicle activities.'
                                : <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ fontSize: '12px' }}>Found {numeral((actions.vehicleActivities() || []).length).format('0,0')} Vehicle Activities</div>
                                    {state.createdWorkOrders.workorders.rev > 0
                                        ? <div style={{ fontSize: '11px' }}>Successfully created {numeral(actions.createdWorkOrders()?.length || 0).format('0,0')} Work Orders</div>
                                        : <React.Fragment />
                                    }
                                </div>
                    }
                </div>

            </div>

            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-around' }} >

                <div style={{ margin: '5px', width: '25vw', height: '10vh', alignItems: 'center', justifyContent: 'center', display: 'flex' }}>
                    <Button
                        style={{ flexGrow: 1 }}
                        onClick={() => actions.validateWorkorders()}
                        variant="contained"
                        disabled={!actions.knownWorkorders() || !actions.daytracks()}
                    >
                        Validate Work Orders
                    </Button>
                </div>

                <div style={{ margin: '5px', width: '25vw', height: '10vh', alignItems: 'center', justifyContent: 'center', display: 'flex' }}>
                    <Button
                        style={{ flexGrow: 1 }}
                        onClick={() => {
                            if (state.createdWorkOrders.parsing) return;
                            actions.createWorkOrders()
                        }}
                        variant="contained"
                        disabled={!actions.vehicleActivities() || !actions.daytracks() || state.createdWorkOrders.parsing || state.createdWorkOrders.workorders.rev > 0}
                    >
                        Create Work Records
                    </Button>
                </div>

            </div>

            <div style={{ paddingLeft: '35px', paddingRight: '35px' }}>
                <Slider
                    value={state.sliderValue}
                    onChange={handleSliderChange}
                    aria-labelledby="input-slider"
                    min={0.001}
                    max={1}
                    step={0.001}
                />
            </div>

            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-around' }}>
                <Select
                    value={selectedDate}
                    onChange={handleChangeDate}
                    displayEmpty
                    style={{
                        minWidth: '150px', // Set a consistent width for the Select component
                        fontSize: '14px', // Use a smaller font size for compactness
                        height: '30px', // Set a reduced height
                        lineHeight: '30px', // Align text vertically
                        padding: '0 10px', // Reduce padding for a thinner look
                    }}
                >
                    <MenuItem value="" disabled>Select Date</MenuItem>
                    {actions.getDateList().map(date => (
                        <MenuItem key={date} value={date}>
                            {date}
                        </MenuItem>
                    ))}
                </Select>

                <Select
                    value={selectedVehicle}
                    onChange={handleChangeVehicle}
                    displayEmpty
                    style={{
                        minWidth: '150px', // Set a consistent width for the Select component
                        fontSize: '14px', // Use a smaller font size for compactness
                        height: '30px', // Set a reduced height
                        lineHeight: '30px', // Align text vertically
                        padding: '0 10px', // Reduce padding for a thinner look
                    }}
                >
                    <MenuItem value="" disabled>Select Vehicle</MenuItem>
                    {vehicleList.map(vehicle => (
                        <MenuItem key={vehicle.vehicleId} value={vehicle.vehicleId}>
                            {vehicle.vehicleId} ({numeral(vehicle.count).format('0,0')} points)
                        </MenuItem>
                    ))}
                </Select>
            </div>

            <div style={{ padding: '15px' }}>
                <TableContainer sx={{
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    boxShadow: 'none', // Removes shadow
                    overflow: 'hidden',
                }}
                >
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Route Ref</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Inventory Asset</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Computed Hours</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Reported Hours</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {(tableData || []).map((row, index) => (
                                <TableRow key={index}>
                                    <TableCell>{row.routeRef}</TableCell>
                                    <TableCell>{row.inventoryAsset}</TableCell>
                                    <TableCell>{fHrsToHrsMin(row.computedHours.toString())}</TableCell>
                                    <TableCell>{fHrsToHrsMin(row.reportedHours.toString())}</TableCell>
                                </TableRow>
                            ))}
                            <TableRow>
                                <TableCell colSpan={2}>
                                    In Garage or Ideal
                                </TableCell>
                                <TableCell>
                                    {fHrsToHrsMin(selectedVehicleComputedHrs.toFixed(2))}
                                </TableCell>
                                <TableCell>
                                    NA
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell colSpan={2} sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                                    Total
                                </TableCell>
                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                                    {fHrsToHrsMin(totals.computedHours.toFixed(2))}
                                </TableCell>
                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                                    {fHrsToHrsMin(totals.reportedHours.toFixed(2))}
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>
            </div>
        </div >
    );
});


