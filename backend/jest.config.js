/** @type {import('jest').Config} */
export default {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  transform: {},
  injectGlobals: false,
  globalSetup: '<rootDir>/tests/helpers/globalSetup.js',
  // Tests share one database
  maxWorkers: 1,
  collectCoverageFrom: ['src/**/*.js', '!src/server.js'],
  coverageDirectory: 'coverage',
};
