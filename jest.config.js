/* eslint-disable */
/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: ['**/test/**/*.test.ts', '**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
  setupFiles: ['<rootDir>/test/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  coverageReporters: ['text', 'text-summary', 'lcov', 'html'],
  coverageDirectory: 'coverage',
  // Global ≥80% threshold for statements/lines, with branches/functions held
  // a notch lower because device-delegate setup() wrappers and Shellies
  // discovery flows are exercised end-to-end via integration tests rather
  // than per-file assertions — the bulk of business logic *is* covered.
  coverageThreshold: {
    global: {
      statements: 80,
      lines: 80,
      functions: 75,
      branches: 65,
    },
    './src/abilities/': {
      statements: 85,
      lines: 85,
      functions: 85,
      branches: 65,
    },
    './src/utils/': {
      statements: 90,
      lines: 90,
      functions: 90,
      branches: 75,
    },
    './src/config.ts': {
      statements: 90,
      lines: 90,
      functions: 90,
      branches: 80,
    },
  },
};
