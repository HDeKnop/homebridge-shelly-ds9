# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This is a personal fork of [homebridge-shelly-ds9](https://github.com/alexryd/homebridge-shelly-ds9)
packaged as `homebridge-shelly-ds9-dev`. Version numbers track upstream with a `-hubris.*` suffix
for in-progress work.

---

## [Unreleased — hubris branch]

### Fixed
- Device cache no longer crashes the plugin on startup if the cache file is corrupted or has an
  unexpected format; the file is skipped with an error log instead (SEC-1)
- `SwitchAbility`, `OutletAbility`, and `LightAbility` now implement `refreshState()` so HomeKit
  receives current device state after a device reconnects (OTH-1/2)
- `SwitchAbility`, `OutletAbility`, and `LightAbility` now register `onGet` handlers so
  Homebridge 2.0 characteristic polls return live device state (CC-1)
- Cached accessory name-sync heuristic simplified; a previous substring check could silently
  block legitimate renames (OTH-3)
- WebSocket `clientId` now uses `crypto.randomBytes` (64 bits of entropy) instead of
  `Math.random()` (SEC-2)
- Service-name collision no longer hides unnamed Shelly channels in Node-RED

### Changed
- Homebridge 1.x compatibility shim for `Fan`/`Fanv2` removed; `VentilationAbility` now
  targets `Service.Fanv2` directly and requires Homebridge ≥ 2.0 (HB-1/2/3)
- `engines.homebridge` narrowed to `^2.0.0`; `engines.node` requires `^22.0.0 || ^24.0.0`
- `FirmwareRevision` fallback changed from `'1.0.0'` to `'unknown'` (HB-4)
- WebSocket config numeric fields (`requestTimeout`, `pingInterval`, `reconnectInterval`) are now
  clamped to valid ranges on load to prevent passing illegal values to the socket layer (SEC-3)
- `Pm1Ability` constructor parameter renamed from `componentPm1` to `component` for consistency
  with all other abilities (CC-5)
- `OutletAbility` log messages corrected from "Switch Status" to "Outlet Status" (CC-2)
- Log handler strings across all abilities use template literals consistently (CC-3)

### Internal
- `tsconfig.json`: removed `noImplicitAny: false` override that was silently cancelling
  `strict: true`; two resulting implicit-any sites fixed (TS-2)
- Abstract method signatures `initialize()`, `detach()`, `setup()` now declare explicit `: void`
  return types (TS-5); `set active` setters now carry explicit `: boolean` parameter type (TS-1)
- `@types/node` bumped from `^20` to `^22` to match `engines.node` (DEP-1)
- CI workflow fixed: removed non-existent `test:coverage` script reference, removed
  `continue-on-error` on lint job (lint is now a hard gate), added `npm audit` job, updated Node
  matrix to 22/24 (DOC-8/SEC-5)
- Dead code removed from `Pm1Ability` (commented-out import and log statements) (CC-6/7)
- `// HDK` development markers removed throughout (CC-8)
- Typos in inline comments fixed; `handleDisconnect` log building refactored to template
  literals (CC-9/10)
- Exhaustive `default` branch added to `triggerPress` switch-case (CC-11)

---

## [1.5.8] — upstream baseline (fork diverges here)

### Added
- Support for gen3 Dimmer and Pro Dimmer 0/1–10V PM devices
- Support for gen3 2-PM device (based on Shelly Plus 2 PM)
- Support for `shelly0110dimg3` (gen3 dimmer variant)
- Ventilation/fan light type option (`light.type: 'fan' | 'ventilator'`)
- Homebridge 2.0 compatibility

### Fixed
- Cover getting out of sync with relay when using physical switches
- Cover PM functionality
- Cover TargetPosition reconciliation when `current_pos` hits a hard limit (0 or 100)
- `CoverAbility` crash on reconnect and duplicate close commands
- Cover commands no longer dropped when `target_pos` is stale
- State synchronisation for cover abilities when devices are controlled manually
- On/off switch functionality for light abilities (HomeKit status polling)
- HAP accessory and service name sanitisation

---

## [1.5.2]

### Added
- Shelly Plus Plug UK and IT variants
- Beta support for Dual Cover PM

---

## [1.5.1]

### Added
- Various device and bug-fix updates (see git log)

---

## [1.5.0]

### Added
- Initial release of the 1.5.x line

---

## [1.4.x] and earlier

See the upstream repository at <https://github.com/alexryd/homebridge-shelly-ds9/releases> for
older release notes.
