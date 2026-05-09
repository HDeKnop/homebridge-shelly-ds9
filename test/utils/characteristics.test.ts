import { createCharacteristics } from '../../src/utils/characteristics';
import { createMockApi } from '../mocks/api';

describe('createCharacteristics', () => {
  it('produces all four custom Eve-compatible characteristics', () => {
    const api = createMockApi();
    const c = createCharacteristics(api);
    expect(c.CurrentConsumption).toBeDefined();
    expect(c.ElectricCurrent).toBeDefined();
    expect(c.TotalConsumption).toBeDefined();
    expect(c.Voltage).toBeDefined();
  });

  it('uses Eve UUIDs (so iOS Eve app picks them up)', () => {
    const api = createMockApi();
    const c = createCharacteristics(api);
    expect(c.CurrentConsumption.UUID).toBe('E863F10D-079E-48FF-8F27-9C2605A29F52');
    expect(c.ElectricCurrent.UUID).toBe('E863F126-079E-48FF-8F27-9C2605A29F52');
    expect(c.TotalConsumption.UUID).toBe('E863F10C-079E-48FF-8F27-9C2605A29F52');
    expect(c.Voltage.UUID).toBe('E863F10A-079E-48FF-8F27-9C2605A29F52');
  });

  it('CurrentConsumption is a non-negative float in W', () => {
    const api = createMockApi();
    const c = createCharacteristics(api);
    const inst = new c.CurrentConsumption();
    expect(inst.props.format).toBe('float');
    expect(inst.props.unit).toBe('W');
    expect(inst.props.minValue).toBe(0);
  });

  it('Voltage allows negative readings', () => {
    const api = createMockApi();
    const c = createCharacteristics(api);
    const inst = new c.Voltage();
    expect(inst.props.unit).toBe('V');
    expect(inst.props.minValue).toBe(-1000);
    expect(inst.props.maxValue).toBe(1000);
  });

  it('TotalConsumption is in kWh with a generous max', () => {
    const api = createMockApi();
    const c = createCharacteristics(api);
    const inst = new c.TotalConsumption();
    expect(inst.props.unit).toBe('kWh');
    expect(inst.props.maxValue).toBe(1000000);
  });
});
