import log from './log.js';
import { writeFile } from 'fs/promises';
import linebyline from 'linebyline';
import { mkdirp } from 'mkdirp';
import pmap from 'p-map';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import isoWeek from 'dayjs/plugin/isoWeek.js';
import { vehicletracks } from '@track-patch/lib';

dayjs.extend(isoWeek);
dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

dayjs.tz.setDefault('America/Indiana/Indianapolis');

const { info, trace } = log.get('split-day-tracks');

export async function splitDayTracks({ file, output }: { file: string, output: string}): Promise<void> {
  trace('Starting splitDayTracks...');
  if (!output || !file) throw new Error('ERROR: you must pass both -o <output> and -f <input_file>');

  const weeks: { [yearweeknum: string]: string } = {};
  let datecol: number = -1;
  let header: string = "";
  await new Promise((resolve, reject) => {
    const reader = linebyline(file);
    reader.on('line', (line: string, linecount: number) => {
      if (!header) {
        header = line;
        return;
      }
      const vehicle_date = line.split(',')[1]!; // expect it to be the second column
      const date = vehicletracks.toDayjs(vehicle_date).tz('America/Indiana/Indianapolis');
      const weeknum = date.isoWeek();
      const yearweek = `${date.year()}-${weeknum < 10 ? '0'+weeknum : weeknum}`;
      if (!weeks[yearweek]) weeks[yearweek] = "";
      weeks[yearweek] += line + '\n';
      if (!(linecount % 10000)) {
        info('Done with',linecount,'lines');
      }
    });
    reader.on('error', reject);
    reader.on('close', resolve);
  });

  await mkdirp(output);
 
  info('Writing files to',output);
  await pmap(
    Object.entries(weeks), 
    ([yearweek, csvstring]) => writeFile(`${output}/${yearweek}-tracks.csv`, header+'\n'+csvstring),
    { concurrency: 100 }
  );

  info('Done!  CTRL-C to quit');
  return;
}


