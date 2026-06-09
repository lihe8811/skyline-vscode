const test = require('node:test');
const assert = require('node:assert/strict');

const { createJudgeQueue } = require('../src/modules/judge/queue');
const { createJudgeWorker } = require('../src/modules/judge/worker');
const { mapSandboxResult } = require('../src/modules/judge/result_mapper');
const { buildDockerSandboxCommand } = require('../src/modules/judge/sandbox_runner');

test('judge worker executes queued Python job and returns accepted result', async () => {
  const queue = createJudgeQueue();
  const executed = [];
  const sandboxRunner = {
    async run({ sourceCode, stdin }) {
      executed.push({ sourceCode, stdin });
      return { exitCode: 0, stdout: '3\n', stderr: '', timeMs: 17, memoryKb: 1024 };
    },
  };

  const worker = createJudgeWorker({ queue, sandboxRunner });
  const job = await queue.enqueue({
    submissionId: 'sub-1',
    sourceCode: 'print(sum(map(int, input().split())))',
    testcases: [{ input: '1 2\n', expectedOutput: '3\n' }],
    limits: { timeMs: 1000, memoryMb: 64 },
  });

  const result = await worker.runNext();

  assert.equal(job.submissionId, 'sub-1');
  assert.equal(executed.length, 1);
  assert.equal(executed[0].stdin, '1 2\n');
  assert.deepEqual(result, {
    submissionId: 'sub-1',
    status: 'accepted',
    score: 100,
    totalTimeMs: 17,
    maxMemoryKb: 1024,
    cases: [{ caseNo: 1, status: 'accepted', timeMs: 17, memoryKb: 1024 }],
  });
});

test('result mapper reports wrong answer when output differs', () => {
  const result = mapSandboxResult({
    caseNo: 1,
    sandboxResult: { exitCode: 0, stdout: '4\n', stderr: '', timeMs: 10, memoryKb: 512 },
    expectedOutput: '3\n',
  });

  assert.deepEqual(result, { caseNo: 1, status: 'wrong_answer', timeMs: 10, memoryKb: 512 });
});

test('docker sandbox command disables network and constrains Python 3.13 execution', () => {
  const command = buildDockerSandboxCommand({
    workDir: '/tmp/oj/sub-1',
    timeMs: 1000,
    memoryMb: 64,
  });

  assert.equal(command.command, 'docker');
  assert.ok(command.args.includes('--network=none'));
  assert.ok(command.args.includes('--memory=64m'));
  assert.ok(command.args.includes('python:3.13'));
});
