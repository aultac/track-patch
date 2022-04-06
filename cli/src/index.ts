import debug from 'debug';
import { Command } from 'commander';
import { csvToDayTracksJSON, writeToJSON, loadFromJSON } from './load.js';
//import { writeDaysToOADA } from './oada.ts';

const info = debug('indot/cli:info');
const warn = debug('indot/cli:warn');

const domain = 'localhost';
const token = '';

const program = new Command();
program.name('INDOT Activity CLI');

program.command('tojson')
  .description('Create ./data.json from given csv file')
  .argument('<filepath>', 'path to csv file')
  .action(async (filepath: string) => { 
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
    for (const [day, vdtracks] of Object.entries(days)) {
      info('Day: ', day);
      info('    # Vehicles with tracks: ', Object.keys(vdtracks).length);
       for (const [vid, vdt] of Object.entries(vdtracks)) {
         for (const [starttime, track] of Object.entries(vdt.tracks)) {
           const times = Object.keys(track);
           info(`        ${vid}: ${Object.keys(track).length} points`);
         }
       }
      info('----------------------------------');
    }

  });

program.command('tooada')
  .description('Write all data to oada at /bookmarks/indot-activity/locations/day-index')
  .option('-t, --token <token>', 'Token for OADA')
  .option('-d, --domain <domain>', 'OADA domain', 'localhost')
  .action(async (/*{ domain, token }*/) => {
    info(`Loading data from json...`);
    const days = loadFromJSON();
    info(`Writing to OADA NOT YET COMPLETED...`);
//    writeDaysToOADA(days, { domain, token });
//    info(`Done!`);
  });


program.parse();

