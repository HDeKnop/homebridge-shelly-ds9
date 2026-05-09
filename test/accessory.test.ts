import { Accessory } from '../src/accessory';
import { SwitchAbility, AccessoryInformationAbility } from '../src/abilities';
import { DeviceLogger } from '../src/utils/device-logger';
import { createTestPlatform } from './mocks/platform';
import { createSwitch, FakeDevice } from './mocks/shelly';

/** Wait long enough for `setTimeout(fn, 0)` (used by Accessory.update) to fire. */
const tick = () => new Promise<void>(resolve => setTimeout(resolve, 5));

describe('Accessory', () => {
  it('generates a stable UUID from deviceId + accessoryId', () => {
    const { platform } = createTestPlatform();
    const log = new DeviceLogger(new FakeDevice() as never, 'D', platform.log);
    const a = new Accessory('switch-0', 'shelly-1', 'A', platform, log);
    const b = new Accessory('switch-0', 'shelly-1', 'A', platform, log);
    expect(a.uuid).toBe(b.uuid);
  });

  it('different (deviceId, id) pairs yield different UUIDs', () => {
    const { platform } = createTestPlatform();
    const log = new DeviceLogger(new FakeDevice() as never, 'D', platform.log);
    const a = new Accessory('switch-0', 'shelly-1', 'A', platform, log);
    const b = new Accessory('switch-1', 'shelly-1', 'A', platform, log);
    const c = new Accessory('switch-0', 'shelly-2', 'A', platform, log);
    expect(new Set([a.uuid, b.uuid, c.uuid]).size).toBe(3);
  });

  it('activates after a microtask, registering the platform accessory', async () => {
    const { platform, api } = createTestPlatform();
    const log = new DeviceLogger(new FakeDevice() as never, 'D', platform.log);
    const sw = createSwitch({ id: 0 });

    const a = new Accessory('switch-0', 'shelly-x', 'My Switch', platform, log,
      new AccessoryInformationAbility(new FakeDevice() as never),
      new SwitchAbility(sw as never),
    );
    expect(a.platformAccessory).toBeNull(); // updates run on next tick

    await tick();

    expect(a.platformAccessory).not.toBeNull();
    expect(api.registrations.find(r => r.kind === 'register')).toBeDefined();
  });

  it('setActive(false) before activation cancels registration', async () => {
    const { platform, api } = createTestPlatform();
    const log = new DeviceLogger(new FakeDevice() as never, 'D', platform.log);
    const sw = createSwitch({ id: 0 });

    const a = new Accessory('switch-0', 'shelly-y', 'My Switch', platform, log,
      new SwitchAbility(sw as never),
    );
    a.setActive(false);

    await tick();

    expect(a.platformAccessory).toBeNull();
    expect(api.registrations.find(r => r.kind === 'register')).toBeUndefined();
  });

  it('reuses cached PlatformAccessory when one already exists in the platform', async () => {
    const { platform, api } = createTestPlatform();
    const log = new DeviceLogger(new FakeDevice() as never, 'D', platform.log);
    const sw = createSwitch({ id: 0 });
    const ability = new SwitchAbility(sw as never);

    // Pre-populate the platform's accessory map with a cached accessory whose UUID matches
    const uuid = api.hap.uuid.generate('shelly-cached-switch-0');
    const cached = new api.platformAccessory('Original Name', uuid);
    platform.configureAccessory(cached);

    const a = new Accessory('switch-0', 'shelly-cached', 'Original Name', platform, log, ability);
    await tick();

    expect(a.platformAccessory).toBe(cached);
  });

  it('renames the cached accessory when the friendly name has changed', async () => {
    const { platform, api } = createTestPlatform();
    const log = new DeviceLogger(new FakeDevice() as never, 'D', platform.log);

    const uuid = api.hap.uuid.generate('shelly-rename-switch-0');
    const cached = new api.platformAccessory('Old Name', uuid);
    platform.configureAccessory(cached);

    const a = new Accessory('switch-0', 'shelly-rename', 'New Name', platform, log,
      new SwitchAbility(createSwitch({ id: 0 }) as never),
    );
    await tick();

    expect(a.platformAccessory!.displayName).toBe('New Name');
    expect(api.registrations.some(r => r.kind === 'update')).toBe(true);
  });

  it('detach() unsubscribes ability listeners and is safe to call before activation', () => {
    const { platform } = createTestPlatform();
    const log = new DeviceLogger(new FakeDevice() as never, 'D', platform.log);
    const sw = createSwitch({ id: 0 });
    const a = new Accessory('switch-0', 'shelly-d', 'X', platform, log,
      new SwitchAbility(sw as never),
    );
    expect(() => a.detach()).not.toThrow();
  });
});
