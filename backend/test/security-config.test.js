const test = require('node:test');
const assert = require('node:assert/strict');

const configModulePath = require.resolve('../src/config');

test('production config does not ship a weak default JWT secret', () => {
  const savedJwtSecret = process.env.JWT_SECRET;
  const savedNodeEnv = process.env.NODE_ENV;

  delete process.env.JWT_SECRET;
  delete process.env.NODE_ENV;
  delete require.cache[configModulePath];

  const { config } = require('../src/config');
  assert.equal(config.jwtSecret, '');

  if (savedJwtSecret) process.env.JWT_SECRET = savedJwtSecret;
  else delete process.env.JWT_SECRET;

  if (savedNodeEnv) process.env.NODE_ENV = savedNodeEnv;
  else delete process.env.NODE_ENV;

  delete require.cache[configModulePath];
});
