import { Characteristic, Service, Perms } from 'hap-nodejs';

import { ReadonlySwitchAbility } from '../../src/abilities';
import { createTestPlatform } from '../mocks/platform';
import { createInput, FakeInput } from '../mocks/shelly';
import { DeviceLogger } from '../../src/utils/device-logger';

const setupAbility = (component: FakeInput) => {
  const { platform } = createTestPlatform();
  const accessory = new platform.api.platformAccessory(
    'I4 Test',
    platform.api.hap.uuid.generate('shelly-test-roswitch'),
  );
  const log = new DeviceLogger(component.device as never, 'TestI4', platform.log);
  const ability = new ReadonlySwitchAbility(component as never);
  ability.setup(accessory, platform, log);
  const service = accessory.getServiceById(Service.Switch, `readonly-switch-${component.id}`)!;
  return { ability, accessory, service };
};

describe('ReadonlySwitchAbility', () => {
  it('exposes a Switch service whose On characteristic is read-only', () => {
    const input = createInput({ id: 0, state: true });
    const { service } = setupAbility(input);
    const onChar = service.getCharacteristic(Characteristic.On);

    expect(onChar.value).toBe(true);
    // perms must NOT include WRITE / PAIRED_WRITE
    expect(onChar.props.perms).toEqual(expect.arrayContaining([Perms.NOTIFY, Perms.PAIRED_READ]));
    expect(onChar.props.perms).not.toEqual(expect.arrayContaining([Perms.PAIRED_WRITE]));
  });

  it('coerces null state to false on initialize', () => {
    const input = createInput({ id: 0, state: null });
    const { service } = setupAbility(input);
    expect(service.getCharacteristic(Characteristic.On).value).toBe(false);
  });

  it('updates On when input state changes', () => {
    const input = createInput({ id: 0, state: false });
    const { service } = setupAbility(input);
    input.setState('state', true);
    expect(service.getCharacteristic(Characteristic.On).value).toBe(true);
  });

  it('coerces null state to false on event', () => {
    const input = createInput({ id: 0, state: true });
    const { service } = setupAbility(input);
    input.setState('state', null);
    expect(service.getCharacteristic(Characteristic.On).value).toBe(false);
  });

  it('detach() unsubscribes', () => {
    const input = createInput({ id: 0 });
    const { ability } = setupAbility(input);
    ability.detach();
    expect(input.listenerCount('change:state')).toBe(0);
  });
});
