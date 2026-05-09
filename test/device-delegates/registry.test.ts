import { DeviceDelegate } from '../../src/device-delegates';

// Importing the index file registers all built-in delegates as a side effect.
import '../../src/device-delegates';

/**
 * Each Shelly model class exposes a static `model` string. The plugin matches
 * incoming devices to delegates by uppercasing this string. These tests guard
 * against regressions where a delegate file is added but not wired into the
 * registry, or where a model name shifts upstream.
 */
describe('DeviceDelegate registry', () => {
  // Core list of model identifiers we expect to be supported by this fork.
  // Keep this list in sync with src/device-delegates/index.ts.
  const expectedModels = [
    // Plus series
    'SNSW-001X16EU',     // Plus 1
    'SNSW-001P16EU',     // Plus 1 PM
    'SNSW-002P16EU',     // Plus 2 PM
    'SNSN-0024X',        // Plus i4 (4-input)
    'SNPL-00112EU',      // Plus Plug
    // Pro series
    'SPSW-001XE16EU',    // Pro 1
    'SPSW-201XE16EU',    // Pro 2
    'SPSW-001PE16EU',    // Pro 1 PM
    'SPSW-201PE16EU',    // Pro 2 PM
    'SPSW-104PE16EU',    // Pro 4 PM
    'SPSH-002PE16EU',    // Pro Dual Cover PM
  ];

  it.each(expectedModels)('has a delegate registered for model %s', (model) => {
    const cls = DeviceDelegate.getDelegate(model);
    expect(cls).toBeDefined();
  });

  it('lookup is case-insensitive', () => {
    // Pick a model that we already know exists, verify both cases resolve.
    const upper = DeviceDelegate.getDelegate('SNSW-001X16EU');
    const lower = DeviceDelegate.getDelegate('snsw-001x16eu');
    expect(upper).toBeDefined();
    expect(lower).toBe(upper);
  });

  it('returns undefined for unknown models', () => {
    expect(DeviceDelegate.getDelegate('SHELLY-NEVER-MADE')).toBeUndefined();
  });

  it('rejects double-registration of the same model', () => {
    class Dummy extends DeviceDelegate {
      protected setup() { /* noop */ }
    }
    expect(() =>
      DeviceDelegate.registerDelegate(Dummy as never, { model: 'SNSW-001X16EU' }),
    ).toThrow(/already been registered/);
  });

  it('lookup accepts a class with a `model` static field', () => {
    class FakeShellyClass {
      static model = 'SNSW-001X16EU';
    }
    expect(DeviceDelegate.getDelegate(FakeShellyClass)).toBeDefined();
  });
});
