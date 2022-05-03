import debug from 'debug';
import { Command } from 'commander';
import { csvToDayTracksJSON, writeToJSON, loadFromJSON } from './load.js';
import 'dotenv/config'; // loads all environment variables found in .env in project root
 
import { writeDaysToOADA } from './oada.js';

const info = debug('trackpatch/cli:info');
const warn = debug('trackpatch/cli:warn');

const program = new Command();
program.name('Track-Patch Command-line Interface');

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
  .description('Write all data to oada at /bookmarks/track-patch/locations/day-index')
  .option('-t, --token <token>', 'Token for OADA', process.env.TOKEN || 'notokenfound')
  .option('-d, --domain <domain>', 'OADA domain', process.env.DOMAIN || 'localhost')
  .option('-s, --start <YYYY-MM-DD>', 'Start putting data from this date forward', '')
  .action(async ({ domain, token, start }) => {
    if (token === 'notokenfound') { 
      warn('WARNING: you did not pass a token');
      throw new Error('ERROR: you did not pass a token in .env or as -t on command line. tooada needs a token');
    }
    info(`Loading data from json...`);
    const days = await loadFromJSON();
    writeDaysToOADA(days, { domain, token, start });
    info(`Done!`);
  });


program.parse();

