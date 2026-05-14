import { CharacteristicValue as ShelliesCharacteristicValue, Pm1, Pm1AenergyStatus } from 'shellies-ds9';

import { Ability, ServiceClass } from './base.js';

/**
 * Reports power meter readings for a Pm1 component.
 * Similar to PowerMeterAbility but targets the dedicated Pm1 service type
 * used by standalone energy-monitor devices (e.g. Shelly PM Mini Gen3).
 */
export class Pm1Ability extends Ability {
  /**
   * @param component - The Pm1 component to get readings from.
   */
  constructor(readonly component: Pm1) {
    super(`Pm1 ${component.id + 1}`, `Pm1-${component.id}`);
  }

  protected get serviceClass(): ServiceClass {
    return this.customServices.Pm1;
  }

  protected initialize() {
    const s = this.service;
    const c = this.component;
    const cc = this.customCharacteristics;

    this.service.setCharacteristic(this.Characteristic.Name, this.getFriendlyName());

    // setup Current Consumption
    s.setCharacteristic(cc.CurrentConsumption, c.apower ?? 0);
    // set the initial on/off indicator based on whether power is flowing
    s.setCharacteristic(this.Characteristic.On, (c.apower ?? 0) >= 1);

    c.on('change:apower', this.apowerChangeHandler, this);

    // setup Voltage
    if (c.voltage !== undefined) {
      s.setCharacteristic(cc.Voltage, c.voltage);
      c.on('change:voltage', this.voltageChangeHandler, this);
    } else {
      this.removeCharacteristic(cc.Voltage);
    }

    // setup Electric Current
    if (c.current !== undefined) {
      s.setCharacteristic(cc.ElectricCurrent, c.current);
      c.on('change:current', this.currentChangeHandler, this);
    } else {
      this.removeCharacteristic(cc.ElectricCurrent);
    }

    // setup Total Consumption
    if (c.aenergy !== undefined) {
      s.setCharacteristic(cc.TotalConsumption, c.aenergy.total / 1000);
      c.on('change:aenergy', this.aenergyChangeHandler, this);
    } else {
      this.removeCharacteristic(cc.TotalConsumption);
    }
  }

  detach(): void {
    this.component
      .off('change:apower', this.apowerChangeHandler, this)
      .off('change:voltage', this.voltageChangeHandler, this)
      .off('change:current', this.currentChangeHandler, this)
      .off('change:aenergy', this.aenergyChangeHandler, this);
  }

  protected getFriendlyName(): string {
    const label = this.component.config?.name ?? this.platformAccessory.displayName;
    return `PM ${this.sanitizeName(label)}`;
  }

  /**
   * Handles changes to the `apower` property.
   */
  protected apowerChangeHandler(value: ShelliesCharacteristicValue) {
    this.service.updateCharacteristic(this.customCharacteristics.CurrentConsumption, value as number);
    this.service.updateCharacteristic(this.Characteristic.On, typeof value === 'number' && value >= 1);
  }

  /**
   * Handles changes to the `voltage` property.
   */
  protected voltageChangeHandler(value: ShelliesCharacteristicValue) {
    this.service.updateCharacteristic(this.customCharacteristics.Voltage, value as number);
  }

  /**
   * Handles changes to the `current` property.
   */
  protected currentChangeHandler(value: ShelliesCharacteristicValue) {
    this.service.updateCharacteristic(this.customCharacteristics.ElectricCurrent, value as number);
  }

  /**
   * Handles changes to the `aenergy` property.
   */
  protected aenergyChangeHandler(value: ShelliesCharacteristicValue) {
    const attr = value as unknown as Pm1AenergyStatus;

    this.service.updateCharacteristic(this.customCharacteristics.TotalConsumption, attr.total / 1000);
  }
}
