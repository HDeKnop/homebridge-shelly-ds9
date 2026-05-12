import { describe, it, expect } from 'vitest';
import type { Switch } from 'shellies-ds9';

import { SwitchAbility } from '../../src/abilities/switch.js';
import { FakeSwitch } from '../helpers/shelly-stub.js';
import { setupAbility } from '../helpers/ability.js';

const make = (overrides = {}) => {
  const component = new FakeSwitch({ id: 0, output: false, ...overrides });
  const ability = new SwitchAbility(component as unknown as Switch);
  const harness = setupAbility(ability);
  return { component, ability, ...harness };
};

describe('SwitchAbility', () => {
  it('adds a Switch service with the initial On value', () => {
    const { accessory, platform, component } = make({ output: true });
    const svc = accessory.services[0];
    expect(svc.serviceClass).toBe(platform.api.hap.Service.Switch);
    expect(svc.getCharacteristic(platform.api.hap.Characteristic.On).value).toBe(true);
    expect(component.listenerCount('change:output')).toBe(1);
  });

  it('uses sanitized component config name when present', () => {
    const { accessory, platform } = make({ name: 'Kitchen-Light' });
    const svc = accessory.services[0];
    expect(svc.getCharacteristic(platform.api.hap.Characteristic.Name).value).toBe('Kitchen Light');
  });

  it('outputChangeHandler updates the HK On characteristic', () => {
    const { accessory, platform, component } = make();
    const on = accessory.services[0].getCharacteristic(platform.api.hap.Characteristic.On);
    component.emit('change:output', true);
    expect(on.value).toBe(true);
    component.emit('change:output', false);
    expect(on.value).toBe(false);
  });

  it('onGetHandler returns the current component output', () => {
    const { accessory, platform } = make({ output: true });
    const on = accessory.services[0].getCharacteristic(platform.api.hap.Characteristic.On);
    expect(on.onGetHandler!()).toBe(true);
  });

  it('onSetHandler forwards to component.set when value differs', async () => {
    const { accessory, platform, component } = make({ output: false });
    const on = accessory.services[0].getCharacteristic(platform.api.hap.Characteristic.On);
    await on.onSetHandler!(true);
    expect(component.set).toHaveBeenCalledWith(true);
  });

  it('onSetHandler is a no-op when value equals current output', async () => {
    const { accessory, platform, component } = make({ output: true });
    const on = accessory.services[0].getCharacteristic(platform.api.hap.Characteristic.On);
    await on.onSetHandler!(true);
    expect(component.set).not.toHaveBeenCalled();
  });

  it('onSetHandler throws HAPStatus.SERVICE_COMMUNICATION_FAILURE on component error', async () => {
    const { accessory, platform, component } = make({ output: false });
    component.set.mockRejectedValueOnce(new Error('RPC failed'));
    const on = accessory.services[0].getCharacteristic(platform.api.hap.Characteristic.On);
    await expect(on.onSetHandler!(true)).rejects.toBe(platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
  });

  it('refreshState updates HK characteristic to current component output', () => {
    const { accessory, platform, component, ability } = make({ output: false });
    component.output = true;
    ability.refreshState();
    const on = accessory.services[0].getCharacteristic(platform.api.hap.Characteristic.On);
    expect(on.value).toBe(true);
  });

  it('detach() removes the change:output listener', () => {
    const { component, ability } = make();
    expect(component.listenerCount('change:output')).toBe(1);
    ability.detach();
    expect(component.listenerCount('change:output')).toBe(0);
  });
});
