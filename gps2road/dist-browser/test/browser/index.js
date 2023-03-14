import log from '../../log.js';
import roadamesTest from '../roadnames.test.js';
import gps2roadTest from '../gps2road.test.js';
const { info, error } = log.get('browser#test');
localStorage.debug = '*';
document.addEventListener('DOMContentLoaded', async () => {
    const libsundertest = window.libsundertest;
    const root = document.getElementById("root");
    if (!root) {
        error('ERROR: did not find root element!');
    }
    else {
        root.innerHTML = "The test is running!  Check the console.";
        try {
            console.log('STARTNG TESTS: should see info statements after this.');
            info('Roadname tests');
            roadamesTest(libsundertest);
            info('gps2road tests');
            await gps2roadTest(libsundertest);
            info('All tests successful');
        }
        catch (e) {
            info('FAILED: tests threw exception: ', e);
            throw e;
        }
    }
});
//# sourceMappingURL=index.js.map