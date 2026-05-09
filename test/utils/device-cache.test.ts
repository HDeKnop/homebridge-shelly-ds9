import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { DeviceCache } from '../../src/utils/device-cache';
import { createMockLogger } from '../mocks/api';
import { FakeDevice, FakeRpcHandler } from '../mocks/shelly';

const FILENAME = '.shelly-ng.json';

const makeStorage = async () => {
  const dir = await fs.mkdtemp(join(tmpdir(), 'shelly-cache-'));
  return dir;
};

/**
 * Wait for the debounced save to flush. The cache uses a 1s setTimeout,
 * so 1.2s plus a microtask tick is enough.
 */
const flushSave = () => new Promise<void>(resolve => setTimeout(resolve, 1200));

describe('DeviceCache', () => {

  it('load() is a no-op when the cache file does not exist', async () => {
    const dir = await makeStorage();
    const cache = new DeviceCache(dir, createMockLogger());
    await expect(cache.load()).resolves.toBeUndefined();
    expect([...cache]).toHaveLength(0);
  });

  it('load() reads cached devices from the storage file', async () => {
    const dir = await makeStorage();
    const path = join(dir, FILENAME);
    await fs.writeFile(path, JSON.stringify({
      devices: [
        { id: 'shelly-a', model: 'PLUS1', protocol: 'websocket', hostname: '192.168.1.10' },
        { id: 'shelly-b', model: 'PLUS2PM', protocol: 'websocket', hostname: '192.168.1.11' },
      ],
    }));

    const cache = new DeviceCache(dir, createMockLogger());
    await cache.load();

    expect([...cache]).toHaveLength(2);
    expect(cache.get('shelly-a')!.hostname).toBe('192.168.1.10');
  });

  it('storeDevice() captures id, model, protocol, hostname for a websocket device', () => {
    const cache = new DeviceCache('/tmp/never-saved', createMockLogger());
    const device = new FakeDevice({
      id: 'shelly-xyz',
      model: 'PLUS1',
      rpcHandler: new FakeRpcHandler({ hostname: '10.0.0.5' }),
    });

    cache.storeDevice(device as never, false); // disable autosave for this test
    expect(cache.get('shelly-xyz')).toEqual({
      id: 'shelly-xyz',
      model: 'PLUS1',
      protocol: 'websocket',
      hostname: '10.0.0.5',
    });
  });

  it('saveDelayed() debounces multiple set() calls into one write', async () => {
    const dir = await makeStorage();
    const cache = new DeviceCache(dir, createMockLogger());

    cache.set({ id: 'a', model: 'PLUS1', protocol: 'websocket' });
    cache.set({ id: 'b', model: 'PLUS1', protocol: 'websocket' });
    cache.set({ id: 'c', model: 'PLUS1', protocol: 'websocket' });

    // advance debounce window
    await flushSave();

    const data = JSON.parse(await fs.readFile(join(dir, FILENAME), 'utf8'));
    expect(data.devices.map((d: any) => d.id).sort()).toEqual(['a', 'b', 'c']);
  });

  it('delete() removes a device and triggers a save', async () => {
    const dir = await makeStorage();
    const cache = new DeviceCache(dir, createMockLogger());
    cache.set({ id: 'doomed', model: 'PLUS1', protocol: 'websocket' }, false);
    cache.set({ id: 'kept', model: 'PLUS1', protocol: 'websocket' }, false);

    cache.delete('doomed'); // autoSave default true
    await flushSave();

    const data = JSON.parse(await fs.readFile(join(dir, FILENAME), 'utf8'));
    expect(data.devices.map((d: any) => d.id)).toEqual(['kept']);
  });

  it('iterator yields the full set of cached devices', () => {
    const cache = new DeviceCache('/tmp/never-saved', createMockLogger());
    cache.set({ id: 'a', model: 'X', protocol: 'websocket' }, false);
    cache.set({ id: 'b', model: 'Y', protocol: 'websocket' }, false);
    expect([...cache].map(d => d.id).sort()).toEqual(['a', 'b']);
  });

  it('save() handles fs errors via the saveDelayed path without throwing', async () => {
    // point the cache at a path the process can't write to
    const log = createMockLogger();
    const cache = new DeviceCache('/no/such/dir', log);
    cache.set({ id: 'a', model: 'X', protocol: 'websocket' });
    await flushSave();
    // Allow any pending microtasks (rejected fs.writeFile) to settle
    await Promise.resolve();
    expect(log.records.some(r => r.level === 'error')).toBe(true);
  });
});
