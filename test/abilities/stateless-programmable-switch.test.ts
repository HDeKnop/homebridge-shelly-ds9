import { Characteristic, Service } from 'hap-nodejs';

import { StatelessProgrammableSwitchAbility } from '../../src/abilities';
import { createTestPlatform } from '../mocks/platform';
import { createInput, FakeInput } from '../mocks/shelly';
import { DeviceLogger } from '../../src/utils/device-logger';

const setupAbility = (component: FakeInput) => {
  const { platform } = createTestPlatform();
  const accessory = new platform.api.platformAccessory(
    'Buttons',
    platform.api.hap.uuid.generate('shelly-test-buttons'),
  );
  const log = new DeviceLogger(component.device as never, 'TestButtons', platform.log);
  const ability = new StatelessProgrammableSwitchAbility(component as never);
  ability.setup(accessory, platform, log);
  const service = accessory.getServiceById(
    Service.StatelessProgrammableSwitch,
    `stateless-programmable-switch-${component.id}`,
  )!;
  return { ability, accessory, service, platform };
};

describe('StatelessProgrammableSwitchAbility', () => {
  it('sets ServiceLabelIndex to component.id + 1', () => {
    const input = createInput({ id: 2 });
    const { service } = setupAbility(input);
    expect(service.getCharacteristic(Characteristic.ServiceLabelIndex).value).toBe(3);
  });

  it('emits SINGLE_PRESS on singlePush', () => {
    const input = createInput({ id: 0 });
    const { service, platform } = setupAbility(input);
    const PSE = platform.api.hap.Characteristic.ProgrammableSwitchEvent;
    const updates: unknown[] = [];
    service.getCharacteristic(Characteristic.ProgrammableSwitchEvent).on('change', e => updates.push(e.newValue));

    input.emit('singlePush');
    expect(updates).toContain(PSE.SINGLE_PRESS);
  });

  it('emits DOUBLE_PRESS on doublePush', () => {
    const input = createInput({ id: 0 });
    const { service, platform } = setupAbility(input);
    const PSE = platform.api.hap.Characteristic.ProgrammableSwitchEvent;
    const updates: unknown[] = [];
    service.getCharacteristic(Characteristic.ProgrammableSwitchEvent).on('change', e => updates.push(e.newValue));

    input.emit('doublePush');
    expect(updates).toContain(PSE.DOUBLE_PRESS);
  });

  it('emits LONG_PRESS on longPush', () => {
    const input = createInput({ id: 0 });
    const { service, platform } = setupAbility(input);
    const PSE = platform.api.hap.Characteristic.ProgrammableSwitchEvent;
    const updates: unknown[] = [];
    service.getCharacteristic(Characteristic.ProgrammableSwitchEvent).on('change', e => updates.push(e.newValue));

    input.emit('longPush');
    expect(updates).toContain(PSE.LONG_PRESS);
  });

  it('detach() unsubscribes from all push events', () => {
    const input = createInput({ id: 0 });
    const { ability } = setupAbility(input);
    ability.detach();
    expect(input.listenerCount('singlePush')).toBe(0);
    expect(input.listenerCount('doublePush')).toBe(0);
    expect(input.listenerCount('longPush')).toBe(0);
  });
});
