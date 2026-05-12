# Contributing

Thanks for taking an interest in the project! This is a personal fork of
[homebridge-shelly-ds9](https://github.com/alexryd/homebridge-shelly-ds9), so the scope is fairly
focused — but patches that fix bugs or add new Shelly device support are very welcome.

## Before You Start

- Check whether an issue already exists for the bug or device you're adding.
- For anything beyond a trivial fix, open an issue first to discuss the approach.
- Upstream device additions should generally be proposed to the
  [original repository](https://github.com/alexryd/homebridge-shelly-ds9) first.

## Development Setup

```bash
git clone https://github.com/HDEKNOP/homebridge-shelly-ds9.git
cd homebridge-shelly-ds9
npm install
npm run build       # compile TypeScript
npm run lint        # ESLint (zero warnings policy)
```

Requires Node ≥ 22.

## Project Structure

```
src/
  index.ts                    Entry point — registers the platform with Homebridge
  platform.ts                 ShellyPlatform — device discovery and accessory lifecycle
  accessory.ts                Wraps a Homebridge PlatformAccessory; holds Abilities
  config.ts                   Configuration interfaces and PlatformOptions parser
  abilities/                  One file per HomeKit service type
    base.ts                   Abstract Ability — all abilities extend this
    switch.ts                 Service.Switch
    outlet.ts                 Service.Outlet
    light.ts                  Service.Lightbulb
    cover.ts                  Service.Window / Door / WindowCovering
    ventilation.ts            Service.Fanv2
    power-meter.ts            Custom PowerMeter service (for Switch/Cover components)
    pm1.ts                    Custom Pm1 service (for standalone PM devices)
    stateless-programmable-switch.ts
    readonly-switch.ts
    accessory-information.ts
    service-label.ts
  device-delegates/           One file per Shelly device model (or model family)
    base.ts                   Abstract DeviceDelegate — factory for Accessories
    shelly-plus-1.ts          Example: single-switch device
    shelly-plus-2-pm.ts       Example: dual-switch / cover device
    ...
  utils/
    characteristics.ts        Custom HomeKit characteristics (Voltage, Current, etc.)
    services.ts               Custom HomeKit services (PowerMeter, Pm1)
    device-cache.ts           Persists discovered devices for faster reconnection
    device-logger.ts          Logger wrapper that prefixes messages with device ID
```

## Adding Support for a New Device

1. **Find the device class in `shellies-ds9`**

   The `shellies-ds9` library (in `node_modules/shellies-ds9/dist/`) defines a class for each
   supported device. The class name and the static `model` property are what you need.

2. **Create a delegate file** in `src/device-delegates/`:

   ```typescript
   // src/device-delegates/shelly-my-device.ts
   import { ShellyMyDevice } from 'shellies-ds9';
   import { DeviceDelegate } from './base.js';

   export class ShellyMyDeviceDelegate extends DeviceDelegate {
     protected setup(): void {
       const d = this.device as ShellyMyDevice;
       // Use addSwitch(), addCover(), addLight(), or createAccessory() directly
       this.addSwitch(d.switch0, { single: true });
     }
   }

   DeviceDelegate.registerDelegate(
     ShellyMyDeviceDelegate,
     ShellyMyDevice,
     // add any variant classes here
   );
   ```

3. **Export it** from `src/device-delegates/index.ts`.

4. **Test** by deploying to a device running Homebridge and checking the log for
   `Device added` followed by the correct accessories appearing in HomeKit.

### Helper methods on `DeviceDelegate`

| Method | Use for |
|--------|---------|
| `addSwitch(swtch, opts?)` | A switch component; handles outlet/switch type and power metering automatically |
| `addCover(cover, opts?)` | A cover component; handles door/window/windowCovering type |
| `addLight(light, opts?)` | A light/dimmer component; handles light/ventilator/fan type |
| `createAccessory(id, nameSuffix, ...abilities)` | Any other combination of abilities |
| `createAccessoryWithFullName(id, name, ...abilities)` | When the component has its own name that should stand alone |

### Single vs. multi-component devices

Pass `{ single: true }` to `addSwitch`/`addCover`/`addLight` when the device has only one of
that component type. This affects the accessory ID and default name (no index suffix).

For devices that can operate in multiple modes (e.g. Shelly Plus 2 PM in switch vs. cover mode),
check `device.profile` and pass `{ active: true/false }` accordingly.

## Adding a New Ability

1. Create `src/abilities/my-ability.ts` extending `Ability`.
2. Implement `protected get serviceClass()`, `protected initialize(): void`, and
   `detach(): void`.
3. If the ability should update HomeKit after device reconnection, override `refreshState()`.
4. Export it from `src/abilities/index.ts`.

Key patterns from `Ability`:
- Access the HomeKit service via `this.service` (throws if called before `setup()`).
- Access HAP types via `this.Service` and `this.Characteristic` (shortcuts to `api.hap.*`).
- Log via `this.log` (DeviceLogger — prefixes messages with device ID).
- Throw `this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE` from `onSet`/`onGet` handlers
  when a device command fails.

## Coding Conventions

- **TypeScript strict mode** is enforced (`strict: true`, `noImplicitAny` active). All new code
  must pass `npm run build` with zero errors.
- **Lint** is a hard gate: `npm run lint` must produce zero warnings.
- **No `any`** — use proper types or `unknown` with a narrowing cast.
- **Template literals** for string interpolation, not concatenation.
- **No comments** unless the *why* is non-obvious. Don't describe what the code does.
- **Abstract method signatures** must include explicit return types (`void`, etc.).
- **Setter parameters** must have explicit types (`set active(value: boolean)`).
- Event listeners use the `this` binding parameter of `on()`/`off()` rather than `.bind(this)`:
  ```typescript
  this.component.on('change:output', this.myHandler, this);
  this.component.off('change:output', this.myHandler, this);
  ```

## Pull Request Checklist

- [ ] `npm run build` passes
- [ ] `npm run lint` passes (zero warnings)
- [ ] New ability implements `refreshState()` if it holds stateful characteristics
- [ ] New device delegate is exported from `device-delegates/index.ts`
- [ ] CHANGELOG.md `[Unreleased]` section updated
- [ ] Commit messages follow the `type: description` convention (`fix:`, `feat:`, `refactor:`, etc.)
