import { Service } from '@homebridge/hap-nodejs';

import { PowerMeterAbility } from '../../src/abilities';
import { createTestPlatform } from '../mocks/platform';
import { createSwitch, FakeSwitch } from '../mocks/shelly';
import { DeviceLogger } from '../../src/utils/device-logger';

const setupAbility = (component: FakeSwitch) => {
  const { platform } = createTestPlatform();
  const accessory = new platform.api.platformAccessory(
    'PM Test',
    platform.api.hap.uuid.generate('shelly-test-pm'),
  );
  const log = new DeviceLogger(component.device as never, 'TestPM', platform.log);
  const ability = new PowerMeterAbility(component as never);
  ability.setup(accessory, platform, log);

  // The PowerMeter service is a custom service whose UUID matches platform.customServices.PowerMeter
  const service = accessory.services.find(
    s => s.subtype === `power-meter-${component.id}`,
  )!;
  return { ability, accessory, platform, log, service };
};

describe('PowerMeterAbility', () => {
  it('initializes CurrentConsumption from apower', () => {
    const sw = createSwitch({ id: 0, apower: 42.5 });
    const { service, platform } = setupAbility(sw);
    const cc = platform.customCharacteristics.CurrentConsumption;
    expect(service.getCharacteristic(cc).value).toBe(42.5);
  });

  it('clamps negative apower to 0 (HomeKit does not allow negative values)', () => {
    const sw = createSwitch({ id: 0, apower: 5 });
    const { service, platform } = setupAbility(sw);

    sw.setState('apower', -3);

    const cc = platform.customCharacteristics.CurrentConsumption;
    expect(service.getCharacteristic(cc).value).toBe(0);
  });

  it('updates CurrentConsumption on positive apower change', () => {
    const sw = createSwitch({ id: 0, apower: 0 });
    const { service, platform } = setupAbility(sw);
    sw.setState('apower', 125);
    expect(service.getCharacteristic(platform.customCharacteristics.CurrentConsumption).value).toBe(125);
  });

  it('updates Voltage when voltage changes', () => {
    const sw = createSwitch({ id: 0, apower: 0, voltage: 230 });
    const { service, platform } = setupAbility(sw);
    sw.setState('voltage', 232.5);
    expect(service.getCharacteristic(platform.customCharacteristics.Voltage).value).toBe(232.5);
  });

  it('updates ElectricCurrent when current changes', () => {
    const sw = createSwitch({ id: 0, apower: 0, current: 0.5 });
    const { service, platform } = setupAbility(sw);
    sw.setState('current', 1.2);
    // hap-nodejs rounds to minStep (0.1) which can yield 1.2 ± float epsilon
    expect(service.getCharacteristic(platform.customCharacteristics.ElectricCurrent).value as number)
      .toBeCloseTo(1.2, 5);
  });

  it('updates TotalConsumption from aenergy.total (Wh → kWh)', () => {
    const sw = createSwitch({ id: 0, apower: 0, aenergy: { total: 0 } });
    const { service, platform } = setupAbility(sw);
    sw.setState('aenergy', { total: 12500 });
    expect(service.getCharacteristic(platform.customCharacteristics.TotalConsumption).value).toBe(12.5);
  });

  it('detach() unsubscribes from all change events', () => {
    const sw = createSwitch({ id: 0, apower: 0, voltage: 230, current: 0.5, aenergy: { total: 1000 } });
    const { ability } = setupAbility(sw);
    ability.detach();
    expect(sw.listenerCount('change:apower')).toBe(0);
    expect(sw.listenerCount('change:voltage')).toBe(0);
    expect(sw.listenerCount('change:current')).toBe(0);
    expect(sw.listenerCount('change:aenergy')).toBe(0);
  });
});
