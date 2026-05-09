import { createCharacteristics } from '../../src/utils/characteristics';
import { createServices } from '../../src/utils/services';
import { createMockApi } from '../mocks/api';

describe('createServices', () => {
  it('produces PowerMeter and Pm1 services', () => {
    const api = createMockApi();
    const cc = createCharacteristics(api);
    const s = createServices(api, cc);
    expect(s.PowerMeter).toBeDefined();
    expect(s.Pm1).toBeDefined();
  });

  it('PowerMeter service includes CurrentConsumption as a required characteristic', () => {
    const api = createMockApi();
    const cc = createCharacteristics(api);
    const s = createServices(api, cc);
    const inst = new s.PowerMeter('PM Test', 'pm-0');
    // CurrentConsumption is added as required; voltage/current/total as optional
    expect(inst.testCharacteristic(cc.CurrentConsumption)).toBe(true);
  });
});
