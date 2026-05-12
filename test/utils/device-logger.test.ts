import { describe, it, expect } from 'vitest';
import { LogLevel } from 'homebridge';

import { DeviceLogger } from '../../src/utils/device-logger.js';
import { createCapturingLogger } from '../helpers/logger.js';
import { FakeDevice } from '../helpers/shelly-stub.js';
import type { Device } from 'shellies-ds9';

describe('DeviceLogger', () => {
  it('prefixes log messages with the user-friendly device name when provided', () => {
    const base = createCapturingLogger();
    const device = new FakeDevice({ id: 'shellyplus1-abc' }) as unknown as Device;
    const log = new DeviceLogger(device, 'Living Room Lamp', base);
    log.info('hello');
    expect(base.records[0]).toMatchObject({ message: '[Living Room Lamp] hello' });
  });

  it('falls back to the device ID when no name is provided', () => {
    const base = createCapturingLogger();
    const device = new FakeDevice({ id: 'shellyplus1-abc' }) as unknown as Device;
    const log = new DeviceLogger(device, undefined, base);
    log.info('hi');
    expect(base.records[0]).toMatchObject({ message: '[shellyplus1-abc] hi' });
  });

  it('delegates info/warn/error/debug to the underlying logger', () => {
    const base = createCapturingLogger();
    const device = new FakeDevice() as unknown as Device;
    const log = new DeviceLogger(device, 'X', base);
    log.info('i');
    log.warn('w');
    log.error('e');
    log.debug('d');
    expect(base.records.map(r => r.level)).toEqual([LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.DEBUG]);
  });

  it('forwards parameters to the underlying logger', () => {
    const base = createCapturingLogger();
    const device = new FakeDevice() as unknown as Device;
    const log = new DeviceLogger(device, 'P', base);
    log.info('msg', 1, 'two', { three: 3 });
    expect(base.records[0].params).toEqual([1, 'two', { three: 3 }]);
  });

  it('log() with explicit level forwards correctly', () => {
    const base = createCapturingLogger();
    const device = new FakeDevice() as unknown as Device;
    const log = new DeviceLogger(device, 'L', base);
    log.log(LogLevel.WARN, 'caution');
    expect(base.records[0]).toMatchObject({ level: LogLevel.WARN, message: '[L] caution' });
  });
});
