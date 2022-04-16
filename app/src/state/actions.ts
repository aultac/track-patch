import { action } from 'mobx';
import { state, ActivityMessage, State } from './state';
import type { DayTracks, GeoJSONAllVehicles } from '../types';
import debug from 'debug';
import { getAccessToken } from '@oada/id-client';

const warn = debug("accounts#actions:warn");
const info = debug("accounts#actions:info");

export const page = action('page', (page: typeof state.page): void  => {
  state.page = page;
});

export const activity = action('activity', (msg: string | string[] | ActivityMessage | ActivityMessage[], type: ActivityMessage['type'] = 'good') => {
  if (!Array.isArray(msg)) {
    msg = [ msg ] as string[] | ActivityMessage[];
  }
  // Make sure evey element is an activity message (convert strings):
  let msgs: ActivityMessage[] = msg.map((m: any) => {
    if (typeof m === 'object' && 'msg' in m && typeof m.msg === 'string') {
      return m as ActivityMessage;
    } else {
      return { msg: m, type} as ActivityMessage;
    }
  });
  info(msgs.map(m=>m.msg).join('\n'));
  state.activityLog = [...state.activityLog, ...msgs ];
});

// These things are too big to store in the mobx state, it locks the browser.
// So we keep them here in memory, and just store a "rev" in the state for the
// components to listen to.
let _days: DayTracks | null = null;
export const days = action('days', (days?: DayTracks): typeof _days | void => {
  if (typeof days === 'undefined') return _days;
  _days = days;
  state.days.rev++;
});

let _geojson: GeoJSONAllVehicles | null = null;
export const geojson = action('geojson', (geojson?: GeoJSONAllVehicles): typeof _geojson | void => {
  if (typeof geojson === 'undefined') return _geojson;
  _geojson = geojson;
  state.geojson.rev++;
});

//--------------------------------------------------------
// OADA functions
// You can make this jwk using oada-certs --create-keys, then copy pem here and lookup the kid from the jwk version
const not_private_at_all_key = {
  "kty":"RSA" as const,
  "kid":"3b4b2f4f3faf41f6b50e3ae0d351496c",
  "e":"AQAB",
  "n":"7JQJwzi7ms6Z1R9Q_OI2cz2Qtokw907HANSv4-TNCNEKAvLy7B-Nl_uG12OOofJBGqa86P61g7i5uMjC1kRoJFw95X9jhJ2fg3Kmemr24jiECHoa0vUokm2l1fnqUJh9ScQGzWnPn9MnIMdR80MRMh4nbEm4m31PmCgvO7RTu6-ATYhO64RiF0lZpZIGsxrVvdDtGschFr53K1U1pXwY1FoctOwP-n5HmcgA3F8YaRiCOoiuYTaLA3BApbuQdRJLh4qP5ZnkNggBDVLY2932bIGLM0ANQi5bZbXoj5B5sqkcLvilariFDA1Vy-CGzKjmH_yXT1BCYIG67z9EOSZXYQ",
  "d":"DojWFrWQFROAehy3W9ey4NV59lmGrK5mQRYreacK2N-a4n-j4JqSzgx_mH6--oCI4LSmdKnLGqGJOTP7yYwONZmqCCBs8CWfOmnSKK8UpcCg-2kzVWa-AyhvPC6H-bDqXsEHRax1u2dX0EaDMcEtShAs6XBzeNTq1rmjAmNgSdxKFlCxgp3flOSunvVeVuXMC5hBBbkw_VQS-Gt0q732SyhL_CXCdgWz2MVe-uy9uYFKKwVWhIH6xrjVGFK613hjR2BDCivlTw-Zb_2w5j7ibnuJA53ZX5WNk1FaZO9783NpNB111Y83WvY3ol9jvYVBGqC2tNjWD3QDv2bWrmhiDw",
  "p":"_nali-dFFRtpcOeH_as8tvKdJM1oNyZmyLBQFHsVpYXByiEzlDF0RS4DqkwAapUNaXxJrHTbM3o-2NULhzF5UWC7rnqgOCzgRab_8oeS0aKXzS7oOibdmH2L_Rc-fMg__7so0jqQcOkdeiK1TJPJU9seGxerCaGVN_4qcbvoltc",
  "q":"7gG-iUY8-NFCMgmtuVHLblvTWYuk1buAqvTsWGjWYMd3RioCvBkIJY0Z8prVQLGmTh4r3yimZRoo8n-ORMpaIlhk60N34t0RTTi8tJ87pVp_m4c5aSvZ6edmmVY0AMoGWvy7daQWvp9NKDmPVUlBPyPHFGwHZ-CV1CPZkF86FIc",
  "dp":"n56hXc8m4ISfcblq7s65eTFbLbjDxMSL-RvQP-itvXTYCQkmp7EV9EdW-T5PjIwPK7pRJKLw1au7PJz3bEi2hzucv2gglNxhmo-VQfeVO3c4rfbcqY2zt3IZnBs2kWOz8aDfjHA8Jve0C-c1vuF9iuKKUghYu-PmDIec7FcpIWU",
  "dq":"vsNHJF_XntaaZ-C6DT8x_lI7JBp5E5YlmuCUTog4y3kUcHhbmMe3b-GYWosfQash0Jr-Lu817vL4vuTd8uT9OWn_-VEqVfs6UtqW5W57MB1JCi9oJJOxJXkDEwO0yq0iSusmlTPfxwmHniYEbCc61JCokAXGKcwoStAxITYyJyE",
  "qi":"diPIsInq9EzrGA3r6pPnqyEQClWnuLSS9A7q1NSsnCRqrcWXmx_GpHwBV8ztnBtW9nNTdGr9XD8FkuwFBr1Ty1_VmYgl6_RarprGSCSkA-DZTJZZalXCgIIeobxtrOIVgH8DcxFexY7HAHHNAN0py3Q8H4_eZ7btE3NsI1Era5Y"
};

export const authorize = action('authorize', async ({token, domain}:{token?: string | null, domain?: string | null} = {}) => {
  if (!domain) {
    state.page = 'get-domain';
    info('No domain or no token, showing login screen');
    return;
  }

  if (!token) {
    state.page = 'login';
    info('Have a domain of ', domain, ', but no token so starting login process');
    const redirect = window.location.origin + '/handleOAuthRedirect.html';
    const results = await getAccessToken(domain, { 
      metadata: { redirect_uris: [ redirect ] },
    }, () => {});
info('auth results = ', results);
  }

  // Otherwise, we can go ahead and connect
  state.oada.domain = domain;
  state.oada.token = token || '';
//  localStorage.setItem('token', token);
//  localStorage.setItem('domain', domain);


});


