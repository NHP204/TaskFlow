/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  // Applies migrations to the isolated test database once per run.
  globalSetup: '<rootDir>/tests/helpers/globalSetup.js',
  // Integration tests share one database, so run test files sequentially.
  maxWorkers: 1,
  collectCoverageFrom: ['src/**/*.js', '!src/server.js'],
  coverageDirectory: 'coverage',
};
