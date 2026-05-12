import { CharacteristicValue } from 'homebridge';
import { CharacteristicValue as ShelliesCharacteristicValue, Light } from 'shellies-ds9';

import { Ability, ServiceClass } from './base.js';

/**
 * Exposes a light component as a fan/ventilation service.
 */
export class VentilationAbility extends Ability {
  private get isFanV2(): boolean {
    return this.Service.Fanv2 !== undefined;
  }

  private get activeCharacteristic() {
    return this.isFanV2 ? this.Characteristic.Active : this.Characteristic.On;
  }

  private get activeOnValue(): CharacteristicValue {
    return this.isFanV2 ? this.Characteristic.Active.ACTIVE : true;
  }

  private get activeOffValue(): CharacteristicValue {
    return this.isFanV2 ? this.Characteristic.Active.INACTIVE : false;
  }

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
    return (this.Service.Fanv2 ?? this.Service.Fan) as ServiceClass;
  }

  protected initialize() {
    const initialActive = this.component.output ? this.activeOnValue : this.activeOffValue;
    const initialSpeed = typeof this.component.brightness === 'number' ? this.component.brightness : 0;

    this.service.setCharacteristic(this.activeCharacteristic, initialActive);
    this.service.setCharacteristic(this.Characteristic.RotationSpeed, initialSpeed);

    this.service.getCharacteristic(this.activeCharacteristic)
      .onSet(this.onActiveSetHandler.bind(this));

    this.service.getCharacteristic(this.Characteristic.RotationSpeed)
      .setProps({ minValue: 0, maxValue: 100, minStep: 1 })
      .onSet(this.onRotationSpeedSetHandler.bind(this));

    this.component.on('change:output', this.outputChangeHandler, this);
    this.component.on('change:brightness', this.brightnessChangeHandler, this);
  }

  detach() {
    this.component.off('change:output', this.outputChangeHandler, this);
    this.component.off('change:brightness', this.brightnessChangeHandler, this);
  }

  /**
   * Handles changes to the fan Active characteristic.
   */
  protected async onActiveSetHandler(value: CharacteristicValue) {
    const isActive = this.isFanV2
      ? value === this.Characteristic.Active.ACTIVE || value === true || value === 1
      : value === true || value === 1;

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

    const characteristicValue = isActive ? this.activeOnValue : this.activeOffValue;
    this.service.getCharacteristic(this.activeCharacteristic)
      .updateValue(characteristicValue);
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
    this.service.getCharacteristic(this.activeCharacteristic)
      .updateValue(active ? this.activeOnValue : this.activeOffValue);
  }
}
