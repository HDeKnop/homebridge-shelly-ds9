import { describe, it, expect } from 'vitest';
import type { Switch } from 'shellies-ds9';

import { OutletAbility } from '../../src/abilities/outlet.js';
import { FakeSwitch } from '../helpers/shelly-stub.js';
import { setupAbility } from '../helpers/ability.js';

const make = (overrides = {}) => {
  const component = new FakeSwitch({ id: 0, output: false, ...overrides });
  const ability = new OutletAbility(component as unknown as Switch);
  const harness = setupAbility(ability);
  return { component, ability, ...harness };
};

describe('OutletAbility', () => {
  it('adds an Outlet service with initial On + OutletInUse', () => {
    const { accessory, platform } = make({ output: true, apower: 12.5 });
    const svc = accessory.services[0];
    expect(svc.serviceClass).toBe(platform.api.hap.Service.Outlet);
    expect(svc.getCharacteristic(platform.api.hap.Characteristic.On).value).toBe(true);
    expect(svc.getCharacteristic(platform.api.hap.Characteristic.OutletInUse).value).toBe(true);
  });

  it('OutletInUse is false when apower is undefined', () => {
    const { accessory, platform } = make({ apower: undefined });
    const ouu = accessory.services[0].getCharacteristic(platform.api.hap.Characteristic.OutletInUse);
    expect(ouu.value).toBe(false);
  });

  it('OutletInUse is false when apower is exactly 0', () => {
    const { accessory, platform } = make({ apower: 0 });
    const ouu = accessory.services[0].getCharacteristic(platform.api.hap.Characteristic.OutletInUse);
    expect(ouu.value).toBe(false);
  });

  it('apowerChangeHandler updates OutletInUse', () => {
    const { accessory, platform, component } = make({ apower: 0 });
    const ouu = accessory.services[0].getCharacteristic(platform.api.hap.Characteristic.OutletInUse);
    component.emit('change:apower', 15);
    expect(ouu.value).toBe(15);
  });

  it('refreshState() recomputes both On and OutletInUse', () => {
    const { accessory, platform, component, ability } = make({ output: false, apower: 0 });
    component.output = true;
    component.apower = 5;
    ability.refreshState();
    const on = accessory.services[0].getCharacteristic(platform.api.hap.Characteristic.On);
    const ouu = accessory.services[0].getCharacteristic(platform.api.hap.Characteristic.OutletInUse);
    expect(on.value).toBe(true);
    expect(ouu.value).toBe(true);
  });

  it('onSetHandler throws on RPC error', async () => {
    const { accessory, platform, component } = make({ output: false });
    component.set.mockRejectedValueOnce(new Error('nope'));
    const on = accessory.services[0].getCharacteristic(platform.api.hap.Characteristic.On);
    await expect(on.onSetHandler!(true)).rejects.toBe(platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
  });

  it('detach() removes both listeners', () => {
    const { component, ability } = make();
    expect(component.listenerCount('change:output')).toBe(1);
    expect(component.listenerCount('change:apower')).toBe(1);
    ability.detach();
    expect(component.listenerCount('change:output')).toBe(0);
    expect(component.listenerCount('change:apower')).toBe(0);
  });
});
