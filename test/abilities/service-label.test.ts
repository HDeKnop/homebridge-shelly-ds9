import { Characteristic, Service } from 'hap-nodejs';

import { ServiceLabelAbility } from '../../src/abilities';
import { createTestPlatform } from '../mocks/platform';
import { FakeDevice } from '../mocks/shelly';
import { DeviceLogger } from '../../src/utils/device-logger';

/**
 * ServiceLabelAbility relies on its accessory already having a ServiceLabel
 * service (the base addService() only does getService() when no subtype is
 * configured). In the real plugin that's true because the accessory is
 * constructed alongside other abilities by `createPlatformAccessory()`. We
 * mirror that here by pre-adding the service.
 */
const setupAbility = (namespace: 'dots' | 'arabicNumerals') => {
  const { platform } = createTestPlatform();
  const accessory = new platform.api.platformAccessory(
    'Label Test',
    platform.api.hap.uuid.generate(`label-${namespace}`),
  );
  accessory.addService(Service.ServiceLabel);
  const log = new DeviceLogger(new FakeDevice() as never, 'L', platform.log);
  const ability = new ServiceLabelAbility(namespace);
  ability.setup(accessory, platform, log);
  return { ability, accessory, platform };
};

describe('ServiceLabelAbility', () => {
  it('uses ARABIC_NUMERALS by default', () => {
    const { accessory, platform } = setupAbility('arabicNumerals');
    const svc = accessory.getService(Service.ServiceLabel)!;
    expect(svc.getCharacteristic(Characteristic.ServiceLabelNamespace).value).toBe(
      platform.api.hap.Characteristic.ServiceLabelNamespace.ARABIC_NUMERALS,
    );
  });

  it('switches to DOTS when configured', () => {
    const { accessory, platform } = setupAbility('dots');
    const svc = accessory.getService(Service.ServiceLabel)!;
    expect(svc.getCharacteristic(Characteristic.ServiceLabelNamespace).value).toBe(
      platform.api.hap.Characteristic.ServiceLabelNamespace.DOTS,
    );
  });

  it('detach() is a no-op', () => {
    const { ability } = setupAbility('arabicNumerals');
    expect(() => ability.detach()).not.toThrow();
  });
});
