import {
  ShellyPlusPmMini
} from 'shellies-ds9';

import { DeviceDelegate } from './base';

import {
  Pm1Ability,
} from '../abilities';


/**
 * Handles Shelly Plus 1PM devices.
 */
export class ShellyPlusPmDelegate extends DeviceDelegate {
  protected setup() {
    const d = this.device as ShellyPlusPmMini;
    
    this.createAccessory('switch', this.device.id, new Pm1Ability(d.pm1)).setActive(true);
  }
}

DeviceDelegate.registerDelegate(
  ShellyPlusPmDelegate,
  ShellyPlusPmMini
);
