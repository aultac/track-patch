import { createReadStream } from 'fs';
import jsonstream from 'jsonstream';
import es from 'event-stream';

export async function geo2csv({file}: { file: string }) {
  const stream = createReadStream(file, 'utf8');

  const properties: { [key: string]: string }[] = await new Promise((resolve) => {
    const props: {[key: string]: string}[] = [];
    stream
      .pipe(jsonstream.parse('features.*.properties'))
      .pipe(es.mapSync((data: { [key: string]: string }) => {
        props.push(data);
      }));
    stream.on('end', () => resolve(props));
  });

  console.error('Have ', properties.length, 'properties, outputting to csv');

  // Grab all the headers:
  const headers_obj: { [key: string]: true } = {};
  for (const f of properties) {
    for (const k of Object.keys(f)) {
      headers_obj[k] = true;
    }
  }
  const headers = Object.keys(headers_obj).sort();

  // Sort lines by st_full to find some patterns
  properties.sort((a,b) => ((a.st_full as string) || '').localeCompare((b.st_full as string) || ''));

  console.log(headers.join(","));
  for (const [index, f] of properties.entries()) {
    if (index % 10000 === 0) console.error('On row',index,'of',properties.length);
    const vals: string[] = [];
    for (const k of headers) {
      vals.push(f[k] || '');
    }
    console.log(vals.join(','));
  }

  console.error('DONE!');

  return;
}
