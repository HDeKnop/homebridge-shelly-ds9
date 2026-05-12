import { describe, it, expect } from 'vitest';
import type { PlatformConfig } from 'homebridge';

import { PlatformOptions } from '../src/config.js';

const cfg = (partial: Record<string, unknown> = {}): PlatformConfig => ({
  platform: 'ShellyDS9-dev',
  ...partial,
} as PlatformConfig);

describe('PlatformOptions', () => {
  it('applies default mDNS options when none provided', () => {
    const opts = new PlatformOptions(cfg());
    expect(opts.mdns.enable).toBe(true);
    expect(opts.mdns.interface).toBeUndefined();
  });

  it('merges user mDNS options on top of defaults', () => {
    const opts = new PlatformOptions(cfg({ mdns: { enable: false, interface: 'eth0' } }));
    expect(opts.mdns.enable).toBe(false);
    expect(opts.mdns.interface).toBe('eth0');
  });

  it('applies default WebSocket options when none provided', () => {
    const opts = new PlatformOptions(cfg());
    expect(opts.websocket.requestTimeout).toBe(10);
    expect(opts.websocket.pingInterval).toBe(60);
    expect(opts.websocket.reconnectInterval).toEqual([5, 10, 30, 60, 300, 600]);
  });

  it('parses comma-separated reconnectInterval string into number array', () => {
    const opts = new PlatformOptions(cfg({ websocket: { reconnectInterval: '5,10,30' } }));
    expect(opts.websocket.reconnectInterval).toEqual([5, 10, 30]);
  });

  it('clamps requestTimeout to a minimum of 1', () => {
    const opts = new PlatformOptions(cfg({ websocket: { requestTimeout: 0 } }));
    expect(opts.websocket.requestTimeout).toBe(1);
  });

  it('clamps negative requestTimeout to 1', () => {
    const opts = new PlatformOptions(cfg({ websocket: { requestTimeout: -100 } }));
    expect(opts.websocket.requestTimeout).toBe(1);
  });

  it('clamps negative pingInterval to 0', () => {
    const opts = new PlatformOptions(cfg({ websocket: { pingInterval: -1 } }));
    expect(opts.websocket.pingInterval).toBe(0);
  });

  it('clamps negative reconnectInterval (number) to 0', () => {
    const opts = new PlatformOptions(cfg({ websocket: { reconnectInterval: -5 } }));
    expect(opts.websocket.reconnectInterval).toBe(0);
  });

  it('clamps negative values in reconnectInterval array', () => {
    const opts = new PlatformOptions(cfg({ websocket: { reconnectInterval: [-1, 10, -5, 60] } }));
    expect(opts.websocket.reconnectInterval).toEqual([0, 10, 0, 60]);
  });

  it('stores devices keyed by lowercased ID', () => {
    const opts = new PlatformOptions(cfg({
      devices: [
        { id: 'SHELLYPLUS1-AABBCC', name: 'Light 1' },
        { id: 'shellyplus2pm-112233', exclude: true },
      ],
    }));
    expect(opts.getDeviceOptions('shellyplus1-aabbcc').name).toBe('Light 1');
    expect(opts.getDeviceOptions('shellyplus2pm-112233').exclude).toBe(true);
  });

  it('returns defaults for unknown device IDs', () => {
    const opts = new PlatformOptions(cfg());
    const o = opts.getDeviceOptions('nonexistent');
    expect(o.exclude).toBe(false);
    expect(o.protocol).toBe('websocket');
  });

  it('ignores invalid device entries (missing id, non-string id, nullish)', () => {
    const opts = new PlatformOptions(cfg({
      devices: [
        { id: 'good-1' },
        { id: 123 },
        null,
        {},
        undefined,
      ],
    }));
    expect(opts.deviceOptions.size).toBe(1);
    expect(opts.deviceOptions.has('good-1')).toBe(true);
  });

  it('preserves protocol and exclude defaults on user device entries', () => {
    const opts = new PlatformOptions(cfg({
      devices: [{ id: 'dev-1', name: 'Test' }],
    }));
    const d = opts.getDeviceOptions('dev-1');
    expect(d.protocol).toBe('websocket');
    expect(d.exclude).toBe(false);
    expect(d.name).toBe('Test');
  });

  it('ignores non-array devices field', () => {
    const opts = new PlatformOptions(cfg({ devices: 'not an array' as unknown }));
    expect(opts.deviceOptions.size).toBe(0);
  });
});
