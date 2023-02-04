import log from '../../log.js';
import roadamesTest from '../roadnames.test.js';
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
            info('Roadname tests');
            roadamesTest(libsundertest);
            info('Roadname tests successful');
        }
        catch (e) {
            info('FAILED: tests threw exception: ', e);
        }
    }
});
//# sourceMappingURL=index.js.map