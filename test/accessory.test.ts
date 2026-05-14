import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { PlatformAccessory } from 'homebridge';

import { Accessory } from '../src/accessory.js';
import { Ability, ServiceClass } from '../src/abilities/base.js';
import type { ShellyPlatform } from '../src/platform.js';
import { createFakePlatform, FakePlatformAccessory, type FakePlatform } from './helpers/hap-stub.js';
import { createCapturingLogger } from './helpers/logger.js';
import { DeviceLogger } from '../src/utils/device-logger.js';
import { FakeDevice } from './helpers/shelly-stub.js';
import type { Device } from 'shellies-ds9';

class StubAbility extends Ability {
  public setupCalls = 0;
  public destroyCalls = 0;
  public detachCalls = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public lastArgs: any = null;

  protected get serviceClass(): ServiceClass {
    return { UUID: 'stub-service', displayName: 'Stub' } as unknown as ServiceClass;
  }

  protected initialize(): void {}

  detach(): void {
    this.detachCalls += 1;
  }

  setup(pa: PlatformAccessory, p: ShellyPlatform, log: DeviceLogger): void {
    this.setupCalls += 1;
    this.lastArgs = { pa, p, log };
  }

  destroy(): void {
    this.destroyCalls += 1;
  }
}

class ThrowingDetachAbility extends StubAbility {
  detach(): void {
    super.detach();
    throw new Error('detach failed');
  }
}

let platform: FakePlatform;
let log: DeviceLogger;

beforeEach(() => {
  platform = createFakePlatform();
  vi.useFakeTimers();
  const device = new FakeDevice() as unknown as Device;
  log = new DeviceLogger(device, 'Test Device', createCapturingLogger());
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Accessory', () => {
  it('derives UUID from deviceId-id', () => {
    const ability = new StubAbility();
    const acc = new Accessory('switch-0', 'shellyplus1-abc', 'Test', platform as unknown as ShellyPlatform, log, ability);
    expect(acc.uuid).toBe('uuid-shellyplus1-abc-switch-0');
  });

  it('activates after the update timeout, calling setup() on each ability', async () => {
    const a = new StubAbility();
    const b = new StubAbility();
    new Accessory('id', 'dev', 'Name', platform as unknown as ShellyPlatform, log, a, b);
    expect(a.setupCalls).toBe(0);
    await vi.advanceTimersByTimeAsync(0);
    expect(a.setupCalls).toBe(1);
    expect(b.setupCalls).toBe(1);
    expect(platform.addAccessory).toHaveBeenCalled();
  });

  it('does not activate when setActive(false) is chained immediately', async () => {
    const a = new StubAbility();
    const acc = new Accessory('id', 'dev', 'N', platform as unknown as ShellyPlatform, log, a);
    acc.setActive(false);
    await vi.advanceTimersByTimeAsync(0);
    expect(a.setupCalls).toBe(0);
    expect(platform.addAccessory).not.toHaveBeenCalled();
  });

  it('renames a cached accessory when the name changes', async () => {
    const cached = new FakePlatformAccessory('Old Name', 'uuid-dev-id');
    platform.accessories.set('uuid-dev-id', cached);
    const a = new StubAbility();
    const acc = new Accessory('id', 'dev', 'New Name', platform as unknown as ShellyPlatform, log, a);
    expect(cached.displayName).toBe('New Name');
    expect(platform.api.updatePlatformAccessories).toHaveBeenCalledWith([cached]);
    expect(acc.platformAccessory).toBe(cached as unknown);
  });

  it('does not rename when cached name already matches', () => {
    const cached = new FakePlatformAccessory('Same', 'uuid-dev-id');
    platform.accessories.set('uuid-dev-id', cached);
    const a = new StubAbility();
    new Accessory('id', 'dev', 'Same', platform as unknown as ShellyPlatform, log, a);
    expect(platform.api.updatePlatformAccessories).not.toHaveBeenCalled();
  });

  it('toggling active triggers deactivate then activate', async () => {
    const a = new StubAbility();
    const acc = new Accessory('id', 'dev', 'N', platform as unknown as ShellyPlatform, log, a);
    await vi.advanceTimersByTimeAsync(0);
    expect(a.setupCalls).toBe(1);

    acc.active = false;
    await vi.advanceTimersByTimeAsync(0);
    expect(a.destroyCalls).toBe(1);
    expect(platform.removeAccessory).toHaveBeenCalled();

    acc.active = true;
    await vi.advanceTimersByTimeAsync(0);
    expect(a.setupCalls).toBe(2);
  });

  it('detach() calls detach on all abilities and tolerates errors', async () => {
    const good = new StubAbility();
    const bad = new ThrowingDetachAbility();
    const acc = new Accessory('id', 'dev', 'N', platform as unknown as ShellyPlatform, log, good, bad);
    await vi.advanceTimersByTimeAsync(0);
    expect(() => acc.detach()).not.toThrow();
    expect(good.detachCalls).toBe(1);
    expect(bad.detachCalls).toBe(1);
  });

  it('logs but does not propagate when an ability setup() throws', async () => {
    class FailingAbility extends StubAbility {
      setup(): void {
        throw new Error('setup boom');
      }
    }
    const good = new StubAbility();
    const bad = new FailingAbility();
    new Accessory('id', 'dev', 'N', platform as unknown as ShellyPlatform, log, bad, good);
    await vi.advanceTimersByTimeAsync(0);
    expect(good.setupCalls).toBe(1);
    expect(platform.addAccessory).toHaveBeenCalled();
  });
});
