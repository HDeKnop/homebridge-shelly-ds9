import { Characteristic, Service } from '@homebridge/hap-nodejs';

import { OutletAbility } from '../../src/abilities';
import { createTestPlatform } from '../mocks/platform';
import { createSwitch, FakeSwitch } from '../mocks/shelly';
import { DeviceLogger } from '../../src/utils/device-logger';

const setupAbility = (component: FakeSwitch) => {
  const { platform } = createTestPlatform();
  const accessory = new platform.api.platformAccessory(
    'Outlet Test',
    platform.api.hap.uuid.generate('shelly-test-outlet'),
  );
  const log = new DeviceLogger(component.device as never, 'TestOutlet', platform.log);
  const ability = new OutletAbility(component as never);
  ability.setup(accessory, platform, log);
  const service = accessory.getServiceById(Service.Outlet, `outlet-${component.id}`)!;
  return { ability, accessory, platform, log, service };
};

describe('OutletAbility', () => {
  it('exposes Outlet service with On + OutletInUse', () => {
    const sw = createSwitch({ id: 0, output: true, apower: 42.5 });
    const { service } = setupAbility(sw);

    expect(service.getCharacteristic(Characteristic.On).value).toBe(true);
    expect(service.getCharacteristic(Characteristic.OutletInUse).value).toBe(true);
  });

  it('reports OutletInUse=false when apower is undefined', () => {
    const sw = createSwitch({ id: 0, output: false });
    const { service } = setupAbility(sw);
    expect(service.getCharacteristic(Characteristic.OutletInUse).value).toBe(false);
  });

  it('reports OutletInUse=false when apower is 0', () => {
    const sw = createSwitch({ id: 0, output: true, apower: 0 });
    const { service } = setupAbility(sw);
    expect(service.getCharacteristic(Characteristic.OutletInUse).value).toBe(false);
  });

  it('subscribes to change:apower so OutletInUse stays in sync', () => {
    const sw = createSwitch({ id: 0, apower: 0 });
    setupAbility(sw);
    expect(sw.listenerCount('change:apower')).toBeGreaterThan(0);
  });

  it('forwards HomeKit On to component.set', async () => {
    const sw = createSwitch({ id: 0, output: false });
    const { service } = setupAbility(sw);
    await service.getCharacteristic(Characteristic.On).handleSetRequest(true);
    expect(sw.set).toHaveBeenCalledWith(true);
  });

  it('uses the device-config friendly name', () => {
    const sw = createSwitch({ id: 1, config: { name: 'Coffee Maker' } });
    const { service } = setupAbility(sw);
    expect(service.displayName).toBe('Coffee Maker');
  });

  it('throws SERVICE_COMMUNICATION_FAILURE when component.set rejects', async () => {
    const sw = createSwitch({ id: 0, output: false });
    sw.set.mockRejectedValueOnce(new Error('disconnected'));
    const { service, platform } = setupAbility(sw);

    await expect(
      service.getCharacteristic(Characteristic.On).handleSetRequest(true),
    ).rejects.toBe(platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
  });

  it('detach() unsubscribes from change:output and change:apower', () => {
    const sw = createSwitch({ id: 0, apower: 0 });
    const { ability } = setupAbility(sw);

    expect(sw.listenerCount('change:output')).toBeGreaterThan(0);
    expect(sw.listenerCount('change:apower')).toBeGreaterThan(0);

    ability.detach();

    expect(sw.listenerCount('change:output')).toBe(0);
    expect(sw.listenerCount('change:apower')).toBe(0);
  });
});
