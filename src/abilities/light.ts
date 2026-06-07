import { CharacteristicValue } from 'homebridge';
import { CharacteristicValue as ShelliesCharacteristicValue, Light } from 'shellies-ds9';

import { Ability, ServiceClass } from './base.js';

export class LightAbility extends Ability {
  /**
   * Flag to track if the ability is fully initialized and active.
   * Prevents refreshState() (called from handleConnect on reconnect) from
   * accessing this.service before setup() has completed.
   */
  private _isInitialized = false;

  /**
   * @param component - The light component to control.
   */
  constructor(readonly component: Light) {
    super(`Light ${component.id + 1}`, `light-${component.id}`);
  }

  protected get serviceClass(): ServiceClass {
    return this.Service.Lightbulb;
  }

  protected getFriendlyName(): string {
    return this.sanitizeName(this.component.config?.name ?? this.platformAccessory.displayName);
  }

  protected initialize() {
    this.service.setCharacteristic(this.Characteristic.Name, this.getFriendlyName());

    // set the initial value
    this.service.setCharacteristic(this.Characteristic.On, this.component.output);

    // listen for commands from HomeKit
    this.service.getCharacteristic(this.Characteristic.On).onSet(this.onSetHandler.bind(this)).onGet(this.onGetHandler.bind(this));
    this.service
      .getCharacteristic(this.Characteristic.Brightness)
      .onSet(this.brightnessSetHandler.bind(this))
      .onGet(this.brightnessGetHandler.bind(this));

    // listen for updates from the device
    this.component.on('change:output', this.outputChangeHandler, this);
    this.component.on('change:brightness', this.brightnessChangeHandler, this);

    // mark as initialized after all setup is complete
    this._isInitialized = true;
  }

  detach() {
    // mark as no longer initialized to prevent race with refreshState/event handlers
    this._isInitialized = false;

    this.component.off('change:output', this.outputChangeHandler, this);
    this.component.off('change:brightness', this.brightnessChangeHandler, this);
  }

  refreshState() {
    if (!this._isInitialized) {
      return;
    }
    this.service.getCharacteristic(this.Characteristic.On).updateValue(this.component.output);
    this.service.getCharacteristic(this.Characteristic.Brightness).updateValue(this.component.brightness);
  }

  /**
   * Handles changes to the Light.On characteristic.
   */
  protected async onSetHandler(value: CharacteristicValue) {
    if (value === this.component.output) {
      return;
    }

    try {
      await this.component.set(value as boolean);
    } catch (e) {
      this.log.error('Failed to set light:', e instanceof Error ? e.message : e);
      throw this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE;
    }
  }

  /**
   * Handles requests for the current value of the Light.On characteristic.
   */
  protected onGetHandler(): CharacteristicValue {
    return this.component.output;
  }

  /**
   * Handles changes to the `output` property.
   */
  protected outputChangeHandler(value: ShelliesCharacteristicValue) {
    this.log.info(`Light Status(${this.component.id}): ${value ? 'on' : 'off'}`);
    this.service.getCharacteristic(this.Characteristic.On).updateValue(value as boolean);
  }

  /**
   * Handles changes to the Light.Brightness characteristic.
   */
  protected async brightnessSetHandler(value: CharacteristicValue) {
    if (value === this.component.brightness) {
      return;
    }

    try {
      await this.component.set(undefined, value as number);
    } catch (e) {
      this.log.error('Failed to set light:', e instanceof Error ? e.message : e);
      throw this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE;
    }
  }

  /**
   * Handles requests for the current value of the Light.Brightness characteristic.
   */
  protected brightnessGetHandler(): CharacteristicValue {
    return this.component.brightness;
  }

  /**
   * Handles changes to the `brightness` property.
   */
  protected brightnessChangeHandler(value: ShelliesCharacteristicValue) {
    this.log.info(`Light Brightness(${this.component.id}): ${value}`);
    this.service.getCharacteristic(this.Characteristic.Brightness).updateValue(value as number);
  }
}
