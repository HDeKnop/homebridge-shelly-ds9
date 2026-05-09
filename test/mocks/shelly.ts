import EventEmitter from 'eventemitter3';

/**
 * A minimal stand-in for the `shellies-ds9` component superclass that the
 * abilities depend on. Only the methods/properties actually exercised by the
 * abilities under test are implemented.
 *
 * The real shellies-ds9 components emit `change:<prop>` whenever a typed
 * setter mutates state. We mirror that behavior via `setState()` so tests
 * can drive realistic state-update flows without a live device.
 */
export class FakeComponent extends EventEmitter {
  readonly id: number;
  readonly key: string;
  readonly device: FakeDevice;
  config: Record<string, unknown> | undefined;

  constructor(opts: { id: number; key: string; device?: FakeDevice; config?: Record<string, unknown> }) {
    super();
    this.id = opts.id;
    this.key = opts.key;
    this.device = opts.device ?? new FakeDevice();
    this.config = opts.config;
  }

  /**
   * Mutate `prop` and emit the matching `change:<prop>` event when the value
   * actually changed — the same contract shellies-ds9 publishes.
   */
  setState<K extends string>(prop: K, value: unknown) {
    if ((this as unknown as Record<string, unknown>)[prop] === value) {
      return;
    }
    (this as unknown as Record<string, unknown>)[prop] = value;
    this.emit(`change:${prop}`, value);
  }
}

export class FakeRpcHandler extends EventEmitter {
  connected = true;
  protocol: 'websocket' = 'websocket';
  hostname?: string;

  constructor(opts: { connected?: boolean; hostname?: string } = {}) {
    super();
    this.connected = opts.connected ?? true;
    this.hostname = opts.hostname;
  }
}

export class FakeDevice extends EventEmitter {
  static model = 'TestDevice';
  id: string;
  model: string;
  modelName: string;
  macAddress: string;
  firmware: { version: string };
  rpcHandler: FakeRpcHandler;
  system: { config?: { device?: { name?: string } } };

  constructor(opts: {
    id?: string;
    model?: string;
    modelName?: string;
    macAddress?: string;
    firmwareVersion?: string;
    deviceName?: string;
    rpcHandler?: FakeRpcHandler;
  } = {}) {
    super();
    this.id = opts.id ?? 'shelly-test-001';
    this.model = opts.model ?? 'TestDevice';
    this.modelName = opts.modelName ?? 'Shelly Test Device';
    this.macAddress = opts.macAddress ?? 'AA:BB:CC:DD:EE:FF';
    this.firmware = { version: opts.firmwareVersion ?? '1.0.0' };
    this.rpcHandler = opts.rpcHandler ?? new FakeRpcHandler();
    this.system = { config: { device: { name: opts.deviceName } } };
  }
}

/* ------------------------------------------------------------------ */
/* Component factories — return objects shaped like the real shellies  */
/* components, with `set()` returning resolved promises by default.    */
/* ------------------------------------------------------------------ */

export interface FakeSwitch extends FakeComponent {
  output: boolean;
  apower?: number;
  voltage?: number;
  current?: number;
  aenergy?: { total: number };
  set: jest.Mock<Promise<void>, [boolean?]>;
}

export const createSwitch = (opts: {
  id?: number;
  output?: boolean;
  apower?: number;
  voltage?: number;
  current?: number;
  aenergy?: { total: number };
  config?: Record<string, unknown>;
  device?: FakeDevice;
} = {}): FakeSwitch => {
  const id = opts.id ?? 0;
  const c = new FakeComponent({
    id,
    key: `switch:${id}`,
    device: opts.device,
    config: opts.config,
  }) as FakeSwitch;
  c.output = opts.output ?? false;
  c.apower = opts.apower;
  c.voltage = opts.voltage;
  c.current = opts.current;
  c.aenergy = opts.aenergy;
  c.set = jest.fn().mockResolvedValue(undefined);
  return c;
};

export interface FakeCover extends FakeComponent {
  state: 'open' | 'closed' | 'opening' | 'closing' | 'stopped';
  current_pos?: number;
  target_pos?: number;
  pos_control: boolean;
  apower?: number;
  voltage?: number;
  current?: number;
  aenergy?: { total: number };
  goToPosition: jest.Mock<Promise<void>, [number]>;
}

export const createCover = (opts: {
  id?: number;
  state?: FakeCover['state'];
  current_pos?: number;
  target_pos?: number;
  pos_control?: boolean;
  apower?: number;
  voltage?: number;
  current?: number;
  aenergy?: { total: number };
  config?: Record<string, unknown>;
  device?: FakeDevice;
  rpcConnected?: boolean;
} = {}): FakeCover => {
  const id = opts.id ?? 0;
  const device = opts.device ?? new FakeDevice({
    rpcHandler: new FakeRpcHandler({ connected: opts.rpcConnected ?? true }),
  });
  const c = new FakeComponent({ id, key: `cover:${id}`, device, config: opts.config }) as FakeCover;
  c.state = opts.state ?? 'stopped';
  c.current_pos = opts.current_pos;
  c.target_pos = opts.target_pos;
  c.pos_control = opts.pos_control ?? true;
  c.apower = opts.apower;
  c.voltage = opts.voltage;
  c.current = opts.current;
  c.aenergy = opts.aenergy;
  c.goToPosition = jest.fn().mockResolvedValue(undefined);
  return c;
};

export interface FakeLight extends FakeComponent {
  output: boolean;
  brightness: number;
  set: jest.Mock<Promise<void>, [boolean?, number?]>;
}

export const createLight = (opts: {
  id?: number;
  output?: boolean;
  brightness?: number;
  config?: Record<string, unknown>;
  device?: FakeDevice;
} = {}): FakeLight => {
  const id = opts.id ?? 0;
  const c = new FakeComponent({
    id,
    key: `light:${id}`,
    device: opts.device,
    config: opts.config,
  }) as FakeLight;
  c.output = opts.output ?? false;
  c.brightness = opts.brightness ?? 100;
  c.set = jest.fn().mockResolvedValue(undefined);
  return c;
};

export interface FakeInput extends FakeComponent {
  state: boolean | null;
}

export const createInput = (opts: {
  id?: number;
  state?: boolean | null;
  config?: Record<string, unknown>;
  device?: FakeDevice;
} = {}): FakeInput => {
  const id = opts.id ?? 0;
  const c = new FakeComponent({
    id,
    key: `input:${id}`,
    device: opts.device,
    config: opts.config,
  }) as FakeInput;
  c.state = opts.state ?? false;
  return c;
};
