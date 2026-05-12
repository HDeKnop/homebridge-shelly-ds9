import { describe, it, expect } from 'vitest';
import type { Light } from 'shellies-ds9';

import { VentilationAbility } from '../../src/abilities/ventilation.js';
import { FakeLight } from '../helpers/shelly-stub.js';
import { setupAbility } from '../helpers/ability.js';

const make = (overrides = {}) => {
  const component = new FakeLight({ id: 0, output: false, brightness: 0, ...overrides });
  const ability = new VentilationAbility(component as unknown as Light);
  const harness = setupAbility(ability);
  return { component, ability, ...harness };
};

describe('VentilationAbility', () => {
  it('uses Fanv2 service (not Fan, no shim)', () => {
    const { accessory, platform } = make();
    expect(accessory.services[0].serviceClass).toBe(platform.api.hap.Service.Fanv2);
  });

  it('initial Active is INACTIVE when output false', () => {
    const { accessory, platform } = make({ output: false });
    const active = accessory.services[0].getCharacteristic(platform.api.hap.Characteristic.Active);
    expect(active.value).toBe(platform.api.hap.Characteristic.Active.INACTIVE);
  });

  it('initial Active is ACTIVE when output true', () => {
    const { accessory, platform } = make({ output: true });
    const active = accessory.services[0].getCharacteristic(platform.api.hap.Characteristic.Active);
    expect(active.value).toBe(platform.api.hap.Characteristic.Active.ACTIVE);
  });

  it('onActiveSetHandler maps ACTIVE → component.set(true)', async () => {
    const { accessory, platform, component } = make({ output: false });
    const active = accessory.services[0].getCharacteristic(platform.api.hap.Characteristic.Active);
    await active.onSetHandler!(platform.api.hap.Characteristic.Active.ACTIVE);
    expect(component.set).toHaveBeenCalledWith(true);
  });

  it('onActiveSetHandler maps INACTIVE → component.set(false)', async () => {
    const { accessory, platform, component } = make({ output: true });
    const active = accessory.services[0].getCharacteristic(platform.api.hap.Characteristic.Active);
    await active.onSetHandler!(platform.api.hap.Characteristic.Active.INACTIVE);
    expect(component.set).toHaveBeenCalledWith(false);
  });

  it('onRotationSpeedSetHandler with speed > 0 calls set(true, speed)', async () => {
    const { accessory, platform, component } = make({ brightness: 0 });
    const speed = accessory.services[0].getCharacteristic(platform.api.hap.Characteristic.RotationSpeed);
    await speed.onSetHandler!(50);
    expect(component.set).toHaveBeenCalledWith(true, 50);
  });

  it('onRotationSpeedSetHandler with speed <= 0 calls set(false)', async () => {
    const { accessory, platform, component } = make({ brightness: 50 });
    const speed = accessory.services[0].getCharacteristic(platform.api.hap.Characteristic.RotationSpeed);
    await speed.onSetHandler!(0);
    expect(component.set).toHaveBeenCalledWith(false);
  });

  it('outputChangeHandler reflects ACTIVE state from boolean', () => {
    const { accessory, platform, component } = make({ output: false });
    const active = accessory.services[0].getCharacteristic(platform.api.hap.Characteristic.Active);
    component.emit('change:output', true);
    expect(active.value).toBe(platform.api.hap.Characteristic.Active.ACTIVE);
  });

  it('detach() removes both listeners', () => {
    const { component, ability } = make();
    expect(component.listenerCount('change:output')).toBe(1);
    expect(component.listenerCount('change:brightness')).toBe(1);
    ability.detach();
    expect(component.listenerCount('change:output')).toBe(0);
    expect(component.listenerCount('change:brightness')).toBe(0);
  });
});
