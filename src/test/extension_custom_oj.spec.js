const test = require('node:test');
const assert = require('node:assert/strict');

const { OjApiClient } = require('../../out/src/api/ojApiClient');

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
