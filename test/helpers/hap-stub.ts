import { vi } from 'vitest';
import type { API, Characteristic, PlatformAccessory, Service, WithUUID } from 'homebridge';

import type { CustomCharacteristics } from '../../src/utils/characteristics.js';
import type { CustomServices } from '../../src/utils/services.js';

type ServiceClass = WithUUID<typeof Service>;
type CharacteristicClass = WithUUID<new () => Characteristic> & WithUUID<typeof Characteristic>;

/**
 * Fake characteristic — records calls, supports onSet/onGet/updateValue/setValue chaining.
 */
export class FakeCharacteristic {
  value: unknown = null;
  onSetHandler: ((v: unknown) => unknown) | null = null;
  onGetHandler: (() => unknown) | null = null;
  readonly setHistory: unknown[] = [];
  readonly updateHistory: unknown[] = [];

  constructor(readonly uuid: string, readonly displayName: string) {}

  onSet(handler: (v: unknown) => unknown): this {
    this.onSetHandler = handler;
    return this;
  }

  onGet(handler: () => unknown): this {
    this.onGetHandler = handler;
    return this;
  }

  setValue(v: unknown): this {
    this.value = v;
    this.setHistory.push(v);
    return this;
  }

  updateValue(v: unknown): this {
    this.value = v;
    this.updateHistory.push(v);
    return this;
  }

  setProps(): this {
    return this;
  }
}

/**
 * Fake service. Stores characteristics keyed by UUID, supports the chaining
 * methods Ability uses.
 */
export class FakeService {
  readonly characteristics = new Map<string, FakeCharacteristic>();
  displayName: string;

  constructor(
    readonly serviceClass: ServiceClass,
    displayName: string,
    readonly subtype?: string,
  ) {
    this.displayName = displayName;
  }

  getCharacteristic(cls: CharacteristicClass): FakeCharacteristic {
    let c = this.characteristics.get(cls.UUID);
    if (!c) {
      c = new FakeCharacteristic(cls.UUID, (cls as { name?: string }).name ?? 'Unknown');
      this.characteristics.set(cls.UUID, c);
    }
    return c;
  }

  setCharacteristic(cls: CharacteristicClass, value: unknown): this {
    this.getCharacteristic(cls).setValue(value);
    return this;
  }

  updateCharacteristic(cls: CharacteristicClass, value: unknown): this {
    this.getCharacteristic(cls).updateValue(value);
    return this;
  }

  testCharacteristic(cls: CharacteristicClass): boolean {
    return this.characteristics.has(cls.UUID);
  }

  removeCharacteristic(c: FakeCharacteristic | { UUID: string }): this {
    this.characteristics.delete(c.UUID);
    return this;
  }
}

/**
 * Fake PlatformAccessory.
 */
export class FakePlatformAccessory {
  readonly services: FakeService[] = [];
  displayName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any = {};

  constructor(readonly _name: string, readonly UUID: string) {
    this.displayName = _name;
  }

  getService(cls: ServiceClass): FakeService | undefined {
    return this.services.find(s => s.serviceClass === cls && !s.subtype);
  }

  getServiceById(cls: ServiceClass, subtype: string): FakeService | undefined {
    return this.services.find(s => s.serviceClass === cls && s.subtype === subtype);
  }

  addService(cls: ServiceClass, name?: string, subtype?: string): FakeService {
    const s = new FakeService(cls, name ?? 'Unnamed', subtype);
    this.services.push(s);
    return s;
  }

  removeService(s: FakeService): void {
    const idx = this.services.indexOf(s);
    if (idx >= 0) {
      this.services.splice(idx, 1);
    }
  }
}

/**
 * Builds a HAP Characteristic class with a stable UUID. We mint a fresh UUID
 * per class — tests only care that two distinct characteristic classes have
 * distinct UUIDs, not what specific values.
 */
function makeCharacteristic(name: string, extras: Record<string, unknown> = {}): CharacteristicClass {
  const cls = Object.assign(function FakeCharacteristicCtor() {}, { UUID: `char-${name}`, name }, extras);
  return cls as unknown as CharacteristicClass;
}

function makeService(name: string): ServiceClass {
  const cls = Object.assign(function FakeServiceCtor() {}, { UUID: `service-${name}`, name });
  return cls as unknown as ServiceClass;
}

/**
 * Minimal fake API object that the platform / abilities use. Only the surface
 * we actually call is implemented; everything else is a vi.fn() so tests
 * detect unexpected access.
 */
export interface FakeApi extends Partial<API> {
  hap: {
    Service: Record<string, ServiceClass>;
    Characteristic: Record<string, CharacteristicClass | unknown>;
    HAPStatus: { SERVICE_COMMUNICATION_FAILURE: number };
    uuid: { generate: (s: string) => string };
  };
  platformAccessory: typeof FakePlatformAccessory;
  registerPlatformAccessories: ReturnType<typeof vi.fn>;
  unregisterPlatformAccessories: ReturnType<typeof vi.fn>;
  updatePlatformAccessories: ReturnType<typeof vi.fn>;
}

const PositionState = { DECREASING: 0, INCREASING: 1, STOPPED: 2 };
const Active = { INACTIVE: 0, ACTIVE: 1 };
const ProgrammableSwitchEvent = { SINGLE_PRESS: 0, DOUBLE_PRESS: 1, LONG_PRESS: 2 };
const ServiceLabelNamespace = { DOTS: 0, ARABIC_NUMERALS: 1 };

export function createFakeApi(): FakeApi {
  const Service = {
    Switch: makeService('Switch'),
    Outlet: makeService('Outlet'),
    Lightbulb: makeService('Lightbulb'),
    Fanv2: makeService('Fanv2'),
    Window: makeService('Window'),
    Door: makeService('Door'),
    WindowCovering: makeService('WindowCovering'),
    AccessoryInformation: makeService('AccessoryInformation'),
    ServiceLabel: makeService('ServiceLabel'),
    StatelessProgrammableSwitch: makeService('StatelessProgrammableSwitch'),
  };

  const Characteristic = {
    On: makeCharacteristic('On'),
    OutletInUse: makeCharacteristic('OutletInUse'),
    Brightness: makeCharacteristic('Brightness'),
    Active: makeCharacteristic('Active', Active),
    CurrentPosition: makeCharacteristic('CurrentPosition'),
    TargetPosition: makeCharacteristic('TargetPosition'),
    PositionState: makeCharacteristic('PositionState', PositionState),
    Name: makeCharacteristic('Name'),
    FirmwareRevision: makeCharacteristic('FirmwareRevision'),
    Manufacturer: makeCharacteristic('Manufacturer'),
    Model: makeCharacteristic('Model'),
    SerialNumber: makeCharacteristic('SerialNumber'),
    ProgrammableSwitchEvent: makeCharacteristic('ProgrammableSwitchEvent', ProgrammableSwitchEvent),
    ServiceLabelIndex: makeCharacteristic('ServiceLabelIndex'),
    ServiceLabelNamespace: makeCharacteristic('ServiceLabelNamespace', ServiceLabelNamespace),
  };

  const api: FakeApi = {
    hap: {
      Service,
      Characteristic,
      HAPStatus: { SERVICE_COMMUNICATION_FAILURE: -70402 },
      uuid: { generate: (s: string) => `uuid-${s}` },
    },
    platformAccessory: FakePlatformAccessory,
    registerPlatformAccessories: vi.fn(),
    unregisterPlatformAccessories: vi.fn(),
    updatePlatformAccessories: vi.fn(),
  };
  return api;
}

/**
 * Minimal fake platform — exposes just what Ability/Accessory use.
 */
export function createFakePlatform(api: FakeApi = createFakeApi(), accessories: Map<string, FakePlatformAccessory> = new Map()) {
  return {
    api,
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      log: vi.fn(),
    },
    customCharacteristics: {} as CustomCharacteristics,
    customServices: {} as CustomServices,
    getAccessory: (uuid: string) => accessories.get(uuid),
    addAccessory: vi.fn(),
    removeAccessory: vi.fn(),
    accessories,
  };
}

export type FakePlatform = ReturnType<typeof createFakePlatform>;

/**
 * Convenience: cast helpers so tests can pass these stubs where real types are expected.
 */
export function asPlatformAccessory(pa: FakePlatformAccessory): PlatformAccessory {
  return pa as unknown as PlatformAccessory;
}
