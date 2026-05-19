import { ComponentLike, Cover, Device, Switch, Light } from 'shellies-ds9';
import { PlatformAccessory } from 'homebridge';

import {
  Ability,
  AccessoryInformationAbility,
  CoverAbility,
  OutletAbility,
  PowerMeterAbility,
  SwitchAbility,
  LightAbility,
  VentilationAbility,
} from '../abilities/index.js';
import { Accessory, AccessoryId } from '../accessory.js';
import { DeviceLogger } from '../utils/device-logger.js';
import { CoverOptions, DeviceOptions, SwitchOptions, LightOptions } from '../config.js';
import { ShellyPlatform } from '../platform.js';

/**
 * Describes a device delegate class.
 */
export interface DeviceDelegateClass {
  new (device: Device, options: DeviceOptions, platform: ShellyPlatform): DeviceDelegate;
}

/**
 * Describes a device class.
 */
export interface DeviceClass {
  model: string;
}

export interface AddSwitchOptions {
  /**
   * Whether the accessory should be active.
   */
  active: boolean;
  /**
   * Whether the device has a single switch.
   */
  single: boolean;
}

export interface AddCoverOptions {
  /**
   * Whether the accessory should be active.
   */
  active: boolean;
  /**
   * Whether the device has a single cover.
   */
  single: boolean;
}

export interface AddLightOptions {
  /**
   * Whether the accessory should be active.
   */
  active: boolean;
  /**
   * Whether the device has a single light.
   */
  single: boolean;
}

/**
 * A DeviceDelegate manages accessories for a device.
 */
export abstract class DeviceDelegate {
  /**
   * Holds all registered delegates.
   */
  private static readonly delegates: Map<string, DeviceDelegateClass> = new Map();

  /**
   * Registers a device delegate, so that it can later be found based on a device class or model
   * using the `DeviceDelegate.getDelegate()` method.
   * @param delegate - A subclass of `DeviceDelegate`.
   * @param deviceClasses - One or more subclasses of `Device`.
   */
  static registerDelegate(delegate: DeviceDelegateClass, ...deviceClasses: DeviceClass[]) {
    for (const deviceCls of deviceClasses) {
      const mdl = deviceCls.model.toUpperCase();

      // make sure it's not already registered
      if (DeviceDelegate.delegates.has(mdl)) {
        throw new Error(`A device delegate for ${deviceCls.model} has already been registered`);
      }

      // add it to the list
      DeviceDelegate.delegates.set(mdl, delegate);
    }
  }

  /**
   * Returns the device delegate for the given device class or model, if one has been registered.
   * @param deviceClsOrModel - The device class or model ID to lookup.
   */
  static getDelegate(deviceClsOrModel: DeviceClass | string): DeviceDelegateClass | undefined {
    const mdl = typeof deviceClsOrModel === 'string' ? deviceClsOrModel : deviceClsOrModel.model;
    return DeviceDelegate.delegates.get(mdl.toUpperCase());
  }

  /**
   * Holds all accessories for this device.
   */
  protected readonly accessories: Map<AccessoryId, Accessory> = new Map();

  /**
   * Logger specific for this device.
   */
  readonly log: DeviceLogger;

  /**
   * Used to keep track of whether a connection had been established when the 'disconnect' event is emitted by our RPC handler.
   */
  protected connected: boolean;

  /**
   * @param device - The device to handle.
   * @param options - Configuration options for the device.
   * @param platform - A reference to the homebridge platform.
   */
  constructor(
    readonly device: Device,
    readonly options: DeviceOptions,
    readonly platform: ShellyPlatform
  ) {
    this.log = new DeviceLogger(device, options.name, platform.log);
    this.log.info('Device added');

    this.log.debug(device.rpcHandler.connected ? 'Device is connected' : 'Device is disconnected');

    this.connected = device.rpcHandler.connected;

    device.rpcHandler
      .on('connect', this.handleConnect, this)
      .on('disconnect', this.handleDisconnect, this)
      .on('request', this.handleRequest, this);

    this.setup();
  }

  /**
   * Subclasses should override this method to setup the device delegate and create their
   * accessories.
   */
  protected abstract setup(): void;

  /**
   * Retrieves configuration options for the given component from the device options.
   * @param component - The component.
   * @returns A set of options, if found.
   */
  protected getComponentOptions<T>(component: ComponentLike): T | undefined {
    return this.options?.[component.key] as T;
  }

  /**
   * Creates an accessory with the given ID.
   * If a matching platform accessory is not found in cache, a new one will be created.
   * @param id - A unique identifier for this accessory.
   * @param nameSuffix - A string to append to the name of this accessory.
   * @param abilities - The abilities to add to this accessory.
   */
  protected createAccessory(id: AccessoryId, nameSuffix: string | null, ...abilities: Ability[]): Accessory {
    let name = this.options.name || this.device.modelName;
    if (nameSuffix) {
      name += ' ' + nameSuffix;
    }
    return this.createAccessoryWithFullName(id, name, ...abilities);
  }

  /**
   * Creates an accessory with the given ID, using `fullName` verbatim as the accessory name
   * (no device-name prefix). Use this when a per-component friendly name is available and
   * should stand alone (e.g., a Shelly channel named "Stairs" — we want HomeKit / Node-RED
   * to show "Stairs", not "<device> Stairs").
   */
  protected createAccessoryWithFullName(id: AccessoryId, fullName: string, ...abilities: Ability[]): Accessory {
    // HAP only allows alphanumeric, space, and apostrophe; strip everything else
    // then trim any leading/trailing non-alphanumeric characters
    fullName = fullName
      .replace(/[^a-zA-Z0-9 ']/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '')
      .trim();

    // make sure the given ID is unique
    if (this.accessories.has(id)) {
      throw new Error(`An accessory with ID '${id}' already exists`);
    }

    // create an accessory
    const accessory = new Accessory(
      id,
      this.device.id,
      fullName,
      this.platform,
      this.log,
      new AccessoryInformationAbility(this.device),
      ...abilities
    );

    // store the accessory
    this.accessories.set(id, accessory);

    return accessory;
  }

  /**
   * Creates an accessory for a switch component.
   * @param swtch - The switch component to use.
   * @param opts - Options for the switch.
   */
  protected addSwitch(swtch: Switch, opts?: Partial<AddSwitchOptions>): Accessory {
    const o = opts ?? {};

    // get the config options for this switch
    const switchOpts = this.getComponentOptions<SwitchOptions>(swtch) ?? {};

    // determine the switch type
    const type = typeof switchOpts.type === 'string' ? switchOpts.type.toLowerCase() : 'switch';
    const isOutlet = type === 'outlet';

    const id = o.single === true ? 'switch' : `switch-${swtch.id}`;
    const friendly = swtch.config?.name;
    const abilities = [
      new OutletAbility(swtch).setActive(isOutlet),
      new SwitchAbility(swtch).setActive(!isOutlet),
      // use the apower property to determine whether power metering is available
      new PowerMeterAbility(swtch).setActive(swtch.apower !== undefined),
    ];

    const accessory = friendly
      ? this.createAccessoryWithFullName(id, friendly, ...abilities)
      : this.createAccessory(id, o.single === true ? null : `Switch ${swtch.id + 1}`, ...abilities);

    return accessory.setActive(switchOpts.exclude !== true && o.active !== false);
  }

  /**
   * Creates an accessory for a cover component.
   * @param cover - The cover component to use.
   * @param opts - Options for the cover.
   */
  protected addCover(cover: Cover, opts?: Partial<AddCoverOptions>): Accessory {
    const o = opts ?? {};

    // get the config options for this cover
    const coverOpts = this.getComponentOptions<CoverOptions>(cover) ?? {};

    // determine the cover type
    const type = typeof coverOpts.type === 'string' ? coverOpts.type.toLowerCase() : 'window';
    const isDoor = type === 'door';
    const isWindowCovering = type === 'windowcovering';

    const id = o.single === true ? 'cover' : `cover-${cover.id}`;
    const friendly = cover.config?.name;
    const abilities = [
      new CoverAbility(cover, 'door').setActive(isDoor),
      new CoverAbility(cover, 'windowCovering').setActive(isWindowCovering),
      new CoverAbility(cover, 'window').setActive(!isDoor && !isWindowCovering),
      new PowerMeterAbility(cover),
    ];

    const accessory = friendly
      ? this.createAccessoryWithFullName(id, friendly, ...abilities)
      : this.createAccessory(id, 'Cover', ...abilities);

    return accessory.setActive(coverOpts.exclude !== true && o.active !== false);
  }

  /**
   * Creates an accessory for a light component.
   * @param light - The light component to use.
   * @param opts - Options for the light.
   */
  protected addLight(light: Light, opts?: Partial<AddLightOptions>): Accessory {
    const o = opts ?? {};

    // get the config options for this light
    const lightOpts = this.getComponentOptions<LightOptions>(light) ?? {};

    const type = typeof lightOpts.type === 'string' ? lightOpts.type.toLowerCase() : 'light';
    const isVentilation = type === 'fan' || type === 'ventilator';

    const id = o.single === true ? 'light' : `light-${light.id}`;
    const ability = isVentilation ? new VentilationAbility(light) : new LightAbility(light);
    const friendly = light.config?.name;
    const accessory = friendly
      ? this.createAccessoryWithFullName(id, friendly, ability)
      : this.createAccessory(id, o.single === true ? null : `${isVentilation ? 'Ventilation' : 'Light'} ${light.id + 1}`, ability);

    return accessory.setActive(lightOpts.exclude !== true && o.active !== false);
  }

  /**
   * Handles 'connect' events from the RPC handler.
   */
  protected handleConnect() {
    this.log.info('Device connected');
    this.connected = true;

    // refresh state on all abilities to ensure HomeKit has the latest values
    for (const accessory of this.accessories.values()) {
      for (const ability of accessory.abilities) {
        ability.refreshState();
      }
    }
  }

  /**
   * Handles 'disconnect' events from the RPC handler.
   */
  protected handleDisconnect(code: number, reason: string, reconnectIn: number | null) {
    const details = reason.length > 0 ? `reason: ${reason}` : `code: ${code}`;
    this.log.warn(`${this.connected ? 'Device disconnected' : 'Connection failed'} (${details})`);

    if (reconnectIn !== null) {
      let interval: string;

      if (reconnectIn < 60 * 1000) {
        interval = `${Math.floor(reconnectIn / 1000)} second(s)`;
      } else if (reconnectIn < 60 * 60 * 1000) {
        interval = `${Math.floor(reconnectIn / (60 * 1000))} minute(s)`;
      } else {
        interval = `${Math.floor(reconnectIn / (60 * 60 * 1000))} hour(s)`;
      }

      this.log.info(`Reconnecting in ${interval}`);
    }

    this.connected = false;
  }

  /**
   * Handles 'request' events from the RPC handler.
   */
  protected handleRequest(method: string) {
    this.log.debug('WebSocket:', method);
  }

  /**
   * Removes all event listeners from this device.
   */
  detach() {
    this.device.rpcHandler
      .off('connect', this.handleConnect, this)
      .off('disconnect', this.handleDisconnect, this)
      .off('request', this.handleRequest, this);

    // invoke detach() on all accessories
    for (const a of this.accessories.values()) {
      a.detach();
    }
  }

  /**
   * Destroys this device delegate, removing all event listeners and unregistering all accessories.
   */
  destroy() {
    this.detach();

    // find all platform accessories
    const pas = Array.from(this.accessories.values())
      .map(a => a.platformAccessory)
      .filter(a => a !== null) as PlatformAccessory[];

    if (pas.length > 0) {
      // remove the accessories from the platform
      this.platform.removeAccessory(...pas);
    }

    this.log.info('Device removed');
  }
}
