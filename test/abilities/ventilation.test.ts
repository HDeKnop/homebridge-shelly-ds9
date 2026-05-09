import { Characteristic, Service } from 'hap-nodejs';

import { VentilationAbility } from '../../src/abilities';
import { createTestPlatform } from '../mocks/platform';
import { createLight, FakeLight } from '../mocks/shelly';
import { DeviceLogger } from '../../src/utils/device-logger';

const setupAbility = (component: FakeLight) => {
  const { platform } = createTestPlatform();
  const accessory = new platform.api.platformAccessory(
    'Vent Test',
    platform.api.hap.uuid.generate('shelly-test-vent'),
  );
  const log = new DeviceLogger(component.device as never, 'TestVent', platform.log);
  const ability = new VentilationAbility(component as never);
  ability.setup(accessory, platform, log);
  // VentilationAbility prefers Fanv2 when available (which it is in real hap-nodejs)
  const service = accessory.getServiceById(Service.Fanv2, `light-${component.id}`)
    ?? accessory.getServiceById(Service.Fan, `light-${component.id}`)!;
  return { ability, accessory, platform, log, service: service! };
};

describe('VentilationAbility', () => {
  it('exposes a Fanv2 service with initial Active and RotationSpeed', () => {
    const light = createLight({ id: 0, output: true, brightness: 60 });
    const { service, platform } = setupAbility(light);

    expect(service.UUID).toBe(Service.Fanv2.UUID);
    expect(service.getCharacteristic(Characteristic.Active).value).toBe(
      platform.api.hap.Characteristic.Active.ACTIVE,
    );
    expect(service.getCharacteristic(Characteristic.RotationSpeed).value).toBe(60);
  });

  it('initializes Active=INACTIVE when output is false', () => {
    const light = createLight({ id: 0, output: false, brightness: 0 });
    const { service, platform } = setupAbility(light);
    expect(service.getCharacteristic(Characteristic.Active).value).toBe(
      platform.api.hap.Characteristic.Active.INACTIVE,
    );
  });

  it('forwards Active=ACTIVE to component.set(true)', async () => {
    const light = createLight({ id: 0, output: false });
    const { service, platform } = setupAbility(light);
    await service.getCharacteristic(Characteristic.Active).handleSetRequest(
      platform.api.hap.Characteristic.Active.ACTIVE,
    );
    expect(light.set).toHaveBeenCalledWith(true);
  });

  it('skips component.set when Active value matches output', async () => {
    const light = createLight({ id: 0, output: true });
    const { service, platform } = setupAbility(light);
    await service.getCharacteristic(Characteristic.Active).handleSetRequest(
      platform.api.hap.Characteristic.Active.ACTIVE,
    );
    expect(light.set).not.toHaveBeenCalled();
  });

  it('RotationSpeed=0 triggers component.set(false) (turns fan off)', async () => {
    const light = createLight({ id: 0, output: true, brightness: 50 });
    const { service } = setupAbility(light);
    await service.getCharacteristic(Characteristic.RotationSpeed).handleSetRequest(0);
    expect(light.set).toHaveBeenCalledWith(false);
  });

  it('RotationSpeed>0 sends component.set(true, speed)', async () => {
    const light = createLight({ id: 0, output: false, brightness: 0 });
    const { service } = setupAbility(light);
    await service.getCharacteristic(Characteristic.RotationSpeed).handleSetRequest(75);
    expect(light.set).toHaveBeenCalledWith(true, 75);
  });

  it('clamps RotationSpeed to [0,100]', async () => {
    const light = createLight({ id: 0, brightness: 50 });
    const { service } = setupAbility(light);
    await service.getCharacteristic(Characteristic.RotationSpeed).handleSetRequest(150);
    // hap-nodejs validation will clamp before the handler sees it; verify via component.set
    // Either way, our handler also clamps internally — set() should be called with 100
    expect(light.set).toHaveBeenCalledWith(true, 100);
  });

  it('skips RotationSpeed set when speed unchanged', async () => {
    const light = createLight({ id: 0, output: true, brightness: 60 });
    const { service } = setupAbility(light);
    await service.getCharacteristic(Characteristic.RotationSpeed).handleSetRequest(60);
    expect(light.set).not.toHaveBeenCalled();
  });

  it('updates Active from change:output', () => {
    const light = createLight({ id: 0, output: false });
    const { service, platform } = setupAbility(light);
    light.setState('output', true);
    expect(service.getCharacteristic(Characteristic.Active).value).toBe(
      platform.api.hap.Characteristic.Active.ACTIVE,
    );
  });

  it('updates RotationSpeed and Active from change:brightness', () => {
    const light = createLight({ id: 0, output: false, brightness: 0 });
    const { service, platform } = setupAbility(light);
    light.setState('brightness', 80);
    expect(service.getCharacteristic(Characteristic.RotationSpeed).value).toBe(80);
    expect(service.getCharacteristic(Characteristic.Active).value).toBe(
      platform.api.hap.Characteristic.Active.ACTIVE,
    );
  });

  it('throws SERVICE_COMMUNICATION_FAILURE on Active set failure', async () => {
    const light = createLight({ id: 0, output: false });
    light.set.mockRejectedValueOnce(new Error('rpc'));
    const { service, platform } = setupAbility(light);

    await expect(
      service.getCharacteristic(Characteristic.Active).handleSetRequest(
        platform.api.hap.Characteristic.Active.ACTIVE,
      ),
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
