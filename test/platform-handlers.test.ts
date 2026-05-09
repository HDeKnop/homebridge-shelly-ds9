/**
 * Drives the Shellies-event-handler methods of ShellyPlatform indirectly,
 * by emitting on its internal `shellies` instance — the same path the real
 * shellies-ds9 library would take when a device is discovered, removed, or
 * excluded. We don't open any real WebSocket connections.
 */
import { ShellyPlatform } from '../src/platform';
import { createTestPlatform } from './mocks/platform';
import { FakeDevice, FakeRpcHandler } from './mocks/shelly';

const tick = () => new Promise<void>(resolve => setTimeout(resolve, 5));

const fakePlus1 = (id: string) => Object.assign(new FakeDevice({
  id,
  model: 'SNSW-001X16EU',
  rpcHandler: new FakeRpcHandler({ hostname: '192.168.1.50' }),
}), {
  switch0: {
    id: 0,
    key: 'switch:0',
    output: false,
    on: jest.fn().mockReturnThis(),
    off: jest.fn().mockReturnThis(),
    emit: jest.fn(),
    listenerCount: jest.fn().mockReturnValue(0),
    set: jest.fn(),
    config: undefined,
    apower: undefined,
  },
});

const shelliesEmitter = (platform: ShellyPlatform) =>
  (platform as unknown as { shellies: { emit: (event: string, ...args: unknown[]) => void } }).shellies;

describe('ShellyPlatform handler wiring', () => {
  it('handleAddedDevice creates a delegate for known models', async () => {
    const { platform } = createTestPlatform();
    const device = fakePlus1('shellyplus1-A');
    shelliesEmitter(platform).emit('add', device);
    await tick();
    expect(platform.deviceDelegates.has('shellyplus1-A')).toBe(true);
  });

  it('handleAddedDevice declines duplicate adds and logs an error', async () => {
    const { platform, log } = createTestPlatform();
    const device = fakePlus1('shellyplus1-DUP');
    shelliesEmitter(platform).emit('add', device);
    await tick();

    log.records.length = 0;
    shelliesEmitter(platform).emit('add', device);
    await tick();

    expect(log.records.some(r => r.level === 'error' && r.message.includes('already been added'))).toBe(true);
  });

  it('handleAddedDevice logs a warning for unknown models', async () => {
    const { platform, log } = createTestPlatform();
    const device = Object.assign(new FakeDevice({ id: 'shelly-unknown', model: 'NEVER-MADE' }), {});
    shelliesEmitter(platform).emit('add', device);
    await tick();
    expect(platform.deviceDelegates.has('shelly-unknown')).toBe(false);
    expect(log.records.some(r => r.level === 'warn' && r.message.includes('Unknown'))).toBe(true);
  });

  it('handleAddedDevice falls back to device.system.config.device.name when no opts.name', async () => {
    const { platform } = createTestPlatform();
    const device = fakePlus1('shellyplus1-named');
    device.system = { config: { device: { name: 'From-Device-API' } } };
    shelliesEmitter(platform).emit('add', device);
    await tick();
    expect(platform.deviceDelegates.has('shellyplus1-named')).toBe(true);
  });

  it('handleRemovedDevice destroys the delegate and forgets it', async () => {
    const { platform } = createTestPlatform();
    const device = fakePlus1('shellyplus1-R');
    shelliesEmitter(platform).emit('add', device);
    await tick();
    expect(platform.deviceDelegates.has('shellyplus1-R')).toBe(true);

    shelliesEmitter(platform).emit('remove', device);
    expect(platform.deviceDelegates.has('shellyplus1-R')).toBe(false);
  });

  it('handleExcludedDevice with no live delegate unregisters cached accessories that match the deviceId', () => {
    const { platform, api } = createTestPlatform();
    // simulate a cached accessory carrying device.id in its context
    const acc = new api.platformAccessory('Cached', api.hap.uuid.generate('excl-cached'));
    acc.context.device = { id: 'shelly-excluded' };
    platform.configureAccessory(acc);

    api.registrations.length = 0;
    shelliesEmitter(platform).emit('exclude', 'shelly-excluded');

    const unr = api.registrations.filter(r => r.kind === 'unregister');
    expect(unr).toHaveLength(1);
    expect(unr[0].accessories).toContain(acc);
  });

  it('handleExcludedDevice with a live delegate destroys it', async () => {
    const { platform } = createTestPlatform();
    const device = fakePlus1('shellyplus1-EX');
    shelliesEmitter(platform).emit('add', device);
    await tick();
    expect(platform.deviceDelegates.has('shellyplus1-EX')).toBe(true);

    shelliesEmitter(platform).emit('exclude', 'shellyplus1-EX');
    expect(platform.deviceDelegates.has('shellyplus1-EX')).toBe(false);
  });

  it('handleError logs the error message and debug stack', () => {
    const { platform, log } = createTestPlatform();
    const err = new Error('rpc failed');
    err.stack = 'Error: rpc failed\n  at test';
    shelliesEmitter(platform).emit('error', 'shelly-err', err);

    expect(log.records.some(r => r.level === 'error' && r.message === 'rpc failed')).toBe(true);
    expect(log.records.some(r => r.level === 'debug' && r.message.includes('rpc failed'))).toBe(true);
  });

  it('handleUnknownDevice path through emit', () => {
    const { platform, log } = createTestPlatform();
    shelliesEmitter(platform).emit('unknown', 'shelly-mystery', 'WHO-KNOWS');
    expect(log.records.some(r => r.level === 'warn' && r.message.includes('WHO-KNOWS'))).toBe(true);
  });
});
