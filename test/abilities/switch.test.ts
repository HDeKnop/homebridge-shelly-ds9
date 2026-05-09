import { Characteristic, Service } from 'hap-nodejs';

import { SwitchAbility } from '../../src/abilities';
import { createTestPlatform } from '../mocks/platform';
import { createSwitch, FakeSwitch } from '../mocks/shelly';
import { DeviceLogger } from '../../src/utils/device-logger';

const setupAbility = (component: FakeSwitch) => {
  const { platform } = createTestPlatform();
  const accessory = new platform.api.platformAccessory(
    'Test',
    platform.api.hap.uuid.generate('shelly-test-switch'),
  );
  const log = new DeviceLogger(component.device as never, 'TestSwitch', platform.log);
  const ability = new SwitchAbility(component as never);
  ability.setup(accessory, platform, log);
  const service = accessory.getServiceById(Service.Switch, `switch-${component.id}`)!;
  return { ability, accessory, platform, log, service };
};

describe('SwitchAbility', () => {
  it('exposes a Switch service and reflects initial output state', () => {
    const sw = createSwitch({ id: 0, output: true });
    const { service } = setupAbility(sw);

    expect(service).toBeDefined();
    expect(service.getCharacteristic(Characteristic.On).value).toBe(true);
  });

  it('uses the device-config friendly name for displayName when set', () => {
    const sw = createSwitch({ id: 1, config: { name: 'Kitchen Light' } });
    const { service } = setupAbility(sw);

    expect(service.displayName).toBe('Kitchen Light');
  });

  it('falls back to "Switch <n>" when no friendly name is configured', () => {
    const sw = createSwitch({ id: 2 });
    const { service } = setupAbility(sw);

    expect(service.displayName).toBe('Switch 3');
  });

  it('forwards HomeKit On=true to component.set when state differs', async () => {
    const sw = createSwitch({ id: 0, output: false });
    const { service } = setupAbility(sw);

    await service.getCharacteristic(Characteristic.On).handleSetRequest(true);
    expect(sw.set).toHaveBeenCalledWith(true);
  });

  it('skips the device call when HomeKit set value matches current output', async () => {
    const sw = createSwitch({ id: 0, output: true });
    const { service } = setupAbility(sw);

    await service.getCharacteristic(Characteristic.On).handleSetRequest(true);
    expect(sw.set).not.toHaveBeenCalled();
  });

  it('throws SERVICE_COMMUNICATION_FAILURE when component.set rejects', async () => {
    const sw = createSwitch({ id: 0, output: false });
    sw.set.mockRejectedValueOnce(new Error('socket closed'));
    const { service, platform } = setupAbility(sw);

    await expect(
      service.getCharacteristic(Characteristic.On).handleSetRequest(true),
    ).rejects.toBe(platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
  });

  it('updates HomeKit On characteristic when device emits change:output', () => {
    const sw = createSwitch({ id: 0, output: false });
    const { service } = setupAbility(sw);
    const onChar = service.getCharacteristic(Characteristic.On);

    sw.setState('output', true);
    expect(onChar.value).toBe(true);

    sw.setState('output', false);
    expect(onChar.value).toBe(false);
  });

  it('detach() unsubscribes from the change:output event', () => {
    const sw = createSwitch({ id: 0, output: false });
    const { ability, service } = setupAbility(sw);
    const onChar = service.getCharacteristic(Characteristic.On);

    expect(sw.listenerCount('change:output')).toBeGreaterThan(0);
    ability.detach();
    expect(sw.listenerCount('change:output')).toBe(0);

    sw.setState('output', true);
    expect(onChar.value).toBe(false);
  });
});
