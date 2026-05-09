import { Characteristic, Service } from 'hap-nodejs';

import { AccessoryInformationAbility } from '../../src/abilities';
import { createTestPlatform } from '../mocks/platform';
import { FakeDevice } from '../mocks/shelly';
import { DeviceLogger } from '../../src/utils/device-logger';

describe('AccessoryInformationAbility', () => {
  const setup = (device: FakeDevice) => {
    const { platform } = createTestPlatform();
    const accessory = new platform.api.platformAccessory(
      'My Shelly',
      platform.api.hap.uuid.generate('shelly-info-test'),
    );
    const log = new DeviceLogger(device as never, 'Info', platform.log);
    const ability = new AccessoryInformationAbility(device as never);
    ability.setup(accessory, platform, log);
    return { ability, accessory, platform, log };
  };

  it('populates Name, Manufacturer, Model, Serial, FirmwareRevision', () => {
    const device = new FakeDevice({
      modelName: 'Shelly Plus 1',
      macAddress: 'AA:BB:CC:11:22:33',
      firmwareVersion: '1.2.3',
    });
    const { accessory } = setup(device);
    const info = accessory.getService(Service.AccessoryInformation)!;

    expect(info.getCharacteristic(Characteristic.Name).value).toBe('My Shelly');
    expect(info.getCharacteristic(Characteristic.Manufacturer).value).toBe('Allterco');
    expect(info.getCharacteristic(Characteristic.Model).value).toBe('Shelly Plus 1');
    expect(info.getCharacteristic(Characteristic.SerialNumber).value).toBe('AA:BB:CC:11:22:33');
    expect(info.getCharacteristic(Characteristic.FirmwareRevision).value).toBe('1.2.3');
  });

  it('falls back to "1.0.0" when firmware version is missing/empty', () => {
    const device = new FakeDevice({ firmwareVersion: '' });
    const { accessory } = setup(device);
    const info = accessory.getService(Service.AccessoryInformation)!;
    expect(info.getCharacteristic(Characteristic.FirmwareRevision).value).toBe('1.0.0');
  });

  it('detach() does not throw (no listeners to clean up)', () => {
    const device = new FakeDevice();
    const { ability } = setup(device);
    expect(() => ability.detach()).not.toThrow();
  });
});
