import type { PlatformAccessory } from 'homebridge';

import type { Ability } from '../../src/abilities/base.js';
import type { ShellyPlatform } from '../../src/platform.js';
import { createFakePlatform, FakePlatformAccessory, type FakePlatform } from './hap-stub.js';
import { createCapturingLogger, type CapturingLogger } from './logger.js';
import { FakeDevice } from './shelly-stub.js';
import { DeviceLogger } from '../../src/utils/device-logger.js';
import type { Device } from 'shellies-ds9';

export interface AbilityHarness {
  platform: FakePlatform;
  accessory: FakePlatformAccessory;
  baseLog: CapturingLogger;
  deviceLog: DeviceLogger;
  device: FakeDevice;
}

/**
 * Sets an ability up against a fake platform + accessory and returns the
 * pieces tests need to assert on.
 */
export function setupAbility(ability: Ability, displayName = 'Test Accessory'): AbilityHarness {
  const platform = createFakePlatform();
  const accessory = new FakePlatformAccessory(displayName, 'uuid-test');
  const baseLog = createCapturingLogger();
  const device = new FakeDevice();
  const deviceLog = new DeviceLogger(device as unknown as Device, displayName, baseLog);

  ability.setup(accessory as unknown as PlatformAccessory, platform as unknown as ShellyPlatform, deviceLog);

  return { platform, accessory, baseLog, deviceLog, device };
}
