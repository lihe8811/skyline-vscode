const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const yaml = require('js-yaml');

test('pinned OpenAPI contract targets production and contains every client route', () => {
  const contract = yaml.load(fs.readFileSync(
    path.resolve(__dirname, '../../../contracts/skyline-openapi.yaml'),
    'utf8',
  ));
  assert.equal(contract.servers[0].url, 'https://homework.skyline-ai.space');
  assert.deepEqual(Object.keys(contract.paths).sort(), [
    '/api/skyline/v1/admin/plan',
    '/api/skyline/v1/admin/sync',
    '/api/skyline/v1/auth/login',
    '/api/skyline/v1/auth/logout',
    '/api/skyline/v1/auth/me',
    '/api/skyline/v1/homeworks',
    '/api/skyline/v1/homeworks/{id}',
    '/api/skyline/v1/homeworks/{id}/leaderboard',
    '/api/skyline/v1/problems',
    '/api/skyline/v1/problems/{id}',
    '/api/skyline/v1/submissions',
    '/api/skyline/v1/submissions/{id}',
  ]);
});
