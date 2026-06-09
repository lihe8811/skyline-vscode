const test = require('node:test');
const assert = require('node:assert/strict');

const { buildApp } = require('../src/app');
const { createAuthService, hashPassword } = require('../src/modules/auth/auth.service');
const { registerAuthRoutes } = require('../src/modules/auth/auth.routes');
const { createUserRepository: createMongoUserRepository } = require('../src/modules/auth/user.repository');

function createUserRepository(users) {
  return {
    async findByUsername(username) {
      return users.find((user) => user.username.toLowerCase() === username.toLowerCase()) || null;
    },
  };
}

async function buildAuthApp() {
  const userRepository = createUserRepository([
    {
      userId: 1,
      username: 'teacher1',
      displayName: 'Teacher One',
      passwordHash: await hashPassword('teacher-pass'),
      role: 'teacher',
    },
    {
      userId: 2,
      username: 'student1',
      displayName: 'Student One',
      passwordHash: await hashPassword('student-pass'),
      role: 'student',
    },
  ]);
  const authService = createAuthService({
    userRepository,
    tokenSecret: 'test-only-secret',
    tokenTtlSeconds: 3600,
  });
  const app = await buildApp();
  registerAuthRoutes(app, { authService });
  return app;
}

test('login reads a database user and returns a signed access token', async () => {
  const app = await buildAuthApp();
  const res = await app.inject({
    method: 'POST',
    url: '/v1/auth/login',
    body: { username: 'teacher1', password: 'teacher-pass' },
  });

  assert.equal(res.statusCode, 200);
  const payload = res.json();
  assert.equal(typeof payload.accessToken, 'string');
  assert.equal(payload.user.username, 'teacher1');
  assert.equal(payload.user.displayName, 'Teacher One');
  assert.equal(payload.user.role, 'teacher');
});

test('login rejects a password that does not match the database hash', async () => {
  const app = await buildAuthApp();
  const res = await app.inject({
    method: 'POST',
    url: '/v1/auth/login',
    body: { username: 'teacher1', password: 'wrong-password' },
  });

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.json(), { error: 'Invalid credentials' });
});

test('authenticated profile returns the database user from the access token', async () => {
  const app = await buildAuthApp();
  const login = await app.inject({
    method: 'POST',
    url: '/v1/auth/login',
    body: { username: 'student1', password: 'student-pass' },
  });

  const res = await app.inject({
    method: 'GET',
    url: '/v1/auth/me',
    headers: { authorization: `Bearer ${login.json().accessToken}` },
  });

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json(), {
    user: {
      userId: 2,
      username: 'student1',
      displayName: 'Student One',
      role: 'student',
    },
  });
});

test('Mongo user repository queries oj_app users by normalized username', async () => {
  let observedQuery;
  const db = {
    collection(name) {
      assert.equal(name, 'users');
      return {
        async findOne(query) {
          observedQuery = query;
          return { userId: 3, username: 'Student3' };
        },
      };
    },
  };

  const repository = createMongoUserRepository(db);
  const user = await repository.findByUsername(' Student3 ');

  assert.equal(user.userId, 3);
  assert.deepEqual(observedQuery, {
    $or: [
      { usernameLower: 'student3' },
      { username: 'student3' },
    ],
  });
});
