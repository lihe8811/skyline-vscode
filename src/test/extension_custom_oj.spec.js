const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const { OjApiClient } = require('../../out/src/api/ojApiClient');
const { OjSession } = require('../../out/src/auth/ojSession');

test('OjApiClient lists problems and submits Python code through unified backend', async () => {
  const calls = [];
  const requester = async (url, init) => {
    calls.push({ url, init });
    if (url === 'https://oj.example/v1/problems') {
      return {
        ok: true,
        status: 200,
        json: async () => [{ problemId: 2, title: 'Sum', difficulty: 1, tags: ['Python'] }],
      };
    }
    if (url === 'https://oj.example/v1/submissions') {
      return {
        ok: true,
        status: 202,
        json: async () => ({ submissionId: 'sub-1', status: 'pending' }),
      };
    }
    if (url === 'https://oj.example/v1/submissions/sub-1') {
      return {
        ok: true,
        status: 200,
        json: async () => ({ submissionId: 'sub-1', status: 'accepted', score: 100 }),
      };
    }
    throw new Error(`unexpected URL: ${url}`);
  };

  const client = new OjApiClient({ baseUrl: 'https://oj.example/', token: 'token-1', requester });

  const problems = await client.listProblems();
  assert.deepEqual(problems, [{ problemId: 2, title: 'Sum', difficulty: 1, tags: ['Python'] }]);

  const created = await client.createSubmission({
    problemId: 2,
    homeworkId: 'hw1',
    sourceCode: 'print(1 + 2)',
  });
  assert.deepEqual(created, { submissionId: 'sub-1', status: 'pending' });

  const result = await client.getSubmission('sub-1');
  assert.deepEqual(result, { submissionId: 'sub-1', status: 'accepted', score: 100 });
  assert.equal(calls[0].init.headers.Authorization, 'Bearer token-1');
});

test('OjApiClient logs in with username and password and loads the current user', async () => {
  const calls = [];
  const requester = async (url, init) => {
    calls.push({ url, init });
    if (url === 'https://oj.example/v1/auth/login') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          accessToken: 'token-2',
          user: { userId: 7, username: 'student7', displayName: 'Student Seven', role: 'student' },
        }),
      };
    }
    if (url === 'https://oj.example/v1/auth/me') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          user: { userId: 7, username: 'student7', displayName: 'Student Seven', role: 'student' },
        }),
      };
    }
    throw new Error(`unexpected URL: ${url}`);
  };

  const anonymousClient = new OjApiClient({ baseUrl: 'https://oj.example', requester });
  const login = await anonymousClient.login({ username: 'student7', password: 'secret' });
  assert.equal(login.accessToken, 'token-2');
  assert.equal(calls[0].init.headers.Authorization, undefined);
  assert.deepEqual(JSON.parse(calls[0].init.body), { username: 'student7', password: 'secret' });

  const authenticatedClient = new OjApiClient({
    baseUrl: 'https://oj.example',
    token: login.accessToken,
    requester,
  });
  const profile = await authenticatedClient.getCurrentUser();
  assert.equal(profile.user.username, 'student7');
  assert.equal(calls[1].init.headers.Authorization, 'Bearer token-2');
});

test('OjSession persists and clears the authenticated user and token', async () => {
  const values = new Map();
  const storage = {
    get: async (key) => values.get(key),
    store: async (key, value) => values.set(key, value),
    delete: async (key) => values.delete(key),
  };
  const session = new OjSession(storage);
  await session.save({
    accessToken: 'token-3',
    user: { userId: 8, username: 'student8', displayName: 'Student Eight', role: 'student' },
  });

  const restored = new OjSession(storage);
  await restored.restore();
  assert.equal(restored.getToken(), 'token-3');
  assert.equal(restored.getUser().username, 'student8');

  await restored.clear();
  assert.equal(restored.getToken(), undefined);
  assert.equal(restored.getUser(), undefined);
});

test('OjApiClient default requester sends login over HTTP', async () => {
  const server = http.createServer((request, response) => {
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => {
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      assert.equal(request.method, 'POST');
      assert.equal(request.url, '/v1/auth/login');
      assert.deepEqual(body, { username: 'network-user', password: 'network-pass' });
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({
        accessToken: 'network-token',
        user: { userId: 9, username: 'network-user', displayName: 'Network User', role: 'student' },
      }));
    });
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    const client = new OjApiClient({ baseUrl: `http://127.0.0.1:${address.port}` });
    const login = await client.login({ username: 'network-user', password: 'network-pass' });
    assert.equal(login.accessToken, 'network-token');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
