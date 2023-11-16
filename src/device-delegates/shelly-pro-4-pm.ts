import { ShellyPro4Pm } from 'shellies-ds9';

import { DeviceDelegate } from './base';

/**
 * Handles Shelly Pro 4PM devices.
 */
export class ShellyPro4PmDelegate extends DeviceDelegate {
  protected setup() {
    const d = this.device as ShellyPro4Pm;

    this.addSwitch(d.switch0);
    this.addSwitch(d.switch1);
    this.addSwitch(d.switch2);
    this.addSwitch(d.switch3);
  }
}

DeviceDelegate.registerDelegate(ShellyPro4PmDelegate, ShellyPro4Pm);
