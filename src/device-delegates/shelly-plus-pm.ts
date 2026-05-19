import { ShellyPlusPmMini, ShellyPlusPmMiniV3 } from 'shellies-ds9';

import { DeviceDelegate } from './base.js';

import { Pm1Ability } from '../abilities/index.js';

/**
 * Handles Shelly Plus 1PM devices.
 */
export class ShellyPlusPmDelegate extends DeviceDelegate {
  protected setup() {
    const d = this.device as ShellyPlusPmMini;
    const friendly = d.pm1.config?.name;
    const ability = new Pm1Ability(d.pm1);

    if (friendly) {
      this.createAccessoryWithFullName('switch', friendly, ability);
    } else {
      this.createAccessory('switch', null, ability);
    }
  }
}

DeviceDelegate.registerDelegate(ShellyPlusPmDelegate, ShellyPlusPmMini, ShellyPlusPmMiniV3);
