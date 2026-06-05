const test = require('node:test');
const assert = require('node:assert/strict');

const { buildApp } = require('../src/app');
const { createJudgeQueue } = require('../src/modules/judge/queue');
const { createJudgeWorker } = require('../src/modules/judge/worker');
const { createSubmissionService } = require('../src/modules/submissions/submission.service');
const { registerSubmissionRoutes } = require('../src/modules/submissions/submission.routes');

test('submission API enqueues Python run and returns stored terminal result', async () => {
  const app = await buildApp();
  const queue = createJudgeQueue();
  const sandboxRunner = {
    async run() {
      return { exitCode: 0, stdout: '3\n', stderr: '', timeMs: 12, memoryKb: 768 };
    },
  };
  const worker = createJudgeWorker({ queue, sandboxRunner });
  const service = createSubmissionService({ queue, worker });
  registerSubmissionRoutes(app, { submissionService: service });

  const created = await app.inject({
    method: 'POST',
    url: '/v1/submissions',
    body: {
      sourceCode: 'print(1 + 2)',
      problemId: 2,
      homeworkId: 'hw1',
      testcases: [{ input: '', expectedOutput: '3\n' }],
      limits: { timeMs: 1000, memoryMb: 64 },
    },
  });

  assert.equal(created.statusCode, 202);
  const createdBody = created.json();
  assert.equal(createdBody.status, 'pending');
  assert.equal(typeof createdBody.submissionId, 'string');

  const result = await app.inject({
    method: 'GET',
    url: `/v1/submissions/${createdBody.submissionId}`,
  });

  assert.equal(result.statusCode, 200);
  assert.equal(result.json().status, 'accepted');
  assert.equal(result.json().score, 100);
});
