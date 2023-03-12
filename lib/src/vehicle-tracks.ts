import debug from 'debug';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js'; // you have to use the .js or the cli won't work
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import type { DayTracks, VehicleDayTracks } from './types.js';

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

const info = debug('trackpatch/lib#vehicle-tracks:info');
const warn = debug('trackpatch/lib#vehicle-tracks:warn');

// These are for INDOT archive exported data:
const columns = [ 'LATITUDE', 'LONGITUDE', 'COMMISION_NUMBER', 'SPEED_MILES_PER_HOUR', 'VEHICLE_HEADING', 'VEHICLE_ID', 'VEHICLE_TIMESTAMP_GMT' ];
type RawPointRecord = {
  LATITUDE: string,
  LONGITUDE: string,
  COMMISION_NUMBER: string,
  SPEED_MILES_PER_HOUR: string,
  VEHICLE_HEADING: string,
  VEHICLE_ID: string,
  VEHICLE_TIMESTAMP_GMT: string,
};

function assertRawRecord(o: any): asserts o is RawPointRecord {
  if (!o) throw new Error('Cannot be falsey');
  if (typeof o !== 'object') throw new Error('RawPointRecord must be an object');
  for (const c of columns) {
    if (typeof o[c] !== 'string') throw new Error(`Missing column ${c}`);
  }
}



export function createRowParser(
  {numRowsParsedReporter} : 
  {
    numRowsParsedReporter: (rows: number) => void,
  }
) {

  let days: DayTracks = {};
  let header: string[] | null = null;
  let rownum = 0;
  const columnIndexMap: { [columnName: string]: number } = {}; // fill this in when header is parsed
  function parseRow(row: string[]) {
    if (!header) { // first row is header
      header = row as string[];
      // If the header doesn't have what we need, stop now:
      const missing = findMissingColumns(header);
      if (missing.length > 0) {
        throw new Error('FAIL: missing columns in CSV file.  missing = '+missing.join(',')+' and header = '+JSON.stringify(header));
      }
      populateColumnIndexMap(columnIndexMap, header);
      return;
    }

    const record = rowDataToObject(columnIndexMap, row);
    try {
      assertRawRecord(record);
    } catch(e: any) {
      info('Row',rownum,'was missing columns: ',e);
      return;
    }
 
    // Just get rid of the milliseconds b/c dayjs doesn't support all those digits and they are always 0 anyway
    const date = toDayjs(record.VEHICLE_TIMESTAMP_GMT);
    if (!date.isValid()) {
      throw new Error('ERROR: date '+cleanupDateString(record.VEHICLE_TIMESTAMP_GMT)+' from row '+rownum+' was not a valid date');
    }
    const di = date.format('YYYY-MM-DD');
    if (!days[di]) days[di] = {};
    const day = days[di]!;
    const vid = record.COMMISION_NUMBER;

    if (!day[vid]) day[vid] = {
      id: vid,
      day: di,
      track: [],
    };
    day[vid]!.track!.push({
      lat: +(record.LATITUDE),
      lon: +(record.LONGITUDE),
      heading: +(record.VEHICLE_HEADING),
      time: date,
      speed: +(record.SPEED_MILES_PER_HOUR),
    });
    rownum++;
    if (!(rownum % 10000)) numRowsParsedReporter(rownum);
  }

  function complete() {
    // Sort all the tracks by time to make sure they are in the right order
    for (const day of Object.keys(days)) {
      for (const vid of Object.keys(days[day]!)) {
        days[day]![vid]!.track.sort((a,b) => a.time.unix() - b.time.unix());
      }
    }
    numRowsParsedReporter(rownum);
    return days;
  }

  return {
    parseRow,
    complete
  };
}


function rowDataToObject(map: { [columnName: string]: number } = {}, vals: any[]): Record<string, string> {
  const ret: Record<string,any> = {};
  for (const [key, index] of Object.entries(map)) {
    ret[key] = vals[index];
  }
  return ret;
}

function findMissingColumns(header: string[]): string[] {
  const missing = [];
  for (const c of columns) {
    let found = false;
    for (const h of header) {
      if (h === c) {
        found = true;
        break;
      }
    }
    if (!found) missing.push(c);
  }
  return missing;
}

function populateColumnIndexMap(map: { [columnName: string]: number } = {}, header: string[]) {
  for (const [index, colname] of header.entries()) {
    if (columns.find(c => c === colname)) {
      map[colname] = index;
    }
  }
  info('Done with populateColumnIndexMap: map = ', map);
}

export function toDayjs(vehicle_timestamp_gmt: string) {
  return dayjs.utc(cleanupDateString(vehicle_timestamp_gmt), 'DD-MMM-YY hh.mm.ss A');
}
function cleanupDateString(date: string): string {
  return date
    .replace(/\.000000000+ /,' ') // get rid of all the decimal places on the time, they are all zeros anyway
    .replace('JAN', 'Jan') // months for dayjs have to be 3-letter capital first only
    .replace('FEB', 'Feb')
    .replace('MAR', 'Mar')
    .replace('APR', 'Apr')
    .replace('MAY', 'May')
    .replace('JUN', 'Jun')
    .replace('JUL', 'Jul')
    .replace('AUG', 'Aug')
    .replace('SEP', 'Sep')
    .replace('OCT', 'Oct')
    .replace('NOV', 'Nov')
    .replace('DEC', 'Dec');
}
