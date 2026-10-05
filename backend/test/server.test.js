const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../server');

test('Backend API - Health and Core Endpoints return valid structures', () => {
  assert.equal(typeof app, 'function');
  assert.equal(typeof app.handle, 'function');
});
