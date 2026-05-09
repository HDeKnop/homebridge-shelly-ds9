import { ShellyPlatform, PLUGIN_NAME, PLATFORM_NAME } from '../src/platform';
import { createMockApi, createMockLogger } from './mocks/api';
import { createTestPlatform } from './mocks/platform';

describe('ShellyPlatform — construction', () => {
  it('exposes a frozen customCharacteristics map', () => {
    const { platform } = createTestPlatform();
    expect(platform.customCharacteristics).toBeDefined();
    expect(platform.customCharacteristics.CurrentConsumption).toBeDefined();
    expect(Object.isFrozen(platform.customCharacteristics)).toBe(true);
  });

  it('exposes a frozen customServices map', () => {
    const { platform } = createTestPlatform();
    expect(platform.customServices.PowerMeter).toBeDefined();
    expect(Object.isFrozen(platform.customServices)).toBe(true);
  });

  it('parses platform options from config', () => {
    const { platform } = createTestPlatform({
      mdns: { enable: false },
      websocket: { reconnectInterval: '1,2,3' },
    });
    expect(platform.options.mdns.enable).toBe(false);
    expect(platform.options.websocket.reconnectInterval).toEqual([1, 2, 3]);
  });

  it('hooks didFinishLaunching during construction', () => {
    const { platform, api } = createTestPlatform({
      // empty config — initialize() will do almost nothing because mdns is enabled
      // by default but we don't want a real mDNS service starting in tests.
      mdns: { enable: false },
    });
    expect(platform.deviceDelegates.size).toBe(0);
    // emit didFinishLaunching to drive initialize()
    api.triggerDidFinishLaunching();
    // initialize() is async — we don't await here, but it must not throw synchronously
  });
});

describe('ShellyPlatform — accessory lifecycle', () => {
  it('configureAccessory() stores accessories for later lookup by UUID', () => {
    const { platform, api } = createTestPlatform();
    const acc = new api.platformAccessory('Cached', api.hap.uuid.generate('cached-1'));
    platform.configureAccessory(acc);
    expect(platform.getAccessory(acc.UUID)).toBe(acc);
  });

  it('addAccessory() registers new accessories with homebridge', () => {
    const { platform, api } = createTestPlatform();
    const acc = new api.platformAccessory('A', api.hap.uuid.generate('add-1'));
    platform.addAccessory(acc);

    const reg = api.registrations.find(r => r.kind === 'register');
    expect(reg).toBeDefined();
    expect(reg!.pluginIdentifier).toBe(PLUGIN_NAME);
    expect(reg!.platformName).toBe(PLATFORM_NAME);
    expect(reg!.accessories).toContain(acc);
    expect(platform.getAccessory(acc.UUID)).toBe(acc);
  });

  it('addAccessory() with an already-bridged accessory updates instead of re-registering (PR #11)', () => {
    const { platform, api } = createTestPlatform();
    const acc = new api.platformAccessory('A', api.hap.uuid.generate('update-1'));
    platform.configureAccessory(acc); // simulate cache load
    platform.addAccessory(acc);

    expect(api.registrations.filter(r => r.kind === 'register')).toHaveLength(0);
    expect(api.registrations.filter(r => r.kind === 'update')).toHaveLength(1);
    expect(api.registrations[0].accessories).toContain(acc);
  });

  it('addAccessory() is a no-op when called with no arguments', () => {
    const { platform, api } = createTestPlatform();
    platform.addAccessory();
    expect(api.registrations).toHaveLength(0);
  });

  it('addAccessory() handles a mix of new and already-bridged accessories', () => {
    const { platform, api } = createTestPlatform();
    const cached = new api.platformAccessory('C', api.hap.uuid.generate('mix-cached'));
    const fresh = new api.platformAccessory('F', api.hap.uuid.generate('mix-fresh'));
    platform.configureAccessory(cached);
    platform.addAccessory(cached, fresh);

    const reg = api.registrations.filter(r => r.kind === 'register');
    const upd = api.registrations.filter(r => r.kind === 'update');

    expect(reg).toHaveLength(1);
    expect(reg[0].accessories).toEqual([fresh]);
    expect(upd).toHaveLength(1);
    expect(upd[0].accessories).toEqual([cached]);
  });

  it('removeAccessory() unregisters and forgets accessories', () => {
    const { platform, api } = createTestPlatform();
    const acc = new api.platformAccessory('A', api.hap.uuid.generate('rm-1'));
    platform.addAccessory(acc);
    api.registrations.length = 0; // reset

    platform.removeAccessory(acc);

    const unr = api.registrations.find(r => r.kind === 'unregister');
    expect(unr).toBeDefined();
    expect(unr!.accessories).toContain(acc);
    expect(platform.getAccessory(acc.UUID)).toBeUndefined();
  });

  it('removeAccessory() with no args is a no-op', () => {
    const { platform, api } = createTestPlatform();
    platform.removeAccessory();
    expect(api.registrations).toHaveLength(0);
  });

  it('cross-device isolation: each platform instance has independent accessory state', () => {
    // Two completely independent platforms must not share accessory maps.
    const a = createTestPlatform();
    const b = createTestPlatform();

    const accA = new a.api.platformAccessory('A', a.api.hap.uuid.generate('iso-a'));
    const accB = new b.api.platformAccessory('B', b.api.hap.uuid.generate('iso-b'));

    a.platform.addAccessory(accA);
    b.platform.addAccessory(accB);

    expect(a.platform.getAccessory(accA.UUID)).toBe(accA);
    expect(a.platform.getAccessory(accB.UUID)).toBeUndefined();
    expect(b.platform.getAccessory(accB.UUID)).toBe(accB);
    expect(b.platform.getAccessory(accA.UUID)).toBeUndefined();
  });

  it('keeps separate registration logs per API mock (no cross-contamination)', () => {
    const a = createTestPlatform();
    const b = createTestPlatform();

    a.platform.addAccessory(
      new a.api.platformAccessory('Aacc', a.api.hap.uuid.generate('log-a')),
    );
    b.platform.addAccessory(
      new b.api.platformAccessory('Bacc', b.api.hap.uuid.generate('log-b')),
    );

    expect(a.api.registrations).toHaveLength(1);
    expect(b.api.registrations).toHaveLength(1);
  });
});

describe('ShellyPlatform — exported names', () => {
  it('uses fork-specific plugin and platform identifiers', () => {
    expect(PLUGIN_NAME).toMatch(/homebridge-shelly-ds9-dev/);
    expect(PLATFORM_NAME).toMatch(/ShellyDS9-dev/);
  });
});
