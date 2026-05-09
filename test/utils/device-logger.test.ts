import { LogLevel } from 'homebridge';

import { DeviceLogger } from '../../src/utils/device-logger';
import { createMockLogger } from '../mocks/api';
import { FakeDevice } from '../mocks/shelly';

describe('DeviceLogger', () => {
  it('prefixes with deviceName when provided', () => {
    const log = createMockLogger();
    const dl = new DeviceLogger(new FakeDevice() as never, 'Living Room Cover', log);
    dl.info('test message');

    expect(log.records).toHaveLength(1);
    expect(log.records[0].message).toBe('[Living Room Cover] test message');
    expect(log.records[0].level).toBe(LogLevel.INFO);
  });

  it('falls back to device.id when deviceName is omitted', () => {
    const log = createMockLogger();
    const dl = new DeviceLogger(new FakeDevice({ id: 'shelly-abc' }) as never, undefined, log);
    dl.warn('boom');

    expect(log.records[0].message).toBe('[shelly-abc] boom');
    expect(log.records[0].level).toBe(LogLevel.WARN);
  });

  it('forwards extra parameters intact', () => {
    const log = createMockLogger();
    const dl = new DeviceLogger(new FakeDevice() as never, 'D', log);
    dl.error('bad %s %d', 'thing', 42);
    expect(log.records[0].params).toEqual(['thing', 42]);
  });

  it('routes each level to the matching LogLevel', () => {
    const log = createMockLogger();
    const dl = new DeviceLogger(new FakeDevice() as never, 'D', log);
    dl.info('i'); dl.warn('w'); dl.error('e'); dl.debug('d');

    expect(log.records.map(r => r.level)).toEqual([
      LogLevel.INFO,
      LogLevel.WARN,
      LogLevel.ERROR,
      LogLevel.DEBUG,
    ]);
  });
});
