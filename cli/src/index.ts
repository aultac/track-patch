import debug from 'debug';
import 'dotenv/config'; // loads all environment variables found in .env in project root
import { Command } from 'commander';
import { csvToDayTracksJSON, writeToJSON, loadFromJSON } from './load.js';
import { writeFile, mkdir } from 'fs/promises';
import { splitGeohashRoads } from './split-geohash-roads.js';
import { splitDayTracks } from './split-day-tracks.js';
import { geo2csv } from './geo2csv.js';
import fgdb from 'fgdb';
 
const info = debug('trackpatch/cli:info');
const warn = debug('trackpatch/cli:warn');

(async () => {
const program = new Command();
program.name('Track-Patch Command-line Interface');

program.command('split-day-tracks')
  .description('Split an INDOT archive CSV file of vehicle tracks into one file per week')
  .requiredOption('-f, --file <input_file>', 'input CSV file')
  .requiredOption('-o, --output <output_dir>', 'directory to save the split files into')
  .action(splitDayTracks);

program.command('split-geohash-roads')
  .description('Split road files in workorderapp/public/split_by_dataset into geohash-based files')
  .option('-d, --dir <input_directory>', 'directory of geojsons to convert', '../workorderapp/public/split_by_dataset')
  .option('-f, --file <input_file>', 'single file to convert')
  .option('-o, --output', 'output directory to accumulate geohash-based geojson files', '../workorderapp/public/roads-by-geohash')
  .action(splitGeohashRoads);


program.command('geo2csv')
  .description('Get a CSV of all the properties of a geojson feature collection')
  .requiredOption('-f, --file <filepath>', 'path to geojson file')
  .action(geo2csv);

program.command('tojson')
  .description('Create ./data.json from given csv file')
  .option('-f, --filepath <filepath>', 'path to csv file', process.env.LOCATIONS_PATH || '') // defaults to environment
  .action(async ({ filepath }: { filepath: string }) => { 
    const data = await csvToDayTracksJSON(filepath);
    await writeToJSON(data);
  });


program.command('summary')
  .description('Generate a summary of data.json')
  .action(async () => {
    info(`Loading data from json...`);
    const days = await loadFromJSON();

    info('****************************************************************');
    info('  Summary: ');
    info('****************************************************************');
    const vehicleids: { [key: string]: number } = {};
    for (const [day, vdtracks] of Object.entries(days)) {
      info('Day: ', day);
      info('    # Vehicles with tracks: ', Object.keys(vdtracks).length);
       for (const [vid, vdt] of Object.entries(vdtracks)) {
         if (!vehicleids[vid]) { vehicleids[vid] = 0 };
         vehicleids[vid] += vdt.track.length;
         info(`        ${vid}: ${vdt.track.length} points`);
       }
      info('----------------------------------');
    }
    info('Vehicles and total points:');
    let sum = 0;
    for (const [vid, count] of Object.entries(vehicleids)) {
      info('    Vehicle ', vid, ': ', count, ' total points');
      sum += count;
    }
    info('------------------------------------------------');
    const numvehicles = Object.keys(vehicleids).length;
    info(`${numvehicles} vehicles, average of ${sum / numvehicles} points per vehicle`);

  });


program.command('cl-fromgdb')
  .description('Convert INDOT centerline data from GDB to geohashed geojson')
  .requiredOption('-o, --output <path>', 'Where to save output files')
  .requiredOption('-g, --gdb <path>', 'Path to GDB directory with centerline data')
  .action(async ({ output, gdb }) => {
    info('Reading GDB from', gdb, 'and saving output to', output);
    await mkdir(output, { recursive: true });
    info('Reading gdb...');
    let result = await fgdb(gdb);
    const centerlines = result['Centerlines'];
    if (!centerlines) {
      info('ERROR: There was no "Centerlines" key on the result.  Keys on result are:', Object.keys(result));
      return;
    }
    result = null; // free space
    const outputfile = `${output}/centerlines.json`;
    info('Writing result to', outputfile);
    await writeFile(outputfile, JSON.stringify(centerlines, null, '  '));
    print(centerlines);
  });


program.parse();

function print(obj: any, level?: number) {
  const max_recurse_level = 8;
  const max_keys = 10;
  level = level || 0;
  const indent_amount = level * 2;
  let indent = '';
  for (let i=0; i < (indent_amount-1); i++) indent += ' '; // the "-1" is because info adds a space 
  if (typeof obj !== 'object') {
    info(indent, obj);
    return;
  }
  let keys = Object.keys(obj);
  let numkeys = keys.length;
  if (numkeys > max_keys) {
    keys = keys.slice(0, max_keys);
  }
  for (const key of keys) {
    info(indent,key);
    if (level > max_recurse_level) {
      info(indent,' ... >> not recursing past level',max_recurse_level,'<< ...');
    } else { 
      print(obj[key], level+1);
    }
  }
  if (numkeys > max_keys) {
    info(indent,'...',numkeys,' total keys ...');
  }
}
})();
