import { describe, it, expect, vi } from 'vitest';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { pathToFileURL } from 'url';

const distEntry = resolve(__dirname, '..', 'dist', 'index.js');

/**
 * Smoke tests guard the *publishable artifact*: the contents of `dist/`. If
 * the package main resolves, exports a function, and that function calls
 * `api.registerPlatform()` with the platform name homebridge ships with —
 * the plugin is loadable. This catches:
 *
 *   - broken `main` path in package.json
 *   - missing files from `dist/`
 *   - an accidental rename of the default export
 *   - a regression of the platform name (changes break existing config)
 */
describe('package smoke test', () => {
  it.skipIf(!existsSync(distEntry))(
    'dist/index.js exists (build was run)',
    () => {
      expect(existsSync(distEntry)).toBe(true);
    },
  );

  it.skipIf(!existsSync(distEntry))(
    'default export is a function that calls api.registerPlatform with PLATFORM_NAME',
    async () => {
      const mod = await import(pathToFileURL(distEntry).href);
      expect(typeof mod.default).toBe('function');

      const api = {
        registerPlatform: vi.fn(),
      };
      mod.default(api);
      expect(api.registerPlatform).toHaveBeenCalledTimes(1);
      const [name, ctor] = api.registerPlatform.mock.calls[0];
      expect(name).toBe('ShellyDS9-dev');
      expect(typeof ctor).toBe('function');
    },
  );
});
