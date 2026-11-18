const migrate = require('../../scripts/migrate');

module.exports = async () => {
  process.env.NODE_ENV = 'test';
  await migrate('up', { log: () => {} });
};
