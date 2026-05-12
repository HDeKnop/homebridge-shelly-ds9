import { describe, it, expect } from 'vitest';
import type { Cover } from 'shellies-ds9';

import { CoverAbility } from '../../src/abilities/cover.js';
import { FakeCover } from '../helpers/shelly-stub.js';
import { setupAbility } from '../helpers/ability.js';

const make = (type: 'door' | 'window' | 'windowCovering' = 'window', overrides = {}) => {
  const component = new FakeCover({
    id: 0,
    pos_control: true,
    current_pos: 100,
    target_pos: 100,
    state: 'stopped',
    ...overrides,
  });
  const ability = new CoverAbility(component as unknown as Cover, type);
  const harness = setupAbility(ability);
  return { component, ability, ...harness };
};

describe('CoverAbility — service selection', () => {
  it('uses Service.Window for type=window', () => {
    const { accessory, platform } = make('window');
    expect(accessory.services[0].serviceClass).toBe(platform.api.hap.Service.Window);
  });

  it('uses Service.Door for type=door', () => {
    const { accessory, platform } = make('door');
    expect(accessory.services[0].serviceClass).toBe(platform.api.hap.Service.Door);
  });

  it('uses Service.WindowCovering for type=windowCovering', () => {
    const { accessory, platform } = make('windowCovering');
    expect(accessory.services[0].serviceClass).toBe(platform.api.hap.Service.WindowCovering);
  });
});

describe('CoverAbility — state machine', () => {
  it('reports STOPPED when component state is stopped', () => {
    const { accessory, platform } = make('window', { state: 'stopped' });
    const ps = accessory.services[0].getCharacteristic(platform.api.hap.Characteristic.PositionState);
    expect(ps.value).toBe(platform.api.hap.Characteristic.PositionState.STOPPED);
  });

  it('reports INCREASING when component state is opening', () => {
    const { accessory, platform } = make('window', { state: 'opening' });
    const ps = accessory.services[0].getCharacteristic(platform.api.hap.Characteristic.PositionState);
    expect(ps.value).toBe(platform.api.hap.Characteristic.PositionState.INCREASING);
  });

  it('reports DECREASING when component state is closing', () => {
    const { accessory, platform } = make('window', { state: 'closing' });
    const ps = accessory.services[0].getCharacteristic(platform.api.hap.Characteristic.PositionState);
    expect(ps.value).toBe(platform.api.hap.Characteristic.PositionState.DECREASING);
  });
});

describe('CoverAbility — uncalibrated', () => {
  it('warns and resets to neutral when pos_control is false', () => {
    const { accessory, platform, baseLog } = make('window', { pos_control: false });
    const cp = accessory.services[0].getCharacteristic(platform.api.hap.Characteristic.CurrentPosition);
    const tp = accessory.services[0].getCharacteristic(platform.api.hap.Characteristic.TargetPosition);
    expect(cp.value).toBe(0);
    expect(tp.value).toBe(0);
    expect(baseLog.records.some(r => r.level === 'warn' && r.message.includes('calibrated'))).toBe(true);
  });
});

describe('CoverAbility — targetPositionSetHandler', () => {
  it('forwards to component.goToPosition when value differs', async () => {
    const { accessory, platform, component } = make('window', { current_pos: 100, target_pos: 100 });
    const tp = accessory.services[0].getCharacteristic(platform.api.hap.Characteristic.TargetPosition);
    await tp.onSetHandler!(50);
    expect(component.goToPosition).toHaveBeenCalledWith(50);
  });

  it('is a no-op when target and current both match the requested value', async () => {
    const { accessory, platform, component } = make('window', { current_pos: 100, target_pos: 100 });
    const tp = accessory.services[0].getCharacteristic(platform.api.hap.Characteristic.TargetPosition);
    await tp.onSetHandler!(100);
    expect(component.goToPosition).not.toHaveBeenCalled();
  });

  it('throws SERVICE_COMMUNICATION_FAILURE when device is disconnected', async () => {
    const { accessory, platform, component } = make('window', { connected: false });
    // disconnect
    component.device.rpcHandler.connected = false;
    const tp = accessory.services[0].getCharacteristic(platform.api.hap.Characteristic.TargetPosition);
    await expect(tp.onSetHandler!(50)).rejects.toBe(platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
  });

  it('throws SERVICE_COMMUNICATION_FAILURE on RPC error', async () => {
    const { accessory, platform, component } = make('window');
    component.goToPosition.mockRejectedValueOnce(new Error('rpc fail'));
    const tp = accessory.services[0].getCharacteristic(platform.api.hap.Characteristic.TargetPosition);
    await expect(tp.onSetHandler!(50)).rejects.toBe(platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
  });
});

describe('CoverAbility — change handlers', () => {
  it('stateChangeHandler updates all three characteristics', () => {
    const { accessory, platform, component } = make('window');
    component.state = 'opening';
    component.current_pos = 30;
    component.target_pos = 50;
    component.emit('change:state', 'opening');
    const ps = accessory.services[0].getCharacteristic(platform.api.hap.Characteristic.PositionState);
    const cp = accessory.services[0].getCharacteristic(platform.api.hap.Characteristic.CurrentPosition);
    const tp = accessory.services[0].getCharacteristic(platform.api.hap.Characteristic.TargetPosition);
    expect(ps.value).toBe(platform.api.hap.Characteristic.PositionState.INCREASING);
    expect(cp.value).toBe(30);
    expect(tp.value).toBe(50);
  });
});

describe('CoverAbility — lifecycle', () => {
  it('refreshState is a no-op on uncalibrated covers', () => {
    const { component, ability, accessory, platform } = make('window', { pos_control: false });
    component.current_pos = 80;
    ability.refreshState();
    const cp = accessory.services[0].getCharacteristic(platform.api.hap.Characteristic.CurrentPosition);
    // should still be the reset value
    expect(cp.value).toBe(0);
  });

  it('detach() removes all three listeners', () => {
    const { component, ability } = make('window');
    expect(component.listenerCount('change:state')).toBe(1);
    expect(component.listenerCount('change:current_pos')).toBe(1);
    expect(component.listenerCount('change:target_pos')).toBe(1);
    ability.detach();
    expect(component.listenerCount('change:state')).toBe(0);
    expect(component.listenerCount('change:current_pos')).toBe(0);
    expect(component.listenerCount('change:target_pos')).toBe(0);
  });
});
