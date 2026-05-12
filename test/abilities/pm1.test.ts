import { Characteristic } from '@homebridge/hap-nodejs';

import { Pm1Ability } from '../../src/abilities';
import { createTestPlatform } from '../mocks/platform';
import { FakeComponent, FakeDevice } from '../mocks/shelly';
import { DeviceLogger } from '../../src/utils/device-logger';
import EventEmitter from 'eventemitter3';

interface FakePm1 extends EventEmitter {
  id: number;
  key: string;
  device: FakeDevice;
  config?: Record<string, unknown>;
  apower?: number;
  voltage?: number;
  current?: number;
  aenergy?: { total: number };
  setState(prop: string, value: unknown): void;
}

const createPm1 = (opts: Partial<FakePm1> = {}): FakePm1 => {
  const c = new FakeComponent({
    id: opts.id ?? 0,
    key: `pm1:${opts.id ?? 0}`,
    device: opts.device,
    config: opts.config,
  }) as unknown as FakePm1;
  c.apower = opts.apower;
  c.voltage = opts.voltage;
  c.current = opts.current;
  c.aenergy = opts.aenergy;
  return c;
};

const setupAbility = (component: FakePm1) => {
  const { platform } = createTestPlatform();
  const accessory = new platform.api.platformAccessory(
    'PM1 Test',
    platform.api.hap.uuid.generate(`shelly-test-pm1-${component.id}`),
  );
  const log = new DeviceLogger(component.device as never, 'TestPM1', platform.log);
  const ability = new Pm1Ability(component as never);
  ability.setup(accessory, platform, log);
  const service = accessory.services.find(s => s.subtype === `Pm1-${component.id}`)!;
  return { ability, accessory, platform, log, service };
};

describe('Pm1Ability', () => {
  it('initializes CurrentConsumption from apower and On=false', () => {
    const c = createPm1({ apower: 80 });
    const { service, platform } = setupAbility(c);
    expect(service.getCharacteristic(platform.customCharacteristics.CurrentConsumption).value).toBe(80);
    expect(service.getCharacteristic(Characteristic.On).value).toBe(false);
  });

  it('flips On=true when apower crosses 1W', () => {
    const c = createPm1({ apower: 0 });
    const { service } = setupAbility(c);
    c.setState('apower', 5);
    expect(service.getCharacteristic(Characteristic.On).value).toBe(true);
  });

  it('flips On=false when apower drops below 1W', () => {
    const c = createPm1({ apower: 5 });
    const { service } = setupAbility(c);
    c.setState('apower', 0.4);
    expect(service.getCharacteristic(Characteristic.On).value).toBe(false);
  });

  it('updates voltage / current / aenergy independently', () => {
    const c = createPm1({ apower: 0, voltage: 230, current: 0, aenergy: { total: 0 } });
    const { service, platform } = setupAbility(c);

    c.setState('voltage', 235);
    c.setState('current', 0.5);
    c.setState('aenergy', { total: 5000 });

    expect(service.getCharacteristic(platform.customCharacteristics.Voltage).value).toBe(235);
    expect(service.getCharacteristic(platform.customCharacteristics.ElectricCurrent).value as number)
      .toBeCloseTo(0.5, 5);
    expect(service.getCharacteristic(platform.customCharacteristics.TotalConsumption).value).toBe(5);
  });

  it('detach() removes all change listeners', () => {
    const c = createPm1({ apower: 0, voltage: 230, current: 0.5, aenergy: { total: 0 } });
    const { ability } = setupAbility(c);
    ability.detach();
    expect(c.listenerCount('change:apower')).toBe(0);
    expect(c.listenerCount('change:voltage')).toBe(0);
    expect(c.listenerCount('change:current')).toBe(0);
    expect(c.listenerCount('change:aenergy')).toBe(0);
  });
});
