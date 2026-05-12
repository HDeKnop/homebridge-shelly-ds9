import { vi } from 'vitest';

type Handler = (...args: unknown[]) => void;

/**
 * Minimal EventEmitter that mirrors the shellies-ds9 component event API:
 * `on(event, handler, ctx?)`, `off(event, handler, ctx?)`, `emit(event, ...args)`.
 * Context binding matters: shellies-ds9 binds handlers with a third `ctx`
 * argument and matches both function-identity AND ctx on removal.
 */
export class FakeEmitter {
  private readonly handlers = new Map<string, { fn: Handler; ctx: unknown }[]>();

  on(event: string, fn: Handler, ctx?: unknown): this {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push({ fn, ctx });
    return this;
  }

  off(event: string, fn: Handler, ctx?: unknown): this {
    const list = this.handlers.get(event);
    if (!list) {
      return this;
    }
    const idx = list.findIndex(h => h.fn === fn && h.ctx === ctx);
    if (idx >= 0) {
      list.splice(idx, 1);
    }
    return this;
  }

  emit(event: string, ...args: unknown[]): void {
    const list = this.handlers.get(event);
    if (!list) {
      return;
    }
    for (const { fn, ctx } of list.slice()) {
      fn.apply(ctx, args);
    }
  }

  listenerCount(event: string): number {
    return this.handlers.get(event)?.length ?? 0;
  }
}

export interface FakeSwitchOpts {
  id?: number;
  output?: boolean;
  apower?: number | undefined;
  name?: string;
}

export class FakeSwitch extends FakeEmitter {
  readonly id: number;
  readonly key: string;
  output: boolean;
  apower: number | undefined;
  config: { name?: string };
  readonly set = vi.fn(async (_value: boolean) => undefined);

  constructor(opts: FakeSwitchOpts = {}) {
    super();
    this.id = opts.id ?? 0;
    this.key = `switch:${this.id}`;
    this.output = opts.output ?? false;
    this.apower = opts.apower;
    this.config = { name: opts.name };
  }
}

export interface FakeLightOpts {
  id?: number;
  output?: boolean;
  brightness?: number;
  name?: string;
}

export class FakeLight extends FakeEmitter {
  readonly id: number;
  readonly key: string;
  output: boolean;
  brightness: number;
  config: { name?: string };
  readonly set = vi.fn(async (_on?: boolean, _brightness?: number) => undefined);

  constructor(opts: FakeLightOpts = {}) {
    super();
    this.id = opts.id ?? 0;
    this.key = `light:${this.id}`;
    this.output = opts.output ?? false;
    this.brightness = opts.brightness ?? 100;
    this.config = { name: opts.name };
  }
}

export interface FakeCoverOpts {
  id?: number;
  current_pos?: number | null;
  target_pos?: number | null;
  state?: string;
  pos_control?: boolean;
  apower?: number;
  name?: string;
  connected?: boolean;
}

export class FakeCover extends FakeEmitter {
  readonly id: number;
  readonly key: string;
  current_pos: number | null;
  target_pos: number | null;
  state: string;
  pos_control: boolean;
  apower: number;
  config: { name?: string };
  device: { rpcHandler: { connected: boolean } };
  readonly goToPosition = vi.fn(async (_pos: number) => undefined);

  constructor(opts: FakeCoverOpts = {}) {
    super();
    this.id = opts.id ?? 0;
    this.key = `cover:${this.id}`;
    this.current_pos = opts.current_pos ?? 100;
    this.target_pos = opts.target_pos ?? this.current_pos;
    this.state = opts.state ?? 'stopped';
    this.pos_control = opts.pos_control ?? true;
    this.apower = opts.apower ?? 0;
    this.config = { name: opts.name };
    this.device = { rpcHandler: { connected: opts.connected ?? true } };
  }
}

export interface FakeDeviceOpts {
  id?: string;
  model?: string;
  modelName?: string;
  firmware?: { version?: string };
  macAddress?: string;
  rpcHandler?: Partial<{ connected: boolean; protocol: string; hostname: string }>;
}

export class FakeDevice extends FakeEmitter {
  readonly id: string;
  readonly model: string;
  readonly modelName: string;
  readonly firmware: { version?: string };
  readonly macAddress: string;
  readonly rpcHandler: FakeEmitter & { connected: boolean; protocol: string; hostname?: string };

  constructor(opts: FakeDeviceOpts = {}) {
    super();
    this.id = opts.id ?? 'shellyplus1-aabbccddeeff';
    this.model = opts.model ?? 'SNSW-001X16EU';
    this.modelName = opts.modelName ?? 'Shelly Plus 1';
    this.firmware = opts.firmware ?? { version: '1.0.0' };
    this.macAddress = opts.macAddress ?? 'AA:BB:CC:DD:EE:FF';
    const rpc = new FakeEmitter() as FakeEmitter & {
      connected: boolean;
      protocol: string;
      hostname?: string;
    };
    rpc.connected = opts.rpcHandler?.connected ?? true;
    rpc.protocol = opts.rpcHandler?.protocol ?? 'websocket';
    rpc.hostname = opts.rpcHandler?.hostname ?? '192.168.1.100';
    this.rpcHandler = rpc;
  }
}
