import debug from 'debug';

const info = debug('lib/browser#test:info');

type WindowWithLibs = {
  libsundertest: any, // REPLACE ANY WITH LIBRARY TYPE
};

localStorage.debug = '*';

document.addEventListener('DOMContentLoaded', async() => {
  const libsundertest = (window as unknown as WindowWithLibs).libsundertest;

  const root = document.getElementById("root");
  if (!root) {
    console.log('ERROR: did not find root element!');
  } else {
    root.innerHTML = "The test is running!  Check the console."

    try { 

      console.log('You have no browser tests yet, libsundertest = ', libsundertest);

    } catch(e: any) {
      info('FAILED: tests threw exception: ', e);
    }
  }


});
