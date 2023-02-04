import debug from 'debug';

const base = 'track-patch';
export default {
  get: (namespace: string) => ({
    error: debug(`${base}/${namespace}:error`),
    warn: debug(`${base}/${namespace}:warn`),
    info: debug(`${base}/${namespace}:info`),
    trace: debug(`${base}/${namespace}:trace`),
  })
};
