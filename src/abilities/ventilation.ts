import { CharacteristicValue } from 'homebridge';
import { CharacteristicValue as ShelliesCharacteristicValue, Light } from 'shellies-ds9';

import { Ability, ServiceClass } from './base.js';

/**
 * Exposes a light component as a fan/ventilation service.
 * Uses the Fanv2 service which is always available in Homebridge 2.0+.
 */
export class VentilationAbility extends Ability {
  /**
   * @param component - The light component to control.
   */
  constructor(readonly component: Light) {
    super(
      `Ventilation ${component.id + 1}`,
      `light-${component.id}`,
    );
  }

  protected get serviceClass(): ServiceClass {
    return this.Service.Fanv2;
  }

  protected initialize() {
    const initialActive = this.component.output
      ? this.Characteristic.Active.ACTIVE
      : this.Characteristic.Active.INACTIVE;
    const initialSpeed = typeof this.component.brightness === 'number' ? this.component.brightness : 0;

    this.service.setCharacteristic(this.Characteristic.Active, initialActive);
    this.service.setCharacteristic(this.Characteristic.RotationSpeed, initialSpeed);

    this.service.getCharacteristic(this.Characteristic.Active)
      .onSet(this.onActiveSetHandler.bind(this));

    this.service.getCharacteristic(this.Characteristic.RotationSpeed)
      .setProps({ minValue: 0, maxValue: 100, minStep: 1 })
      .onSet(this.onRotationSpeedSetHandler.bind(this));

    this.component.on('change:output', this.outputChangeHandler, this);
    this.component.on('change:brightness', this.brightnessChangeHandler, this);
  }

  detach(): void {
    this.component.off('change:output', this.outputChangeHandler, this);
    this.component.off('change:brightness', this.brightnessChangeHandler, this);
  }

  /**
   * Handles changes to the fan Active characteristic.
   */
  protected async onActiveSetHandler(value: CharacteristicValue) {
    const isActive = value === this.Characteristic.Active.ACTIVE || value === true || value === 1;

    if (isActive === this.component.output) {
      return;
    }

    try {
      await this.component.set(isActive);
    } catch (e) {
      this.log.error(
        'Failed to set ventilation state:',
        e instanceof Error ? e.message : e,
      );
      throw this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE;
    }
  }

  /**
   * Handles changes to the fan RotationSpeed characteristic.
   */
  protected async onRotationSpeedSetHandler(value: CharacteristicValue) {
    const speed = Math.max(0, Math.min(100, Number(value)));

    if (Number.isNaN(speed) || speed === this.component.brightness) {
      return;
    }

    try {
      if (speed <= 0) {
        await this.component.set(false);
      } else {
        await this.component.set(true, speed);
      }
    } catch (e) {
      this.log.error(
        'Failed to set ventilation speed:',
        e instanceof Error ? e.message : e,
      );
      throw this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE;
    }
  }

  /**
   * Handles changes to the `output` property.
   */
  protected outputChangeHandler(value: ShelliesCharacteristicValue) {
    const isActive = value === true || value === 1;
    this.log.info(`Ventilation Status(${this.component.id}): ${isActive ? 'on' : 'off'}`);

    this.service.getCharacteristic(this.Characteristic.Active)
      .updateValue(isActive ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE);
  }

  /**
   * Handles changes to the `brightness` property.
   */
  protected brightnessChangeHandler(value: ShelliesCharacteristicValue) {
    const speed = typeof value === 'number' ? value : 0;
    this.log.info(`Ventilation Speed(${this.component.id}): ${speed}`);

    this.service.getCharacteristic(this.Characteristic.RotationSpeed)
      .updateValue(speed);

    const active = speed > 0 || this.component.output;
    this.service.getCharacteristic(this.Characteristic.Active)
      .updateValue(active ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE);
  }
}
