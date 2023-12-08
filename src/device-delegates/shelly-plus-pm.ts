import { ShellyPlusPmMini } from "shellies-ds9";

import { DeviceDelegate } from "./base";

import { Pm1Ability } from "../abilities";
import { PlatformAccessory } from "homebridge";

/**
 * Handles Shelly Plus 1PM devices.
 */
export class ShellyPlusPmDelegate extends DeviceDelegate {
  protected setup() {
    const d = this.device as ShellyPlusPmMini;

   var accessoryPm1 = this.createAccessory("switch", this.device.id, new Pm1Ability(d.pm1));
   const platformAccessoryPm1 = accessoryPm1.platformAccessory as PlatformAccessory;
    // unregister the platform accessory
    this.platform.removeAccessory(platformAccessoryPm1);
  
  }
}

DeviceDelegate.registerDelegate(ShellyPlusPmDelegate, ShellyPlusPmMini);
