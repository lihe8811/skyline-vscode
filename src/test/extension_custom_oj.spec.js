const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const { OjApiClient } = require('../../out/src/api/ojApiClient');
const { OjSession } = require('../../out/src/auth/ojSession');
const { parseOjFileMetadata, renderOjPythonFile } = require('../../out/src/api/ojProblemFile');
const { formatLeaderboardRows } = require('../../out/src/api/ojHomeworkFormat');
const { buildHomeworkTree } = require('../../out/src/api/ojHomeworkTree');

test('OjApiClient lists problems and submits Python code through unified backend', async () => {
  const calls = [];
  let submissionPolls = 0;
  const requester = async (url, init) => {
    calls.push({ url, init });
    if (url === 'https://oj.example/api/skyline/v1/problems') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          problems: [{ id: 'sum', numericId: 2, title: 'Sum', difficulty: 1, tags: ['Python'], language: 'py3' }],
        }),
      };
    }
    if (url === 'https://oj.example/api/skyline/v1/submissions') {
      return {
        ok: true,
        status: 202,
        json: async () => ({ submission: { id: 'sub-1', problemId: 2, status: 'waiting' } }),
      };
    }
    if (url === 'https://oj.example/api/skyline/v1/submissions/sub-1') {
      submissionPolls += 1;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          submission: submissionPolls === 1
            ? { id: 'sub-1', problemId: 2, status: 'judging', score: 0 }
            : { id: 'sub-1', problemId: 2, status: 'accepted', score: 100 },
        }),
      };
    }
    throw new Error(`unexpected URL: ${url}`);
  };

  const client = new OjApiClient({ baseUrl: 'https://oj.example/', token: 'token-1', requester });

  const problems = await client.listProblems();
  assert.deepEqual(problems, [{ id: 'sum', numericId: 2, title: 'Sum', difficulty: 1, tags: ['Python'], language: 'py3' }]);

  const created = await client.createSubmission({
    problemId: 2,
    homeworkId: 'hw1',
    sourceCode: 'print(1 + 2)',
  });
  assert.deepEqual(created, { id: 'sub-1', problemId: 2, status: 'waiting' });

  const result = await client.waitForSubmission('sub-1', { intervalMs: 0, maxAttempts: 2 });
  assert.deepEqual(result, { id: 'sub-1', problemId: 2, status: 'accepted', score: 100 });
  assert.equal(calls[0].init.headers.Authorization, 'Bearer token-1');
});

test('OjApiClient logs in with username and password and loads the current user', async () => {
  const calls = [];
  const requester = async (url, init) => {
    calls.push({ url, init });
    if (url === 'https://oj.example/api/skyline/v1/auth/login') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          accessToken: 'token-2',
          user: { id: 7, username: 'student7', displayName: 'Student Seven', role: 'student' },
        }),
      };
    }
    if (url === 'https://oj.example/api/skyline/v1/auth/me') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          user: { id: 7, username: 'student7', displayName: 'Student Seven', role: 'student' },
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

test('OjApiClient revokes the current bearer session on logout', async () => {
  const calls = [];
  const client = new OjApiClient({
    baseUrl: 'https://oj.example',
    token: 'token-logout',
    requester: async (url, init) => {
      calls.push({ url, init });
      return { ok: true, status: 204, json: async () => ({}) };
    },
  });

  await client.logout();
  assert.equal(calls[0].url, 'https://oj.example/api/skyline/v1/auth/logout');
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer token-logout');
});

test('OjApiClient loads homework and leaderboard resources', async () => {
  const requester = async (url) => {
    if (url === 'https://oj.example/api/skyline/v1/homeworks') {
      return { ok: true, status: 200, json: async () => ({ homeworks: [{ id: 'hw-1', title: 'Week 1' }] }) };
    }
    if (url === 'https://oj.example/api/skyline/v1/homeworks/hw-1') {
      return {
        ok: true,
        status: 200,
        json: async () => ({ homework: { id: 'hw-1', title: 'Week 1', problems: [] } }),
      };
    }
    if (url === 'https://oj.example/api/skyline/v1/homeworks/hw-1/leaderboard') {
      return {
        ok: true,
        status: 200,
        json: async () => ({ entries: [{ userId: 7, displayName: 'Student', score: 100, solved: 1 }] }),
      };
    }
    throw new Error(`unexpected URL: ${url}`);
  };
  const client = new OjApiClient({ baseUrl: 'https://oj.example', token: 'token', requester });
  assert.equal((await client.listHomeworks())[0].id, 'hw-1');
  assert.equal((await client.getHomework('hw-1')).title, 'Week 1');
  assert.equal((await client.getHomeworkLeaderboard('hw-1'))[0].score, 100);
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
    user: { id: 8, username: 'student8', displayName: 'Student Eight', role: 'student' },
  });

  const restored = new OjSession(storage);
  await restored.restore();
  assert.equal(restored.getToken(), 'token-3');
  assert.equal(restored.getUser().username, 'student8');

  await restored.clear();
  assert.equal(restored.getToken(), undefined);
  assert.equal(restored.getUser(), undefined);
});

test('SkylineAI problem files are Python 3.13 files with a stable problem marker', () => {
  const output = renderOjPythonFile({
    id: 'hello-world',
    numericId: 12,
    title: 'Hello World',
    statement: 'Print "Hello".\nUse Python.',
    language: 'py3',
  });
  assert.match(output, /@lc app=skyline id=hello-world/);
  assert.match(output, /# Print "Hello"\./);
  assert.match(output, /def solve\(\) -> None:/);
  assert.match(output, /if __name__ == "__main__":/);
});

test('homework problem files preserve homework context for submission', () => {
  const output = renderOjPythonFile({
    id: 'hello-world',
    numericId: 12,
    title: 'Hello World',
    statement: '',
    language: 'py3',
  }, 'week-1');
  assert.deepEqual(parseOjFileMetadata(output), {
    problemId: 'hello-world',
    homeworkId: 'week-1',
  });
});

test('leaderboard rows include rank, score, and solved count', () => {
  assert.deepEqual(formatLeaderboardRows([
    { userId: 7, displayName: 'Student', score: 100, solved: 2 },
  ]), [{
    label: '1. Student',
    description: '100 points',
    detail: '2 solved',
  }]);
});

test('homework tree groups assigned problems under stable homework ids', () => {
  const tree = buildHomeworkTree([{
    id: 'hw-1',
    title: 'Week 1',
    problems: [{
      id: 'hello',
      numericId: 1,
      title: 'Hello',
      statement: '',
      language: 'py3',
    }],
  }]);
  assert.deepEqual(tree, [{
    id: 'Homework.hw-1',
    homeworkId: 'hw-1',
    title: 'Week 1',
    problems: [{
      id: 'hello',
      numericId: 1,
      title: 'Hello',
      statement: '',
      language: 'py3',
    }],
  }]);
});

test('OjApiClient default requester sends login over HTTP', async () => {
  const server = http.createServer((request, response) => {
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => {
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      assert.equal(request.method, 'POST');
      assert.equal(request.url, '/api/skyline/v1/auth/login');
      assert.deepEqual(body, { username: 'network-user', password: 'network-pass' });
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({
        accessToken: 'network-token',
        user: { id: 9, username: 'network-user', displayName: 'Network User', role: 'student' },
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
