import { EventEmitter } from 'events';
import * as hap from 'hap-nodejs';
import { PlatformAccessory } from 'homebridge/lib/platformAccessory';
import type { API, Logger, LogLevel } from 'homebridge';

/**
 * A captured invocation of one of the homebridge accessory-registration calls.
 */
export interface RegistrationCall {
  kind: 'register' | 'unregister' | 'update';
  pluginIdentifier?: string;
  platformName?: string;
  accessories: PlatformAccessory[];
}

/**
 * The minimum surface of `homebridge`'s API that this plugin actually touches,
 * plus testing affordances:
 *   - `registrations` records every register/unregister/update call so tests
 *     can assert on lifecycle behavior without a live Homebridge bridge.
 *   - `triggerDidFinishLaunching()` emits the `didFinishLaunching` event
 *     that `ShellyPlatform.initialize()` is wired to.
 */
export interface MockApi extends API {
  registrations: RegistrationCall[];
  triggerDidFinishLaunching(): void;
}

/**
 * Captures every log line in-memory; tests can assert on what was logged.
 */
export interface MockLogger extends Logger {
  records: { level: LogLevel | 'info' | 'warn' | 'error' | 'debug'; message: string; params: unknown[] }[];
}

export const createMockLogger = (): MockLogger => {
  const records: MockLogger['records'] = [];
  const push = (level: MockLogger['records'][number]['level']) =>
    (message: string, ...params: unknown[]) => {
      records.push({ level, message, params });
    };
  const log = ((level: LogLevel, message: string, ...params: unknown[]) => {
    records.push({ level, message, params });
  }) as unknown as MockLogger;
  log.info = push('info');
  log.warn = push('warn');
  log.error = push('error');
  log.debug = push('debug');
  log.log = (level: LogLevel, message: string, ...params: unknown[]) => {
    records.push({ level, message, params });
  };
  log.records = records;
  // `prefix` is readonly on Logger; cast through unknown to set the field
  (log as unknown as { prefix: string }).prefix = '';
  return log;
};

/**
 * Builds an in-memory API double that uses the real hap-nodejs Service /
 * Characteristic implementations (so characteristic constraints, perms,
 * formats are validated for real) and the real homebridge PlatformAccessory
 * class. Network IO, mDNS, and cache I/O are stubbed.
 */
export const createMockApi = (storagePath = '/tmp/shelly-ds9-test'): MockApi => {
  const emitter = new EventEmitter();
  const registrations: RegistrationCall[] = [];

  const api = {
    version: 2.7,
    serverVersion: '1.11.4',
    user: {
      configPath: () => `${storagePath}/config.json`,
      storagePath: () => storagePath,
      persistPath: () => `${storagePath}/persist`,
      cachedAccessoryPath: () => `${storagePath}/accessories`,
    },
    hap,
    hapLegacyTypes: hap.LegacyTypes,
    platformAccessory: PlatformAccessory,
    versionGreaterOrEqual: (version: string) => true,

    registerAccessory: jest.fn(),
    publishCameraAccessories: jest.fn(),
    publishExternalAccessories: jest.fn(),

    registerPlatform: jest.fn(),
    registerPlatformAccessories: (
      pluginIdentifier: string,
      platformName: string,
      accessories: PlatformAccessory[],
    ) => {
      registrations.push({ kind: 'register', pluginIdentifier, platformName, accessories: [...accessories] });
    },
    unregisterPlatformAccessories: (
      pluginIdentifier: string,
      platformName: string,
      accessories: PlatformAccessory[],
    ) => {
      registrations.push({ kind: 'unregister', pluginIdentifier, platformName, accessories: [...accessories] });
    },
    updatePlatformAccessories: (accessories: PlatformAccessory[]) => {
      registrations.push({ kind: 'update', accessories: [...accessories] });
    },

    on: (event: string, listener: (...args: unknown[]) => void) => {
      emitter.on(event, listener);
      return api;
    },
    off: (event: string, listener: (...args: unknown[]) => void) => {
      emitter.off(event, listener);
      return api;
    },
    once: (event: string, listener: (...args: unknown[]) => void) => {
      emitter.once(event, listener);
      return api;
    },
    removeListener: (event: string, listener: (...args: unknown[]) => void) => {
      emitter.removeListener(event, listener);
      return api;
    },
    removeAllListeners: (event?: string) => {
      emitter.removeAllListeners(event);
      return api;
    },
    emit: (event: string, ...args: unknown[]) => emitter.emit(event, ...args),

    triggerDidFinishLaunching: () => {
      emitter.emit('didFinishLaunching');
    },
    registrations,
  } as unknown as MockApi;

  return api;
};
