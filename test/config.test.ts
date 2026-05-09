import { PlatformOptions } from '../src/config';

describe('PlatformOptions', () => {
  it('applies default mDNS and websocket settings when config is empty', () => {
    const opts = new PlatformOptions({ platform: 'ShellyDS9-dev' });

    expect(opts.mdns).toEqual({ enable: true });
    expect(opts.websocket.requestTimeout).toBe(10);
    expect(opts.websocket.pingInterval).toBe(60);
    expect(opts.websocket.reconnectInterval).toEqual([5, 10, 30, 60, 300, 600]);
    expect(opts.deviceOptions.size).toBe(0);
  });

  it('parses websocket.reconnectInterval given as comma-separated string', () => {
    const opts = new PlatformOptions({
      platform: 'ShellyDS9-dev',
      websocket: { reconnectInterval: '1,2,3,15' },
    });
    expect(opts.websocket.reconnectInterval).toEqual([1, 2, 3, 15]);
  });

  it('preserves websocket.reconnectInterval when given as a number array', () => {
    const opts = new PlatformOptions({
      platform: 'ShellyDS9-dev',
      websocket: { reconnectInterval: [3, 6, 9] },
    });
    expect(opts.websocket.reconnectInterval).toEqual([3, 6, 9]);
  });

  it('lowercases device IDs and applies defaults', () => {
    const opts = new PlatformOptions({
      platform: 'ShellyDS9-dev',
      devices: [
        { id: 'SHELLYPLUS1-AABBCC', name: 'Living Room' },
      ],
    });
    expect(opts.deviceOptions.has('shellyplus1-aabbcc')).toBe(true);
    const d = opts.deviceOptions.get('shellyplus1-aabbcc')!;
    expect(d.exclude).toBe(false);
    expect(d.protocol).toBe('websocket');
    expect(d.name).toBe('Living Room');
  });

  it('preserves component-level options for switch and cover', () => {
    const opts = new PlatformOptions({
      platform: 'ShellyDS9-dev',
      devices: [
        {
          id: 'shellyplus2pm-1',
          'switch:0': { type: 'outlet', exclude: false },
          'cover:0': { type: 'door' },
          'light:0': { type: 'fan', exclude: false },
        },
      ],
    });
    const d = opts.deviceOptions.get('shellyplus2pm-1') as any;
    expect(d['switch:0']).toEqual({ type: 'outlet', exclude: false });
    expect(d['cover:0']).toEqual({ type: 'door' });
    expect(d['light:0']).toEqual({ type: 'fan', exclude: false });
  });

  it('skips devices missing an id', () => {
    const opts = new PlatformOptions({
      platform: 'ShellyDS9-dev',
      devices: [
        { name: 'no id here' },
        { id: 'shelly-ok' },
      ],
    });
    expect(opts.deviceOptions.size).toBe(1);
    expect(opts.deviceOptions.has('shelly-ok')).toBe(true);
  });

  it('getDeviceOptions falls back to defaults for unknown IDs', () => {
    const opts = new PlatformOptions({ platform: 'ShellyDS9-dev' });
    const d = opts.getDeviceOptions('shelly-nonexistent');
    expect(d.exclude).toBe(false);
    expect(d.protocol).toBe('websocket');
  });

  it('getDeviceOptions returns the configured options when present', () => {
    const opts = new PlatformOptions({
      platform: 'ShellyDS9-dev',
      devices: [{ id: 'shelly-x', name: 'X', exclude: true }],
    });
    expect(opts.getDeviceOptions('shelly-x').name).toBe('X');
    expect(opts.getDeviceOptions('shelly-x').exclude).toBe(true);
  });

  it('respects mdns.enable=false', () => {
    const opts = new PlatformOptions({
      platform: 'ShellyDS9-dev',
      mdns: { enable: false },
    });
    expect(opts.mdns.enable).toBe(false);
  });
});
