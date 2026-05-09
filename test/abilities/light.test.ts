import { Characteristic, Service } from 'hap-nodejs';

import { LightAbility } from '../../src/abilities';
import { createTestPlatform } from '../mocks/platform';
import { createLight, FakeLight } from '../mocks/shelly';
import { DeviceLogger } from '../../src/utils/device-logger';

const setupAbility = (component: FakeLight) => {
  const { platform } = createTestPlatform();
  const accessory = new platform.api.platformAccessory(
    'Light Test',
    platform.api.hap.uuid.generate('shelly-test-light'),
  );
  const log = new DeviceLogger(component.device as never, 'TestLight', platform.log);
  const ability = new LightAbility(component as never);
  ability.setup(accessory, platform, log);
  const service = accessory.getServiceById(Service.Lightbulb, `light-${component.id}`)!;
  return { ability, accessory, platform, log, service };
};

describe('LightAbility', () => {
  it('exposes a Lightbulb service with initial On state', () => {
    const light = createLight({ id: 0, output: true });
    const { service } = setupAbility(light);
    expect(service.getCharacteristic(Characteristic.On).value).toBe(true);
  });

  it('forwards HomeKit On=true via component.set', async () => {
    const light = createLight({ id: 0, output: false });
    const { service } = setupAbility(light);
    await service.getCharacteristic(Characteristic.On).handleSetRequest(true);
    expect(light.set).toHaveBeenCalledWith(true);
  });

  it('skips component.set when value matches current output', async () => {
    const light = createLight({ id: 0, output: true });
    const { service } = setupAbility(light);
    await service.getCharacteristic(Characteristic.On).handleSetRequest(true);
    expect(light.set).not.toHaveBeenCalled();
  });

  it('forwards HomeKit Brightness via component.set(undefined, brightness)', async () => {
    const light = createLight({ id: 0, brightness: 50 });
    const { service } = setupAbility(light);
    await service.getCharacteristic(Characteristic.Brightness).handleSetRequest(75);
    expect(light.set).toHaveBeenCalledWith(undefined, 75);
  });

  it('skips Brightness set when value unchanged', async () => {
    const light = createLight({ id: 0, brightness: 50 });
    const { service } = setupAbility(light);
    await service.getCharacteristic(Characteristic.Brightness).handleSetRequest(50);
    expect(light.set).not.toHaveBeenCalled();
  });

  it('updates On characteristic from change:output', () => {
    const light = createLight({ id: 0, output: false });
    const { service } = setupAbility(light);
    light.setState('output', true);
    expect(service.getCharacteristic(Characteristic.On).value).toBe(true);
  });

  it('updates Brightness from change:brightness', () => {
    const light = createLight({ id: 0, brightness: 0 });
    const { service } = setupAbility(light);
    light.setState('brightness', 80);
    expect(service.getCharacteristic(Characteristic.Brightness).value).toBe(80);
  });

  it('throws SERVICE_COMMUNICATION_FAILURE on On set failure', async () => {
    const light = createLight({ id: 0, output: false });
    light.set.mockRejectedValueOnce(new Error('rpc error'));
    const { service, platform } = setupAbility(light);

    await expect(
      service.getCharacteristic(Characteristic.On).handleSetRequest(true),
    ).rejects.toBe(platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
  });

  it('throws SERVICE_COMMUNICATION_FAILURE on Brightness set failure', async () => {
    const light = createLight({ id: 0, brightness: 0 });
    light.set.mockRejectedValueOnce(new Error('rpc error'));
    const { service, platform } = setupAbility(light);

    await expect(
      service.getCharacteristic(Characteristic.Brightness).handleSetRequest(50),
    ).rejects.toBe(platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
  });

  it('detach() unsubscribes from change:output and change:brightness', () => {
    const light = createLight({ id: 0 });
    const { ability } = setupAbility(light);
    ability.detach();
    expect(light.listenerCount('change:output')).toBe(0);
    expect(light.listenerCount('change:brightness')).toBe(0);
  });
});
