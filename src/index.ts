import { API } from 'homebridge';

import { PLATFORM_NAME, ShellyPlatform } from './platform.js';

export default (api: API) => {
  api.registerPlatform(PLATFORM_NAME, ShellyPlatform);
};
