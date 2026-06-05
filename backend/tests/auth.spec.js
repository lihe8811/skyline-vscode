const test = require('node:test');
const assert = require('node:assert/strict');

const { buildApp } = require('../src/app');
const { registerAuthRoutes } = require('../src/modules/auth/auth.routes');

test('login succeeds with seeded teacher user', async () => {
  const app = await buildApp();
  registerAuthRoutes(app);

  const res = await app.inject({
    method: 'POST',
    url: '/v1/auth/login',
    body: { username: 'teacher1', password: 'teacher-pass' },
  });

  assert.equal(res.statusCode, 200);
  const payload = res.json();
  assert.equal(typeof payload.accessToken, 'string');
  assert.equal(payload.user.role, 'teacher');
});

test('teacher-only route rejects student token', async () => {
  const app = await buildApp();
  registerAuthRoutes(app);

  const login = await app.inject({
    method: 'POST',
    url: '/v1/auth/login',
    body: { username: 'student1', password: 'student-pass' },
  });
  const token = login.json().accessToken;

  const res = await app.inject({
    method: 'GET',
    url: '/v1/admin/metrics',
    headers: { authorization: `Bearer ${token}` },
  });

  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.json(), { error: 'Forbidden' });
});
