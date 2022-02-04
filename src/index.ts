import debug from 'debug';
import { connect } from '@oada/client';

const info = debug('index:info');

const oada = await connect({ domain: 'https://localhost:443', token: '765fbf8e446749eea3d975392b7da802' });

info('Hello world, s = ', oada);


