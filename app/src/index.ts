import debug from 'debug';
import { connect } from '@oada/client';
import oerror from '@overleaf/o-error';

// Next week we'll start on using jobs

const info = debug('index:info');
const error = debug('index:error');

const tree = {
  bookmarks: {
    _type: 'application/vnd.oada.bookmarks.1+json',
    indot_activity: {
      _type: 'application/vnd.oats.indot_activity.1+json',
      hello: {}
    }
  }
}

const oada = await connect({ domain: 'https://localhost:443', token: '765fbf8e446749eea3d975392b7da802' });

info('Hello world');
try { 

  // Ensure our main watch path exists
  const path = `/bookmarks/indot_activity`;
  await oada.head({ path }).catch((e) => {
    if (e.status === 404) {
      return oada.put({ path, data: { }, tree });
    } 
    throw oerror.tag(e, `Failed to ensure that path ${path} exists`)
  });

  const { changes } = await oada.watch({ path });
  (async () => {
    for await (const change of changes) {
      info('Received a change!  it is: ', change);
    }
  })();

  info('Now we can do something else...');

} catch(e: any) {
  oerror.tag(e, 'ERROR: something failed....');
  error('Uncaught error: ', e);
}
