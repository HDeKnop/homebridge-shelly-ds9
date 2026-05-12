import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { mkdtemp, rm } from 'fs/promises';

import { DeviceCache } from '../../src/utils/device-cache.js';
import { createCapturingLogger } from '../helpers/logger.js';
import { FakeDevice } from '../helpers/shelly-stub.js';
import type { Device } from 'shellies-ds9';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'shelly-cache-'));
  vi.useFakeTimers();
});

afterEach(async () => {
  vi.useRealTimers();
  await rm(dir, { recursive: true, force: true });
});

describe('DeviceCache', () => {
  it('exposes the resolved cache file path', () => {
    const log = createCapturingLogger();
    const c = new DeviceCache(dir, log);
    expect(c.path).toBe(resolve(dir, '.shelly-ng.json'));
  });

  it('load() is a no-op when the cache file does not exist', async () => {
    const log = createCapturingLogger();
    const c = new DeviceCache(dir, log);
    await c.load();
    expect(c.get('any')).toBeUndefined();
    const debugRecs = log.records.filter(r => r.level === 'debug');
    expect(debugRecs.some(r => r.message.includes('not found'))).toBe(true);
  });

  it('load() reads a valid cache file', async () => {
    const file = resolve(dir, '.shelly-ng.json');
    const payload = { devices: [{ id: 'd1', model: 'M1', protocol: 'websocket', hostname: '1.2.3.4' }] };
    await fs.writeFile(file, JSON.stringify(payload));
    const log = createCapturingLogger();
    const c = new DeviceCache(dir, log);
    await c.load();
    expect(c.get('d1')).toEqual(payload.devices[0]);
  });

  it('load() logs an error and ignores a corrupted cache file', async () => {
    const file = resolve(dir, '.shelly-ng.json');
    await fs.writeFile(file, '{ not valid json');
    const log = createCapturingLogger();
    const c = new DeviceCache(dir, log);
    await c.load();
    expect(c.get('anything')).toBeUndefined();
    const errs = log.records.filter(r => r.level === 'error');
    expect(errs.some(r => r.message.includes('corrupted'))).toBe(true);
  });

  it('load() logs an error and ignores files without a devices array', async () => {
    const file = resolve(dir, '.shelly-ng.json');
    await fs.writeFile(file, JSON.stringify({ devices: 'not an array' }));
    const log = createCapturingLogger();
    const c = new DeviceCache(dir, log);
    await c.load();
    const errs = log.records.filter(r => r.level === 'error');
    expect(errs.some(r => r.message.includes('unexpected format'))).toBe(true);
  });

  it('load() clears previously loaded devices before reading', async () => {
    const file = resolve(dir, '.shelly-ng.json');
    await fs.writeFile(file, JSON.stringify({ devices: [{ id: 'a', model: 'M', protocol: 'websocket' }] }));
    const log = createCapturingLogger();
    const c = new DeviceCache(dir, log);
    await c.load();
    expect(c.get('a')).toBeDefined();
    // overwrite the file
    await fs.writeFile(file, JSON.stringify({ devices: [{ id: 'b', model: 'M', protocol: 'websocket' }] }));
    await c.load();
    expect(c.get('a')).toBeUndefined();
    expect(c.get('b')).toBeDefined();
  });

  it('save() round-trips through load()', async () => {
    const log = createCapturingLogger();
    const c = new DeviceCache(dir, log);
    c.set({ id: 'x', model: 'MX', protocol: 'websocket', hostname: '10.0.0.1' }, false);
    await c.save();

    const c2 = new DeviceCache(dir, log);
    await c2.load();
    expect(c2.get('x')).toEqual({ id: 'x', model: 'MX', protocol: 'websocket', hostname: '10.0.0.1' });
  });

  it('storeDevice() extracts websocket hostname', () => {
    const log = createCapturingLogger();
    const c = new DeviceCache(dir, log);
    const d = new FakeDevice({ id: 'devid', model: 'M1' }) as unknown as Device;
    c.storeDevice(d, false);
    expect(c.get('devid')).toEqual({
      id: 'devid',
      model: 'M1',
      protocol: 'websocket',
      hostname: '192.168.1.100',
    });
  });

  it('delete() removes a cached device', () => {
    const log = createCapturingLogger();
    const c = new DeviceCache(dir, log);
    c.set({ id: 'gone', model: 'M', protocol: 'websocket' }, false);
    expect(c.get('gone')).toBeDefined();
    c.delete('gone', false);
    expect(c.get('gone')).toBeUndefined();
  });

  it('iterates over all cached devices', () => {
    const log = createCapturingLogger();
    const c = new DeviceCache(dir, log);
    c.set({ id: 'a', model: 'M', protocol: 'websocket' }, false);
    c.set({ id: 'b', model: 'M', protocol: 'websocket' }, false);
    const ids = Array.from(c).map(d => d.id);
    expect(ids).toEqual(['a', 'b']);
  });

  it('saveDelayed() debounces multiple invocations into a single save', async () => {
    const log = createCapturingLogger();
    const c = new DeviceCache(dir, log);
    const spy = vi.spyOn(c, 'save');
    c.saveDelayed();
    c.saveDelayed();
    c.saveDelayed();
    expect(spy).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('saveDelayed() logs an error if save() rejects', async () => {
    const log = createCapturingLogger();
    const c = new DeviceCache(dir, log);
    vi.spyOn(c, 'save').mockRejectedValue(new Error('disk full'));
    c.saveDelayed();
    await vi.advanceTimersByTimeAsync(1000);
    // Allow the rejection to surface
    await Promise.resolve();
    const errs = log.records.filter(r => r.level === 'error');
    expect(errs.some(r => r.message.includes('Failed to save'))).toBe(true);
  });
});
