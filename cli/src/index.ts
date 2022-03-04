import { createReadStream } from 'fs';
import { parse } from 'csv-parse';
import debug from 'debug';
import { Command } from 'commander';

const info = debug('indot/cli:info');

const program = new Command();
program.name('INDOT Activity CLI');
  
program.command('summary')
  .description('Generate a summary of the input CSV files')
  .argument('<filepath>', 'path to csv file')
  .action(async (filepath: string) => {

     const records = [];
     // Initialize the parser
     const parser = parse();
     const stream = createReadStream(filepath);
     stream.pipe(parser);
  
     let count = 0;
     for await (const record of parser) {
       records.push(record);
       if (!(count++ % 100)) info('Finished reading record ', records.length);
     }
     info('Have ', records.length, ' records loaded');

  });


program.parse();

