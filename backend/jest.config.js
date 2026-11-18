/** @type {import('jest').Config} */
export default {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  // Native ESM: no Babel transform; run via `node --experimental-vm-modules`.
  transform: {},
  // Test files import describe/it/expect/jest explicitly from @jest/globals.
  injectGlobals: false,
  // Applies migrations to the isolated test database once per run.
  globalSetup: '<rootDir>/tests/helpers/globalSetup.js',
  // Integration tests share one database, so run test files sequentially.
  maxWorkers: 1,
  collectCoverageFrom: ['src/**/*.js', '!src/server.js'],
  coverageDirectory: 'coverage',
};
