import debug from 'debug';
import { Command } from 'commander';
import { csvToDayTracksJSON, loadFromJSON } from './load.js';

const info = debug('indot/cli:info');
const warn = debug('indot/cli:warn');

const domain = 'localhost';
const token = '';

const program = new Command();
program.name('INDOT Activity CLI');

program.command('tojson')
  .description('Create ./data.json from given csv file')
  .argument('<filepath>', 'path to csv file')
  .action(async (filepath: string) => { csvToDayTracksJSON(filepath) });


program.command('summary')
  .description('Generate a summary of data.json')
  .action(async () => {
    info(`Loading data from json...`);
    const days = await loadFromJSON();

    info('****************************************************************');
    info('  Summary: ');
    info('****************************************************************');
    for (const [day, vdtracks] of Object.entries(days)) {
      info('Day: ', day);
      info('    # Vehicles with tracks: ', Object.keys(vdtracks).length);
       for (const [vid, vdt] of Object.entries(vdtracks)) {
         for (const [starttime, track] of Object.entries(vdt.tracks)) {
           const times = Object.keys(track);
           if (times.length > 4) {
             info(`        ${vid}: ${Object.keys(track).length} points`);
           }
         }
       }
      info('----------------------------------');
    }

  });


program.parse();

