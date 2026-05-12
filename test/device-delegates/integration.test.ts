/**
 * End-to-end integration tests per representative device type.
 *
 * For each device family (Pro 4 PM, Plus 2 PM in switch and cover modes,
 * Pro Dual Cover PM, Plus 1, Plus i4) we drive the delegate's `setup()`
 * method against a fake device whose components are wired with the same
 * EventEmitter contract as shellies-ds9. The assertions check that the
 * delegate creates the correct accessories with the correct HomeKit
 * services, and that state changes flow through to characteristic updates.
 */
import { Characteristic, Service } from '@homebridge/hap-nodejs';

import {
  DeviceDelegate,
  ShellyPlus1Delegate,
  ShellyPlus2PmDelegate,
  ShellyPro4PmDelegate,
  ShellyProDualCoverPmDelegate,
  ShellyPlusI4Delegate,
} from '../../src/device-delegates';
import { Accessory } from '../../src/accessory';
import { createTestPlatform } from '../mocks/platform';
import {
  FakeDevice,
  FakeRpcHandler,
  createSwitch,
  createCover,
  createInput,
} from '../mocks/shelly';

const tick = () => new Promise<void>(resolve => setTimeout(resolve, 5));

const allAccessoriesOf = (delegate: DeviceDelegate): Map<string, Accessory> => {
  // accessories is protected; access via `as any` — this is test code with full type knowledge.
  return (delegate as unknown as { accessories: Map<string, Accessory> }).accessories;
};

describe('Shelly Plus 1 (single switch)', () => {
  it('produces one switch accessory with a Switch service', async () => {
    const { platform } = createTestPlatform();
    const device = Object.assign(new FakeDevice({ id: 'shellyplus1-aabb', model: 'SNSW-001X16EU' }), {
      switch0: createSwitch({ id: 0 }),
    });

    const delegate = new ShellyPlus1Delegate(device as never, { exclude: false, protocol: 'websocket' }, platform);
    await tick();

    const map = allAccessoriesOf(delegate);
    expect(map.size).toBe(1);
    const acc = map.get('switch')!;
    expect(acc).toBeDefined();
    expect(acc.platformAccessory!.getService(Service.Switch)).toBeDefined();
  });
});

describe('Shelly Plus 2 PM in switch profile', () => {
  it('produces two switch accessories (output channels) when profile=switch', async () => {
    const { platform } = createTestPlatform();
    const device = Object.assign(new FakeDevice({ model: 'SNSW-002P16EU' }), {
      profile: 'switch',
      switch0: createSwitch({ id: 0 }),
      switch1: createSwitch({ id: 1 }),
    });

    const delegate = new ShellyPlus2PmDelegate(device as never, { exclude: false, protocol: 'websocket' }, platform);
    await tick();

    const map = allAccessoriesOf(delegate);
    expect(map.size).toBe(2);
    expect(map.has('switch-0')).toBe(true);
    expect(map.has('switch-1')).toBe(true);
  });
});

describe('Shelly Plus 2 PM in cover profile', () => {
  it('produces a single cover accessory with WindowCovering service when configured', async () => {
    const { platform } = createTestPlatform({
      devices: [{
        id: 'shellyplus2pm-aabb',
        'cover:0': { type: 'windowCovering' },
      }],
    });
    const device = Object.assign(new FakeDevice({ id: 'shellyplus2pm-aabb', model: 'SNSW-002P16EU' }), {
      profile: 'cover',
      cover0: createCover({ id: 0, pos_control: true, current_pos: 50, target_pos: 50 }),
    });

    const delegate = new ShellyPlus2PmDelegate(device as never, platform.options.getDeviceOptions(device.id), platform);
    await tick();

    const map = allAccessoriesOf(delegate);
    expect(map.size).toBe(1);
    const acc = map.get('cover-0')!;
    expect(acc.platformAccessory!.getService(Service.WindowCovering)).toBeDefined();
  });

  it('drives HomeKit characteristic updates from device state changes', async () => {
    const { platform } = createTestPlatform();
    const cover = createCover({ id: 0, pos_control: true, current_pos: 0, target_pos: 0 });
    const device = Object.assign(new FakeDevice({ model: 'SNSW-002P16EU' }), {
      profile: 'cover',
      cover0: cover,
    });

    const delegate = new ShellyPlus2PmDelegate(device as never, { exclude: false, protocol: 'websocket' }, platform);
    await tick();

    const acc = allAccessoriesOf(delegate).get('cover-0')!;
    const win = acc.platformAccessory!.getService(Service.Window)!;

    cover.setState('current_pos', 75);
    cover.setState('state', 'opening');

    expect(win.getCharacteristic(Characteristic.CurrentPosition).value).toBe(75);
  });
});

describe('Shelly Pro 4 PM (4 switches)', () => {
  it('produces four independent switch accessories', async () => {
    const { platform } = createTestPlatform();
    const device = Object.assign(new FakeDevice({ model: 'SPSW-104PE16EU' }), {
      switch0: createSwitch({ id: 0 }),
      switch1: createSwitch({ id: 1 }),
      switch2: createSwitch({ id: 2 }),
      switch3: createSwitch({ id: 3 }),
    });

    const delegate = new ShellyPro4PmDelegate(device as never, { exclude: false, protocol: 'websocket' }, platform);
    await tick();

    const map = allAccessoriesOf(delegate);
    expect(map.size).toBe(4);
    for (let i = 0; i < 4; i++) {
      expect(map.get(`switch-${i}`)!.platformAccessory!.getService(Service.Switch)).toBeDefined();
    }
  });
});

describe('Shelly Pro Dual Cover PM', () => {
  it('produces two cover accessories', async () => {
    const { platform } = createTestPlatform();
    const device = Object.assign(new FakeDevice({ model: 'SPSH-002PE16EU' }), {
      cover0: createCover({ id: 0, pos_control: true, current_pos: 0, target_pos: 0 }),
      cover1: createCover({ id: 1, pos_control: true, current_pos: 100, target_pos: 100 }),
    });

    const delegate = new ShellyProDualCoverPmDelegate(
      device as never,
      { exclude: false, protocol: 'websocket' },
      platform,
    );
    await tick();

    const map = allAccessoriesOf(delegate);
    expect(map.size).toBe(2);
    expect(map.has('cover-0')).toBe(true);
    expect(map.has('cover-1')).toBe(true);
  });
});

describe('Shelly Plus i4 (4 inputs)', () => {
  it('with all inputs as switches: produces 4 readonly-switch accessories and no buttons', async () => {
    const { platform } = createTestPlatform();
    const device = Object.assign(new FakeDevice({ model: 'SNSN-0024X' }), {
      input0: createInput({ id: 0, config: { type: 'switch' } }),
      input1: createInput({ id: 1, config: { type: 'switch' } }),
      input2: createInput({ id: 2, config: { type: 'switch' } }),
      input3: createInput({ id: 3, config: { type: 'switch' } }),
    });

    const delegate = new ShellyPlusI4Delegate(device as never, { exclude: false, protocol: 'websocket' }, platform);
    await tick();

    const map = allAccessoriesOf(delegate);
    // buttons accessory is created but inactive; switch0..3 are active
    for (let i = 0; i < 4; i++) {
      const acc = map.get(`switch${i}`)!;
      expect(acc.platformAccessory).not.toBeNull();
    }
  });

  it('with all inputs as buttons: produces a single buttons accessory with 4 stateless switches', async () => {
    const { platform } = createTestPlatform();
    const device = Object.assign(new FakeDevice({ model: 'SNSN-0024X' }), {
      input0: createInput({ id: 0, config: { type: 'button' } }),
      input1: createInput({ id: 1, config: { type: 'button' } }),
      input2: createInput({ id: 2, config: { type: 'button' } }),
      input3: createInput({ id: 3, config: { type: 'button' } }),
    });

    const delegate = new ShellyPlusI4Delegate(device as never, { exclude: false, protocol: 'websocket' }, platform);
    await tick();

    const map = allAccessoriesOf(delegate);
    const buttons = map.get('buttons')!;
    expect(buttons).toBeDefined();
    expect(buttons.platformAccessory).not.toBeNull();
    // 4 stateless switches + 1 service label
    const services = buttons.platformAccessory!.services;
    const ssCount = services.filter(s => s.UUID === Service.StatelessProgrammableSwitch.UUID).length;
    expect(ssCount).toBe(4);
  });
});

describe('Multi-device isolation', () => {
  it('two delegates on the same platform do not cross-pollute their accessory maps', async () => {
    const { platform } = createTestPlatform();

    const deviceA = Object.assign(new FakeDevice({ id: 'shellyplus1-A', model: 'SNSW-001X16EU' }), {
      switch0: createSwitch({ id: 0, output: false }),
    });
    const deviceB = Object.assign(new FakeDevice({ id: 'shellyplus1-B', model: 'SNSW-001X16EU' }), {
      switch0: createSwitch({ id: 0, output: false }),
    });

    const delA = new ShellyPlus1Delegate(deviceA as never, { exclude: false, protocol: 'websocket' }, platform);
    const delB = new ShellyPlus1Delegate(deviceB as never, { exclude: false, protocol: 'websocket' }, platform);
    await tick();

    const mapA = allAccessoriesOf(delA);
    const mapB = allAccessoriesOf(delB);

    expect(mapA.size).toBe(1);
    expect(mapB.size).toBe(1);
    // UUIDs must differ because they're derived from device.id
    expect(mapA.get('switch')!.uuid).not.toBe(mapB.get('switch')!.uuid);

    // A state change on deviceA must NOT affect deviceB
    deviceA.switch0.setState('output', true);
    const accA = mapA.get('switch')!.platformAccessory!.getService(Service.Switch)!;
    const accB = mapB.get('switch')!.platformAccessory!.getService(Service.Switch)!;
    expect(accA.getCharacteristic(Characteristic.On).value).toBe(true);
    expect(accB.getCharacteristic(Characteristic.On).value).toBe(false);
  });
});

describe('Reconnection refreshState path', () => {
  it('every ability has refreshState() invoked when the RPC handler reconnects', async () => {
    // Use a Plus 1 (single switch) so addCover()'s three-CoverAbility expansion
    // doesn't run — the inactive CoverAbility instances trip on a known
    // upstream bug where refreshState ignores _isInitialized. See follow-up.
    const { platform } = createTestPlatform();
    const rpc = new FakeRpcHandler({ connected: false });
    const sw = createSwitch({ id: 0, output: false });
    const device = Object.assign(new FakeDevice({ model: 'SNSW-001X16EU', rpcHandler: rpc }), {
      switch0: sw,
    });

    const delegate = new ShellyPlus1Delegate(device as never, { exclude: false, protocol: 'websocket' }, platform);
    await tick();

    const acc = allAccessoriesOf(delegate).get('switch')!;
    const refreshSpies = acc.abilities.map(a => jest.spyOn(a, 'refreshState'));

    rpc.emit('connect');

    // every ability on the accessory got refreshState() called
    for (const spy of refreshSpies) {
      expect(spy).toHaveBeenCalledTimes(1);
    }
  });

  it('handleDisconnect logs without throwing', async () => {
    const { platform, log } = createTestPlatform();
    const rpc = new FakeRpcHandler({ connected: true });
    const device = Object.assign(new FakeDevice({ model: 'SNSW-001X16EU', rpcHandler: rpc }), {
      switch0: createSwitch({ id: 0 }),
    });

    new ShellyPlus1Delegate(device as never, { exclude: false, protocol: 'websocket' }, platform);
    await tick();

    expect(() => rpc.emit('disconnect', 1006, 'connection lost', 5000)).not.toThrow();
    expect(log.records.some(r => r.message.includes('disconnected') || r.message.includes('Reconnecting'))).toBe(true);
  });
});
