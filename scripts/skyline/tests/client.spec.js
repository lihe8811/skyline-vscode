const assert = require('node:assert/strict');
const test = require('node:test');
const { SkylineAdminClient } = require('../client');

test('sync obtains a plan before applying the same revision', async () => {
  const calls = [];
  const requester = async (url, init) => {
    calls.push({ url, init });
    if (url.endsWith('/admin/plan')) {
      return { ok: true, status: 200, json: async () => ({ plan: { revision: 'r2', operations: [] } }) };
    }
    return { ok: true, status: 200, json: async () => ({ result: { revision: 'r2', applied: true } }) };
  };
  const client = new SkylineAdminClient({
    baseUrl: 'https://homework.skyline-ai.space/',
    token: 'admin-token',
    requester,
  });
  const manifest = { revision: 'r2' };
  await client.sync(manifest);
  assert.deepEqual(calls.map((call) => call.url), [
    'https://homework.skyline-ai.space/api/skyline/v1/admin/plan',
    'https://homework.skyline-ai.space/api/skyline/v1/admin/sync',
  ]);
  assert.equal(calls[0].init.headers.Authorization, 'Bearer admin-token');
  assert.equal(JSON.parse(calls[1].init.body).planRevision, 'r2');
});

test('dry-run never calls the synchronization endpoint', async () => {
  const calls = [];
  const client = new SkylineAdminClient({
    baseUrl: 'https://homework.skyline-ai.space',
    token: 'admin-token',
    requester: async (url, init) => {
      calls.push({ url, init });
      return { ok: true, status: 200, json: async () => ({ plan: { revision: 'r2' } }) };
    },
  });
  const result = await client.sync({ revision: 'r2' }, { dryRun: true });
  assert.equal(result.applied, false);
  assert.equal(calls.length, 1);
});
