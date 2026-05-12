import { describe, it, expect } from 'vitest';

import { DeviceDelegate } from '../../src/device-delegates/index.js';

/**
 * The index.ts barrel imports every delegate file, each of which calls
 * `DeviceDelegate.registerDelegate(...)` at module load time. After loading
 * the barrel, the registry must contain every supported device model.
 *
 * These spot-checks catch (a) a delegate file getting unintentionally dropped
 * from the barrel and (b) a model string drift between shellies-ds9 and our
 * registration call.
 */
describe('device-delegates registry', () => {
  it('contains the Shelly Plus 1 (SNSW-001X16EU)', () => {
    expect(DeviceDelegate.getDelegate('SNSW-001X16EU')).toBeDefined();
  });

  it('contains the Shelly Plus 2 PM (SNSW-002P16EU)', () => {
    expect(DeviceDelegate.getDelegate('SNSW-002P16EU')).toBeDefined();
  });

  it('contains the Shelly Plus 1 PM (SNSW-001P16EU)', () => {
    expect(DeviceDelegate.getDelegate('SNSW-001P16EU')).toBeDefined();
  });

  it('contains the Shelly Plus I4 (SNSN-0024X)', () => {
    expect(DeviceDelegate.getDelegate('SNSN-0024X')).toBeDefined();
  });

  it('contains the Shelly Plus Dimmer (SNDM-00100WW)', () => {
    expect(DeviceDelegate.getDelegate('SNDM-00100WW')).toBeDefined();
  });

  it('returns undefined for an unknown model', () => {
    expect(DeviceDelegate.getDelegate('ZZZ-NONEXISTENT')).toBeUndefined();
  });

  it('looks up models case-insensitively', () => {
    expect(DeviceDelegate.getDelegate('snsw-001x16eu')).toBeDefined();
    expect(DeviceDelegate.getDelegate('SNSW-001X16EU')).toBeDefined();
  });

  it('accepts a device class object (uses static .model)', () => {
    expect(DeviceDelegate.getDelegate({ model: 'SNSW-001X16EU' })).toBeDefined();
  });

  it('covers every variant of the Plus 1 family (v1, UL, v3, Mini, MiniV3)', () => {
    const ids = ['SNSW-001X16EU', 'SNSW-001X15UL', 'S3SW-001X16EU', 'SNSW-001X8EU', 'S3SW-001X8EU'];
    for (const id of ids) {
      expect(DeviceDelegate.getDelegate(id), id).toBeDefined();
    }
  });
});
