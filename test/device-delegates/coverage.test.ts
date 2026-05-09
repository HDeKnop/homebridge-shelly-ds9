/**
 * Lightweight setup() coverage for every device-delegate wrapper class.
 *
 * The `integration.test.ts` file already exercises representative devices
 * end-to-end with state-update assertions. This file simply guarantees that
 * every delegate's setup() runs without throwing on a minimally-shaped
 * device, so a regression in one of the lesser-tested wrappers (Pro Dimmer,
 * Pro 2, Plus PM Mini, etc.) is caught immediately.
 */
import {
  ShellyPlus1Delegate,
  ShellyPlus1PmDelegate,
  ShellyPlus2PmDelegate,
  ShellyPlusDimmer010Delegate,
  ShellyPlusDimmer010PmDelegate,
  ShellyPlusPlugUsDelegate,
  ShellyPlusPmDelegate,
  ShellyPro1Delegate,
  ShellyPro1PmDelegate,
  ShellyPro2Delegate,
  ShellyPro2PmDelegate,
  ShellyPro3Delegate,
  ShellyPro4PmDelegate,
  ShellyProDimmer1PmDelegate,
  ShellyProDimmer2PmDelegate,
  ShellyProDualCoverPmDelegate,
} from '../../src/device-delegates';
import { createTestPlatform } from '../mocks/platform';
import { FakeDevice, createSwitch, createCover, createLight, FakeComponent } from '../mocks/shelly';

const tick = () => new Promise<void>(resolve => setTimeout(resolve, 5));

const fakePm1 = (id = 0) => {
  const c = new FakeComponent({ id, key: `pm1:${id}` }) as unknown as {
    apower?: number; voltage?: number; current?: number; aenergy?: { total: number };
  } & FakeComponent;
  c.apower = 0;
  return c;
};

interface Spec {
  name: string;
  Delegate: new (...args: any[]) => any;
  build: () => unknown;
  expectedAccessoryIds: string[];
}

const specs: Spec[] = [
  {
    name: 'Plus 1',
    Delegate: ShellyPlus1Delegate,
    build: () => Object.assign(new FakeDevice({ model: 'SNSW-001X16EU' }), {
      switch0: createSwitch({ id: 0 }),
    }),
    expectedAccessoryIds: ['switch'],
  },
  {
    name: 'Plus 1 PM',
    Delegate: ShellyPlus1PmDelegate,
    build: () => Object.assign(new FakeDevice({ model: 'SNSW-001P16EU' }), {
      switch0: createSwitch({ id: 0, apower: 5 }),
    }),
    expectedAccessoryIds: ['switch'],
  },
  {
    name: 'Plus 2 PM (switch profile)',
    Delegate: ShellyPlus2PmDelegate,
    build: () => Object.assign(new FakeDevice({ model: 'SNSW-002P16EU' }), {
      profile: 'switch',
      switch0: createSwitch({ id: 0 }),
      switch1: createSwitch({ id: 1 }),
    }),
    expectedAccessoryIds: ['switch-0', 'switch-1'],
  },
  {
    name: 'Plus 2 PM (cover profile)',
    Delegate: ShellyPlus2PmDelegate,
    build: () => Object.assign(new FakeDevice({ model: 'SNSW-002P16EU' }), {
      profile: 'cover',
      cover0: createCover({ id: 0, pos_control: true, current_pos: 0, target_pos: 0 }),
    }),
    expectedAccessoryIds: ['cover-0'],
  },
  {
    name: 'Plus Dimmer',
    Delegate: ShellyPlusDimmer010Delegate,
    build: () => Object.assign(new FakeDevice({ model: 'SNDM-0013US' }), {
      light0: createLight({ id: 0 }),
    }),
    expectedAccessoryIds: ['light'],
  },
  {
    name: 'Plus Dimmer PM',
    Delegate: ShellyPlusDimmer010PmDelegate,
    build: () => Object.assign(new FakeDevice({ model: 'SNDM-00100WW' }), {
      light0: createLight({ id: 0 }),
    }),
    expectedAccessoryIds: ['light'],
  },
  {
    name: 'Plus Plug US',
    Delegate: ShellyPlusPlugUsDelegate,
    build: () => Object.assign(new FakeDevice({ model: 'SNPL-00112EU' }), {
      switch0: createSwitch({ id: 0, apower: 12 }),
    }),
    expectedAccessoryIds: ['switch'],
  },
  {
    name: 'Plus PM Mini',
    Delegate: ShellyPlusPmDelegate,
    build: () => Object.assign(new FakeDevice({ model: 'SNPM-001PCEU16' }), {
      pm1: fakePm1(0),
    }),
    expectedAccessoryIds: ['switch'],
  },
  {
    name: 'Pro 1',
    Delegate: ShellyPro1Delegate,
    build: () => Object.assign(new FakeDevice({ model: 'SPSW-001XE16EU' }), {
      switch0: createSwitch({ id: 0 }),
    }),
    expectedAccessoryIds: ['switch'],
  },
  {
    name: 'Pro 1 PM',
    Delegate: ShellyPro1PmDelegate,
    build: () => Object.assign(new FakeDevice({ model: 'SPSW-001PE16EU' }), {
      switch0: createSwitch({ id: 0, apower: 1 }),
    }),
    expectedAccessoryIds: ['switch'],
  },
  {
    name: 'Pro 2',
    Delegate: ShellyPro2Delegate,
    build: () => Object.assign(new FakeDevice({ model: 'SPSW-201XE16EU' }), {
      switch0: createSwitch({ id: 0 }),
      switch1: createSwitch({ id: 1 }),
    }),
    expectedAccessoryIds: ['switch-0', 'switch-1'],
  },
  {
    name: 'Pro 2 PM (switch)',
    Delegate: ShellyPro2PmDelegate,
    build: () => Object.assign(new FakeDevice({ model: 'SPSW-201PE16EU' }), {
      profile: 'switch',
      switch0: createSwitch({ id: 0 }),
      switch1: createSwitch({ id: 1 }),
    }),
    expectedAccessoryIds: ['switch-0', 'switch-1'],
  },
  {
    name: 'Pro 2 PM (cover)',
    Delegate: ShellyPro2PmDelegate,
    build: () => Object.assign(new FakeDevice({ model: 'SPSW-201PE16EU' }), {
      profile: 'cover',
      cover0: createCover({ id: 0, pos_control: true, current_pos: 0, target_pos: 0 }),
    }),
    expectedAccessoryIds: ['cover-0'],
  },
  {
    name: 'Pro 3',
    Delegate: ShellyPro3Delegate,
    build: () => Object.assign(new FakeDevice({ model: 'SPSW-003XE16EU' }), {
      switch0: createSwitch({ id: 0 }),
      switch1: createSwitch({ id: 1 }),
      switch2: createSwitch({ id: 2 }),
    }),
    expectedAccessoryIds: ['switch-0', 'switch-1', 'switch-2'],
  },
  {
    name: 'Pro 4 PM',
    Delegate: ShellyPro4PmDelegate,
    build: () => Object.assign(new FakeDevice({ model: 'SPSW-104PE16EU' }), {
      switch0: createSwitch({ id: 0 }),
      switch1: createSwitch({ id: 1 }),
      switch2: createSwitch({ id: 2 }),
      switch3: createSwitch({ id: 3 }),
    }),
    expectedAccessoryIds: ['switch-0', 'switch-1', 'switch-2', 'switch-3'],
  },
  {
    name: 'Pro Dimmer 1 PM',
    Delegate: ShellyProDimmer1PmDelegate,
    build: () => Object.assign(new FakeDevice({ model: 'SPDM-001PE01EU' }), {
      light0: createLight({ id: 0 }),
    }),
    expectedAccessoryIds: ['light'],
  },
  {
    name: 'Pro Dimmer 2 PM',
    Delegate: ShellyProDimmer2PmDelegate,
    build: () => Object.assign(new FakeDevice({ model: 'SPDM-002PE01EU' }), {
      light0: createLight({ id: 0 }),
      light1: createLight({ id: 1 }),
    }),
    expectedAccessoryIds: ['light-0', 'light-1'],
  },
  {
    name: 'Pro Dual Cover PM',
    Delegate: ShellyProDualCoverPmDelegate,
    build: () => Object.assign(new FakeDevice({ model: 'SPSH-002PE16EU' }), {
      cover0: createCover({ id: 0, pos_control: true, current_pos: 0, target_pos: 0 }),
      cover1: createCover({ id: 1, pos_control: true, current_pos: 0, target_pos: 0 }),
    }),
    expectedAccessoryIds: ['cover-0', 'cover-1'],
  },
];

describe('Device-delegate setup() smoke tests', () => {
  it.each(specs)('$name builds expected accessories', async ({ Delegate, build, expectedAccessoryIds }) => {
    const { platform } = createTestPlatform();
    const device = build();
    const delegate = new Delegate(device, { exclude: false, protocol: 'websocket' }, platform);
    await tick();

    const accs = (delegate as unknown as { accessories: Map<string, unknown> }).accessories;
    for (const id of expectedAccessoryIds) {
      expect(accs.has(id)).toBe(true);
    }
    expect(accs.size).toBe(expectedAccessoryIds.length);
  });
});
