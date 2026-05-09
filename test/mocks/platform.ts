import { ShellyPlatform } from '../../src/platform';
import { createMockApi, createMockLogger, MockApi, MockLogger } from './api';

/**
 * Helper that builds a `ShellyPlatform` wired up to mocks. Use this when an
 * ability or accessory test needs a `platform` reference (for `api.hap`,
 * `customCharacteristics`, `customServices`, `addAccessory` etc.). The
 * `Shellies` constructor in `ShellyPlatform` does not open any sockets at
 * construction time — it only does so when discoverers are run, which we
 * never trigger here.
 */
export const createTestPlatform = (
  config: Record<string, unknown> = {},
): { platform: ShellyPlatform; api: MockApi; log: MockLogger } => {
  const api = createMockApi();
  const log = createMockLogger();
  const platform = new ShellyPlatform(
    log,
    {
      platform: 'ShellyDS9-dev',
      ...config,
    },
    api,
  );
  return { platform, api, log };
};
