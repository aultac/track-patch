import debug from 'debug';
import oerror from '@overleaf/o-error';
import pMap from 'p-map';
import { tree, DayTracks } from '@track-patch/lib';
import { connect } from '@oada/client';


const info = debug('@track-patch/cli#oada:info');
const warn = debug('@track-patch/cli#oada:info');

export async function writeDaysToOADA(days: DayTracks, { domain, token, start }: { domain: string, token: string, start: string }): Promise<void> {

  let oada: Awaited<ReturnType<typeof connect>>;
  try {
    oada = await connect({ domain, token });
  } catch(e: any) {
    warn('WARNING: could not connect to OADA, error was: ', e);
    throw oerror.tag(e, 'Could not connect to OADA.');
  }
  info('Connected to OADA at ', domain);

  let count = 0;
  const keys = Object.keys(days);
  await pMap(Object.entries(days), async ([day, vehicles]) =>  {
    if (start) {
      if (day < start) {
        info('Skipping date ', day, ' because it is before start date of ', start);
        return;
      }
    }
    const starttime = +(new Date());
    const thisone = count++;
    const path = `/bookmarks/track-patch/locations/day-index/${day}`;
    info('Starting '+thisone+' of ', keys.length, ': ', day);
    try {
      await oada.put({
        path,
        data: vehicles,
        tree
      });
    } catch(e: any) {
      info('ERROR: OADA failed to put to path ' , path, '.  Error was: ', e);
      throw oerror.tag(e, 'Failed to put to path '+path);
    }
    info(day, ': Finished ', thisone, ' of ', keys.length, ' in ', +(new Date()) - starttime, ' ms');
  }, { concurrency: 1 });

  info('Finished uploading ', keys.length, ' days of data to OADA');
}
