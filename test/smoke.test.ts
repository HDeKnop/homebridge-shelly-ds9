import { createMockApi, createMockLogger } from './mocks/api';
import { createSwitch } from './mocks/shelly';

describe('smoke: mocks compile and behave', () => {
  it('builds a mock API with real hap-nodejs', () => {
    const api = createMockApi();
    expect(api.hap.Service.Switch).toBeDefined();
    expect(api.hap.Characteristic.On).toBeDefined();
    expect(typeof api.hap.uuid.generate).toBe('function');
  });

  it('FakeComponent emits change:<prop> when state mutates', () => {
    const sw = createSwitch({ output: false });
    const events: unknown[] = [];
    sw.on('change:output', v => events.push(v));
    sw.setState('output', true);
    sw.setState('output', true); // no event when value unchanged
    sw.setState('output', false);
    expect(events).toEqual([true, false]);
  });

  it('mock logger captures records', () => {
    const log = createMockLogger();
    log.info('hello %s', 'world');
    log.error('boom');
    expect(log.records).toHaveLength(2);
    expect(log.records[0].level).toBe('info');
    expect(log.records[1].level).toBe('error');
  });
});
