import { ShellyProDimmer2Pm } from 'shellies-ds9';

import { DeviceDelegate } from './base';

/**
 * Handles Shelly Pro Dimmer 2PM devices.
 */
export class ShellyProDimmer2PmDelegate extends DeviceDelegate {
  protected setup() {
    const d = this.device as ShellyProDimmer2Pm;

    this.addLight(d.light0);
    this.addLight(d.light1);
  }
}

DeviceDelegate.registerDelegate(ShellyProDimmer2PmDelegate, ShellyProDimmer2Pm);
