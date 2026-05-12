import { describe, it, expect, vi } from 'vitest';

import { DeviceDelegate } from '../../src/device-delegates/base.js';

class TestDelegate1 extends DeviceDelegate {
  protected setup(): void {}
}

class TestDelegate2 extends DeviceDelegate {
  protected setup(): void {}
}

describe('DeviceDelegate registry', () => {
  it('registers and retrieves a delegate by model', () => {
    DeviceDelegate.registerDelegate(TestDelegate1 as unknown as never, { model: 'TEST-MODEL-A' });
    expect(DeviceDelegate.getDelegate('TEST-MODEL-A')).toBe(TestDelegate1);
  });

  it('registers a single delegate for multiple models', () => {
    DeviceDelegate.registerDelegate(
      TestDelegate1 as unknown as never,
      { model: 'TEST-MODEL-B' },
      { model: 'TEST-MODEL-C' },
    );
    expect(DeviceDelegate.getDelegate('TEST-MODEL-B')).toBe(TestDelegate1);
    expect(DeviceDelegate.getDelegate('TEST-MODEL-C')).toBe(TestDelegate1);
  });

  it('throws when re-registering an existing model', () => {
    DeviceDelegate.registerDelegate(TestDelegate1 as unknown as never, { model: 'TEST-MODEL-D' });
    expect(() => {
      DeviceDelegate.registerDelegate(TestDelegate2 as unknown as never, { model: 'TEST-MODEL-D' });
    }).toThrow(/already been registered/);
  });

  it('treats model lookups case-insensitively in both directions', () => {
    DeviceDelegate.registerDelegate(TestDelegate1 as unknown as never, { model: 'mixed-case-E' });
    expect(DeviceDelegate.getDelegate('MIXED-CASE-E')).toBe(TestDelegate1);
    expect(DeviceDelegate.getDelegate('mixed-case-e')).toBe(TestDelegate1);
  });

  it('returns undefined for unknown models', () => {
    expect(DeviceDelegate.getDelegate('UNREGISTERED-MODEL')).toBeUndefined();
  });

  // Silence unused-class lint
  vi.fn()(TestDelegate2);
});
