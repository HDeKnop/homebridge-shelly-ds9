import { ShellyPlusI4, ShellyPlusI4V3 } from 'shellies-ds9';

import { DeviceDelegate } from './base.js';
import { ReadonlySwitchAbility, ServiceLabelAbility, StatelessProgrammableSwitchAbility } from '../abilities/index.js';

/**
 * Handles Shelly Plus I4 devices.
 */
export class ShellyPlusI4Delegate extends DeviceDelegate {
  protected setup() {
    const d = this.device as ShellyPlusI4;
    const inputs = [d.input0, d.input1, d.input2, d.input3] as const;
    const isButton = inputs.map((i) => i.config?.type === 'button');

    // create an accessory for all button inputs
    this.createAccessory(
      'buttons',
      null,
      ...inputs.map((input, i) => new StatelessProgrammableSwitchAbility(input).setActive(isButton[i])),
      new ServiceLabelAbility()
    ).setActive(isButton.some(Boolean));

    // create accessories for all switch inputs — use per-input friendly name when set
    inputs.forEach((input, i) => {
      const friendly = input.config?.name;
      const ability = new ReadonlySwitchAbility(input);
      const accessory = friendly
        ? this.createAccessoryWithFullName(`switch${i}`, friendly, ability)
        : this.createAccessory(`switch${i}`, null, ability);
      accessory.setActive(!isButton[i]);
    });
  }
}

DeviceDelegate.registerDelegate(ShellyPlusI4Delegate, ShellyPlusI4, ShellyPlusI4V3);
