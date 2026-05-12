import { describe, it, expect } from 'vitest';
import type { Light } from 'shellies-ds9';

import { LightAbility } from '../../src/abilities/light.js';
import { FakeLight } from '../helpers/shelly-stub.js';
import { setupAbility } from '../helpers/ability.js';

const make = (overrides = {}) => {
  const component = new FakeLight({ id: 0, output: false, brightness: 50, ...overrides });
  const ability = new LightAbility(component as unknown as Light);
  const harness = setupAbility(ability);
  return { component, ability, ...harness };
};

describe('LightAbility', () => {
  it('adds a Lightbulb service with initial On value', () => {
    const { accessory, platform } = make({ output: true });
    const svc = accessory.services[0];
    expect(svc.serviceClass).toBe(platform.api.hap.Service.Lightbulb);
    expect(svc.getCharacteristic(platform.api.hap.Characteristic.On).value).toBe(true);
  });

  it('brightnessSetHandler forwards to component.set(undefined, brightness)', async () => {
    const { accessory, platform, component } = make({ brightness: 50 });
    const br = accessory.services[0].getCharacteristic(platform.api.hap.Characteristic.Brightness);
    await br.onSetHandler!(75);
    expect(component.set).toHaveBeenCalledWith(undefined, 75);
  });

  it('brightnessSetHandler is a no-op when value equals current', async () => {
    const { accessory, platform, component } = make({ brightness: 50 });
    const br = accessory.services[0].getCharacteristic(platform.api.hap.Characteristic.Brightness);
    await br.onSetHandler!(50);
    expect(component.set).not.toHaveBeenCalled();
  });

  it('brightnessGetHandler returns current component brightness', () => {
    const { accessory, platform } = make({ brightness: 33 });
    const br = accessory.services[0].getCharacteristic(platform.api.hap.Characteristic.Brightness);
    expect(br.onGetHandler!()).toBe(33);
  });

  it('brightnessChangeHandler updates HK Brightness', () => {
    const { accessory, platform, component } = make({ brightness: 10 });
    const br = accessory.services[0].getCharacteristic(platform.api.hap.Characteristic.Brightness);
    component.emit('change:brightness', 80);
    expect(br.value).toBe(80);
  });

  it('refreshState updates both On and Brightness', () => {
    const { accessory, platform, component, ability } = make({ output: false, brightness: 10 });
    component.output = true;
    component.brightness = 90;
    ability.refreshState();
    const on = accessory.services[0].getCharacteristic(platform.api.hap.Characteristic.On);
    const br = accessory.services[0].getCharacteristic(platform.api.hap.Characteristic.Brightness);
    expect(on.value).toBe(true);
    expect(br.value).toBe(90);
  });

  it('detach() removes both listeners', () => {
    const { component, ability } = make();
    expect(component.listenerCount('change:output')).toBe(1);
    expect(component.listenerCount('change:brightness')).toBe(1);
    ability.detach();
    expect(component.listenerCount('change:output')).toBe(0);
    expect(component.listenerCount('change:brightness')).toBe(0);
  });

  it('brightnessSetHandler throws on RPC error', async () => {
    const { accessory, platform, component } = make({ brightness: 10 });
    component.set.mockRejectedValueOnce(new Error('failed'));
    const br = accessory.services[0].getCharacteristic(platform.api.hap.Characteristic.Brightness);
    await expect(br.onSetHandler!(50)).rejects.toBe(platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
  });
});
