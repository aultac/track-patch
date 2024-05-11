import { runInAction, action } from 'mobx';
import { state, ActivityMessage, ParsingState, VehicleDayTrackSeg } from './state';
import log from '../log';
import type { FeatureCollection, GeoJSON } from 'geojson';
import { assertWorkOrder, DayTracks, WorkOrder } from '@track-patch/lib';
import readtracks from './readtracks-worker.js'; // I couldn't get this to work as a worker
import xlsx from 'xlsx-js-style';
import numeral from 'numeral';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { FileReader } from '@tanker/file-reader';
import { downloadBlob } from './downloadBlob';
import { assertRoadSegment, computePointsOnRoadSegmentForVehicleOnDay, computeSecondsOnRoadSegmentForVehicleOnDay, saveWorkorders, vehicleidFromResourceName } from './workorder_helpers';
import { geohash } from '@track-patch/gps2road';
import allRoadSegments from './workorder_roadsegments.json';

dayjs.extend(customParseFormat);
const { info, warn } = log.get("actions");

//--------------------------------------------------------------------
// GeoJSON, Roads, and MileMarkers
//--------------------------------------------------------------------

// Helper function to fetch a geojson asset:

const loadGeoJSON = action('loadGeoJSON', async (path: string): Promise<GeoJSON | null> => {
  try {
    const response = await fetch(`./${path}`);
    info('Fetch returned');
    if (response.status >= 400) throw new Error(`Failed to fetch data from ${path}`);
    info('Getting JSON from response');
    return await response.json();
  } catch (e: any) {
    warn('ERROR: failed to fetch roads data.  Error was: ', e);
    activity(`ERROR: Failed to fetch and load roads.geojson, error was: ${e.toString()}`);
  }
  return null;
});

let _roads: GeoJSON | null = null;
export function roads() { return _roads; }
export const loadRoads = action('loadRoads', async (filename: string) => {
  _roads = await loadGeoJSON(`roads-by-geohash/${filename}`);
  runInAction(() => { state.roads.rev++ });
});
export const loadRoadsForTrack = action('loadRoadsForFilteredTrack', async () => {

});

let _milemarkers: GeoJSON | null = null;
export function milemarkers() { return _milemarkers; }
export const loadMilemarkers = action('loadMilemarkers', async () => {
  _milemarkers = await loadGeoJSON('milemarkers.geojson');
  runInAction(() => { state.milemarkers.rev++ });
});


//---------------------------------------------------
// GeoJSON visualizations
//---------------------------------------------------

export const selectGeojsonVizFile = action('selectGeojsonVizFile', async (filename: string) => {
  state.geojsonviz.selectedFile = filename;
  activity(`Loading roads from ${filename}`);
  await loadRoads(filename);
  activity('Done loading roads');
});

export const search = action('search', async (search: string) => {
  state.search = search;
});



//---------------------------------------------------
// Basic State updates
//---------------------------------------------------

export const page = action('page', (page: typeof state.page): void => {
  state.page = page;
});

export const popActivity = action('popActivity', () => {
  if (state.activityLog.length < 1) return;
  state.activityLog = state.activityLog.slice(1);
});
export const activity = action('activity', (msg: string | string[] | ActivityMessage | ActivityMessage[], type: ActivityMessage['type'] = 'good') => {
  if (!Array.isArray(msg)) {
    msg = [msg] as string[] | ActivityMessage[];
  }
  // Make sure evey element is an activity message (convert strings):
  let msgs: ActivityMessage[] = msg.map((m: any) => {
    if (typeof m === 'object' && 'msg' in m && typeof m.msg === 'string') {
      return m as ActivityMessage;
    } else {
      return { msg: m, type } as ActivityMessage;
    }
  });
  info(msgs.map(m => m.msg).join('\n'));
  state.activityLog = [...state.activityLog, ...msgs];
  setTimeout(popActivity, 5000);
});


//-------------------------------------------------------------------
// Basic View interaction
//-------------------------------------------------------------------

export const hover = action('hover', (hover: typeof state['hover']): void => {
  state.hover = hover;
});

//----------------------------------------------------------------
// Parsing the big tracks file
//----------------------------------------------------------------

export const parsingInProgress = action('parsingInProgress', (val: typeof state['parsing']['inprogress']): void => {
  state.parsing.inprogress = val;
});
export const parsingEstimatedRows = action('parsingEstimatedRows', (val: typeof state['parsing']['estimatedRows']): void => {
  state.parsing.estimatedRows = val;
});
export const parsingCurrentNumRows = action('parsingCurrentNumRows', (val: typeof state['parsing']['currentNumRows']): void => {
  state.parsing.currentNumRows = val;
});
export const parsingState = action('parsingState', (val: ParsingState) => {
  state.parsing.state = val;
});


let _daytracks: DayTracks | null = null;
export function daytracks() { return _daytracks; }

let _daytracksGeojson: FeatureCollection | null = null;
export function daytracksGeoJSON() { return _daytracksGeojson; }

// This populates both _daytracks and _daytracksGeojson
export const loadDayTracks = action('loadDayTracks', async (file: File) => {
  parsingInProgress(true);
  parsingEstimatedRows(file.size / 240); // seems to be around 240 bytes/record

  // Read the already-processes JSON tracks
  if (file.name.match(/\.json$/)) {
    info('Parsing input file', file.name, 'as JSON...');
    parsingState('preprocessed');
    parsingInProgress(true);
    const f = new FileReader(file);
    try {
      const resultstr = await f.readAsText();
      const result = JSON.parse(resultstr);
      if (!result || typeof result.daytracks !== 'object') {
        throw new Error('No daytracks present.');
      }
      if (typeof result.daytracksGeoJSON !== 'object') {
        throw new Error('No daytracksGeoJSON present.');
      }
      _daytracks = result.daytracks as DayTracks;
      _daytracksGeojson = result.daytracksGeoJSON as FeatureCollection;
      // Count number of points from VehicleDayTracks
      let numpoints = 0;
      for (const vehicles of Object.values(_daytracks)) {   // { '2023-01-01': { '61001': { id: '...', ..., track: [ ...points... ] } } }
        for (const vehicle_info of Object.values(vehicles)) {
          numpoints += vehicle_info.track.length;
          // Convert all the "time" fields back to dayjs:
          for (const p of vehicle_info.track) {
            if (typeof p.time === 'string') {
              p.time = dayjs(p.time);
            }
          }
        }
      }
      runInAction(() => state.daytracks.rev++);
      runInAction(() => state.daytracksGeoJSON.rev++);
      parsingCurrentNumRows(numpoints);
      parsingEstimatedRows(numpoints);
      parsingState('done');
      parsingInProgress(false);
    } catch (e: any) {
      warn('FAIL: could not parse pre-processed JSON file.  Error was: ', e);
      parsingState('error');
      parsingInProgress(false);
    }
    return; // rest of parsing code is for CSV
  }

  const result = await readtracks({
    file,
    numRowsParsed: parsingCurrentNumRows,
    parsingState,
  });
  _daytracks = result.daytracks;
  _daytracksGeojson = result.daytracksGeoJSON;

  parsingEstimatedRows(state.parsing.currentNumRows); // make sure progress bar is finished
  activity('Parsing complete!');
  parsingInProgress(false);
  info('Parsing complete, days = ', _daytracks);
  runInAction(() => { state.daytracks.rev++ });
  runInAction(() => { state.daytracksGeoJSON.rev++ });
});

export const exportProcessedTracks = action('exportProcessedTracks', async () => {
  const output = {
    daytracks: _daytracks,
    daytracksGeoJSON: _daytracksGeojson,
  };
  const blob = new Blob([JSON.stringify(output)], { type: 'application/json' });
  info('Downloading processed tracks...');
  downloadBlob(blob, 'processed-tracks.json');
});

//-----------------------------------------------------------
// Work Orders (spreadsheet):
//-----------------------------------------------------------

let _knownWorkorders: WorkOrder[] | null = null;
export function knownWorkorders() { return _knownWorkorders };
export function numKnownWorkorders() { return _knownWorkorders ? _knownWorkorders.length : 0 }
export const loadKnownWorkorders = action('loadKnownWorkorders', async (file: File) => {
  knownWorkOrdersParsing(true);
  info('Reading workorders file...');
  const wb = xlsx.read(await file.arrayBuffer());
  info('sheet_to_json workorders...');
  const records = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { raw: false });
  info('assert proper workorders...');
  _knownWorkorders = records.filter((r, index) => {
    try {
      assertWorkOrder(r);
    } catch (e: any) {
      info('WARNING: line', index + 1, 'in work orders sheet was not a valid work order:', e.message);
      return false;
    }
    return true;
  }) as WorkOrder[];
  runInAction(() => { state.knownWorkorders.orders.rev++ });
  knownWorkOrdersParsing(false);
});
export const knownWorkOrdersParsing = action('knownWorkOrdersParsing', async (val: boolean) => {
  state.knownWorkorders.parsing = val;
});


let _filteredknownWorkorders: WorkOrder[] | null = null;

let _roadSegTracksForVOnD: VehicleDayTrackSeg [] = [];
export function roadSegTracksForVOnD() { return _roadSegTracksForVOnD};

export const validateWorkorders = action('validateWorkorders', async () => {
  if (!_knownWorkorders) throw new Error('No work orders to validate');

  //console.log(_knownWorkorders)
  for (const r of _knownWorkorders) {

    if (r['Resource Type'] !== 'Equipment') {
      info('Resource Type', r['Resource Type'], 'is not Equipment');
      continue; // this is the only thing we can identify right now
    }

    if (!r['Total Hrs']) {
      info('No Total Hrs');
      continue; // no reported hours means we skip this one
    }
    const reported_hours = +(r['Total Hrs']);
    if (isNaN(reported_hours)) {
      info('Reported hours isNaN');
      continue;
    }

    const vid = vehicleidFromResourceName(r['Resource Name'] || '')
    if (!vid) {
      info('Unable to find vehicle id', vid, 'in Resource Name', r['Resource Name']);
      continue; // we don't recognize this equipment number
    }

    const workorderday = dayjs(r['Work Date'], 'M/D/YY');
    if (!workorderday.isValid()) {
      info('Work Date', r['Work Date'], 'invalid');
      continue; // invalid dates don't work either
    }
    const day = workorderday.format('YYYY-MM-DD');
    const computedSeconds = await computeSecondsOnRoadSegmentForVehicleOnDay({ seg: r, vehicleid: vid, day });
    const computedPoints = await computePointsOnRoadSegmentForVehicleOnDay({ seg: r, vehicleid: vid, day });
    const computedHours = computedSeconds / 3600;
    const match = computedHours ? reported_hours / computedHours : 0;
    if (computedPoints !==  null && computedHours > 0){
      computedPoints.ctime = computedHours;
      computedPoints.rtime = reported_hours;
      _roadSegTracksForVOnD?.push(computedPoints);
    }
    r.match = numeral(match).format('0,0.00%');
    r.computedHours = numeral(computedHours).format('0,0.00');
    r.differenceHours = numeral(reported_hours - computedHours).format('0,0.00');
    info('WE ACTUALLY HAVE A COMPUTED HOURS!!!', computedHours);
  }
  _filteredknownWorkorders = _knownWorkorders.filter(w => w.computedHours && +(w.computedHours) > 0)
  saveWorkorders('validated-workorders.xlsx', _knownWorkorders.filter(w => w.computedHours && +(w.computedHours) > 0));
});


let _filteredDayTracks: DayTracks | null = null;
export function filteredDayTracks() { return _filteredDayTracks; }
export const filterDayTracks = action('filterDayTracks', ({ vehicleid, day }: { vehicleid: string, day: string }) => {
  if (!_daytracks) {
    _filteredDayTracks = null;
    return;
  }
  _filteredDayTracks = {};
  const daytrack = _daytracks[day];
  if (!daytracks) return;
  const vdt = daytrack[vehicleid];
  if (!vdt) return;
  _filteredDayTracks[day] = { [vehicleid]: vdt };
  runInAction(() => { state.filteredDayTracks.rev++ });

});

let _filteredGeoJSON: FeatureCollection | null = null;
export function filteredGeoJSON() { return _filteredGeoJSON; }
export const filterGeoJSON = action('filterGeoJSON', ({ vid, day }: { vid: string, day: string }) => {
  if (!_daytracksGeojson) {
    _filteredDayTracks = null;
    return;
  }

  // Filter the daytracksGeoJSON based on vid and day
  const filteredFeatures = _daytracksGeojson.features.filter(feature => {
    // Check if the feature belongs to the specified vid and day
    return feature.properties?.vid === vid && feature.properties?.day === day;
  });

  // Create a new FeatureCollection with the filtered features
  const filteredGeoJSON: FeatureCollection = {
    type: 'FeatureCollection',
    features: filteredFeatures,
  };

  // Update the filteredGeoJSON state
  runInAction(() => { _filteredGeoJSON = filteredGeoJSON; });
  runInAction(() => { state.filteredGeoJSON.rev++ });
});



export const getDateList = action(() => {
  if (!_daytracks) return [];
  return Object.keys(_daytracks);
});

export const getVehicleIDsForDate = action((date: string) => {
  if (!_daytracks || !_daytracks[date]) return [];

  const worders = _filteredknownWorkorders;

  if (worders) {
    const vehicleDataMap = new Map<string, { computedHrs: number, totalHrs: number }>();

    // Filter work orders by date
    const wordersForDate = worders.filter(wo => dayjs(wo['Work Date'], 'M/D/YY').format('YYYY-MM-DD') === date);

    wordersForDate.forEach(wo => {
      const vehicleId = vehicleidFromResourceName(wo['Resource Name'] || '').toString();
      const computedHrs = parseFloat(wo.computedHours || '0');
      const totalHrs = parseFloat(wo['Total Hrs'] || '0');

      if (!vehicleDataMap.has(vehicleId)) {
        vehicleDataMap.set(vehicleId, { computedHrs: 0, totalHrs: 0 });
      }

      const existingData = vehicleDataMap.get(vehicleId);
      if (existingData) {
        vehicleDataMap.set(vehicleId, {
          computedHrs: existingData.computedHrs + computedHrs,
          totalHrs: existingData.totalHrs + totalHrs
        });
      }
    });

    return Object.entries(_daytracks[date])
      .filter(([vehicleId]) => vehicleDataMap.has(vehicleId))
      .map(([vehicleId, vehicleData]) => {
        const { computedHrs, totalHrs } = vehicleDataMap.get(vehicleId) || { computedHrs: 0, totalHrs: 0 };

        return {
          vehicleId,
          count: vehicleData.track.length, // Assuming `track` is an array of points
          computedHrs,
          totalHrs
        };
      });
  } else {
    return Object.entries(_daytracks[date]).map(([vehicleId, vehicleData]) => ({
      vehicleId,
      count: vehicleData.track.length, // Assuming `track` is an array of points
      computedHrs: 0,
      totalHrs: 0 // Default computed and total hours when knownWorkorders is null
    }));
  }
});



export const updateChosenDate = action('updateChosenDate', (date: string | null) => {
  state.chosenDate = date;
});

export const updateChosenVehicleID = action('updateChosenVehicleID', (vehicleID: string | null) => {
  state.chosenVehicleID = vehicleID;
});



//---------------------------------------------------------------------
// Creating work orders from a list of vehicles with activity and day
//---------------------------------------------------------------------
export type VehicleActivity = {
  'Resource Name': string,
  'Activity': string,
  'Subactivity': string,
  'Work Date': string,
};
export function assertVehicleActivity(o: any): asserts o is VehicleActivity {
  if (!o || typeof o !== 'object') throw `assertVehicleActivity: must be an object`;
  if (typeof o['Resource Name'] !== 'string') throw `assertVehicleActivity: must have a Resource Name`;
  if (typeof o['Activity'] !== 'string') throw `assertVehicleActivity: must have a Activity`;
  if (typeof o['Subactivity'] !== 'string') throw `assertVehicleActivity: must have a Subactivity`;
  if (typeof o['Work Date'] !== 'string') throw `assertVehicleActivity: must have a Work Date`;
  if ('Total Hrs' in o && typeof o['Total Hrs'] !== 'number') throw `assertVehicleActivity: if Total Hrs is present, it must be a number`;
}
let _vehicleActivities: VehicleActivity[] | null = null;
export const vehicleActivities = action('vehicleActivities', () => {
  return _vehicleActivities;
});
export const loadVehicleActivities = action('loadVehicleActivities', async (file: File) => {
  runInAction(() => { state.createdWorkOrders.parsing = true; });
  const wb = xlsx.read(await file.arrayBuffer());
  const records = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { raw: false });
  _vehicleActivities = records.filter((r, index) => {
    try {
      assertVehicleActivity(r);
    } catch (e: any) {
      info('WARNING: line', index + 1, 'in vehicle activities sheet', r, 'was not a valid vehicle activity:', e);
      return false;
    }
    return true;
  }) as VehicleActivity[];
  runInAction(() => { state.createdWorkOrders.vehicleActivities.rev++ });
  runInAction(() => { state.createdWorkOrders.parsing = false; });
});

let _createdWorkOrders: WorkOrder[] | null = null;
export const createdWorkOrders = action('createdWorkOrders', () => _createdWorkOrders);
export const createWorkOrders = action('createWorkorders', async () => {
  if (!_vehicleActivities) {
    info('createWorkorders: No vehicleActivities to work with');
    return;
  }
  _createdWorkOrders = [];
  for (const va of _vehicleActivities) {
    const vehicleid = vehicleidFromResourceName(va['Resource Name']);
    const date = dayjs(va['Work Date'], 'M/D/YY');
    if (!date.isValid()) {
      info('Work Date', va['Work Date'], 'invalid');
      continue; // invalid dates don't work
    }
    const day = date.format('YYYY-MM-DD');

    for (const seg of Object.values(allRoadSegments)) {
      assertRoadSegment(seg);
      const computedSeconds = await computeSecondsOnRoadSegmentForVehicleOnDay({ seg, vehicleid, day });
      if (computedSeconds) {
        _createdWorkOrders.push({
          ...va,
          ...seg,
          'Total Hrs': '' + (computedSeconds / 3600.0),
          'Measurement Unit': 'MHR - WORK HR',
          'Resource Type': 'Equipment',
          'Asset Type': 'Snow Route', // I think this probably should have been with the road segment originally.  Hardcoding for now.  TODO
          'WO#': '',
        });
      }
    }
  }
  info('Created work orders: ', _createdWorkOrders);
  runInAction(() => state.createdWorkOrders.workorders.rev++);
  saveWorkorders('created-workorders.xlsx', _createdWorkOrders);
});

