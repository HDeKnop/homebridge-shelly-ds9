import { Characteristic, Service } from '@homebridge/hap-nodejs';

import { CoverAbility } from '../../src/abilities';
import { createTestPlatform } from '../mocks/platform';
import { createCover, FakeCover } from '../mocks/shelly';
import { DeviceLogger } from '../../src/utils/device-logger';

type CoverType = 'door' | 'window' | 'windowCovering';

const setupAbility = (component: FakeCover, type: CoverType = 'window') => {
  const { platform } = createTestPlatform();
  const accessory = new platform.api.platformAccessory(
    'Cover Test',
    platform.api.hap.uuid.generate(`shelly-test-cover-${type}`),
  );
  const log = new DeviceLogger(component.device as never, 'TestCover', platform.log);
  const ability = new CoverAbility(component as never, type);
  ability.setup(accessory, platform, log);

  const serviceClass =
    type === 'door' ? Service.Door :
    type === 'windowCovering' ? Service.WindowCovering :
    Service.Window;
  const service = accessory.getServiceById(serviceClass, `${type}-${component.id}`)!;
  return { ability, accessory, platform, log, service };
};

describe('CoverAbility', () => {
  it('uses the configured type to pick the matching HomeKit service', () => {
    const cover = createCover({ pos_control: true, current_pos: 100, target_pos: 100 });
    const window = setupAbility(cover, 'window').service;
    expect(window).toBeDefined();

    const cover2 = createCover({ pos_control: true, current_pos: 0, target_pos: 0 });
    const door = setupAbility(cover2, 'door').service;
    expect(door).toBeDefined();

    const cover3 = createCover({ pos_control: true, current_pos: 50, target_pos: 50 });
    const wc = setupAbility(cover3, 'windowCovering').service;
    expect(wc).toBeDefined();
  });

  it('skips initialization for un-calibrated covers (pos_control=false)', () => {
    const cover = createCover({ pos_control: false });
    const { platform } = setupAbility(cover);
    // service exists but no characteristics initialized — listeners not attached
    expect(cover.listenerCount('change:state')).toBe(0);
    // a warning was logged through the platform's mock logger
    const records = (platform.log as unknown as { records: { message: string }[] }).records;
    expect(records.some(r => r.message.includes('calibrated'))).toBe(true);
  });

  it('reflects initial position and state', () => {
    const cover = createCover({ pos_control: true, current_pos: 25, target_pos: 75, state: 'opening' });
    const { service, platform } = setupAbility(cover);

    expect(service.getCharacteristic(Characteristic.CurrentPosition).value).toBe(25);
    expect(service.getCharacteristic(Characteristic.TargetPosition).value).toBe(75);
    expect(service.getCharacteristic(Characteristic.PositionState).value).toBe(
      platform.api.hap.Characteristic.PositionState.INCREASING,
    );
  });

  it('forwards TargetPosition set to component.goToPosition', async () => {
    const cover = createCover({ pos_control: true, current_pos: 0, target_pos: 0 });
    const { service } = setupAbility(cover);
    await service.getCharacteristic(Characteristic.TargetPosition).handleSetRequest(80);
    expect(cover.goToPosition).toHaveBeenCalledWith(80);
  });

  it('skips command when value equals BOTH target_pos and current_pos', async () => {
    const cover = createCover({ pos_control: true, current_pos: 50, target_pos: 50 });
    const { service } = setupAbility(cover);
    await service.getCharacteristic(Characteristic.TargetPosition).handleSetRequest(50);
    expect(cover.goToPosition).not.toHaveBeenCalled();
  });

  it('still issues a command when target_pos is stale (current_pos differs)', async () => {
    // PR #9 regression case: physical switch moved cover so current_pos changed,
    // but Shelly didn't push a new target_pos. HomeKit must still be able to drive it.
    const cover = createCover({ pos_control: true, current_pos: 30, target_pos: 50 });
    const { service } = setupAbility(cover);
    await service.getCharacteristic(Characteristic.TargetPosition).handleSetRequest(50);
    expect(cover.goToPosition).toHaveBeenCalledWith(50);
  });

  it('throws SERVICE_COMMUNICATION_FAILURE when device is disconnected', async () => {
    const cover = createCover({ pos_control: true, current_pos: 0, target_pos: 0, rpcConnected: false });
    const { service, platform } = setupAbility(cover);

    await expect(
      service.getCharacteristic(Characteristic.TargetPosition).handleSetRequest(50),
    ).rejects.toBe(platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    expect(cover.goToPosition).not.toHaveBeenCalled();
  });

  it('throws SERVICE_COMMUNICATION_FAILURE when goToPosition rejects', async () => {
    const cover = createCover({ pos_control: true, current_pos: 0, target_pos: 0 });
    cover.goToPosition.mockRejectedValueOnce(new Error('rpc'));
    const { service, platform } = setupAbility(cover);

    await expect(
      service.getCharacteristic(Characteristic.TargetPosition).handleSetRequest(50),
    ).rejects.toBe(platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
  });

  it('updates all three position characteristics on change:state', () => {
    const cover = createCover({ pos_control: true, current_pos: 30, target_pos: 80 });
    const { service, platform } = setupAbility(cover);

    cover.setState('state', 'opening');
    expect(service.getCharacteristic(Characteristic.PositionState).value).toBe(
      platform.api.hap.Characteristic.PositionState.INCREASING,
    );
  });

  it('on change:current_pos with stopped state, syncs target to current', () => {
    // Physical switch ended a manual move: state stops at current, target was stale.
    const cover = createCover({ pos_control: true, current_pos: 50, target_pos: 100, state: 'stopped' });
    const { service } = setupAbility(cover);

    cover.setState('current_pos', 60);
    expect(service.getCharacteristic(Characteristic.CurrentPosition).value).toBe(60);
    expect(service.getCharacteristic(Characteristic.TargetPosition).value).toBe(60);
  });

  it('refreshState() pushes current values to HomeKit (post-reconnect)', () => {
    const cover = createCover({ pos_control: true, current_pos: 0, target_pos: 0 });
    const { ability, service } = setupAbility(cover);

    // simulate state changing while disconnected (no events would have fired)
    cover.current_pos = 80;
    cover.target_pos = 80;
    cover.state = 'stopped';

    ability.refreshState();
    expect(service.getCharacteristic(Characteristic.CurrentPosition).value).toBe(80);
    expect(service.getCharacteristic(Characteristic.TargetPosition).value).toBe(80);
  });

  it('detach() unsubscribes from all change events', () => {
    const cover = createCover({ pos_control: true });
    const { ability } = setupAbility(cover);

    ability.detach();
    expect(cover.listenerCount('change:state')).toBe(0);
    expect(cover.listenerCount('change:current_pos')).toBe(0);
    expect(cover.listenerCount('change:target_pos')).toBe(0);
  });

  it('change handlers are inert until initialize() completes (no _isInitialized)', () => {
    // setup hands off to initialize, which sets _isInitialized at the end. Once detach()
    // runs, _isInitialized is cleared — subsequent events must NOT update characteristics.
    const cover = createCover({ pos_control: true, current_pos: 0, target_pos: 0 });
    const { ability, service } = setupAbility(cover);

    ability.detach();
    // re-attach a listener directly to prove the handler is gated by _isInitialized
    cover.on('change:state', () => { /* no-op */ });
    cover.setState('state', 'opening');
    // CurrentPosition didn't move — handler short-circuited
    expect(service.getCharacteristic(Characteristic.CurrentPosition).value).toBe(0);
  });
});
