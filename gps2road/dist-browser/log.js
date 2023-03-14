import debug from 'debug';
const base = 'track-patch/gps2road';
export default {
    get: (namespace) => ({
        error: debug(`${base}#${namespace}:error`),
        warn: debug(`${base}#${namespace}:warn`),
        info: debug(`${base}#${namespace}:info`),
        trace: debug(`${base}#${namespace}:trace`),
    })
};
//# sourceMappingURL=log.js.map