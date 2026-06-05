const { mapSandboxResult } = require('./result_mapper');

function summarizeCases(submissionId, cases) {
  const accepted = cases.filter((item) => item.status === 'accepted').length;
  const score = cases.length === 0 ? 0 : Math.floor((accepted / cases.length) * 100);
  const terminal = cases.find((item) => item.status !== 'accepted');

  return {
    submissionId,
    status: terminal ? terminal.status : 'accepted',
    score,
    totalTimeMs: cases.reduce((sum, item) => sum + item.timeMs, 0),
    maxMemoryKb: cases.reduce((max, item) => Math.max(max, item.memoryKb), 0),
    cases,
  };
}

function createJudgeWorker({ queue, sandboxRunner }) {
  return {
    async runNext() {
      const job = await queue.dequeue();
      if (!job) {
        return null;
      }

      const cases = [];
      for (let i = 0; i < job.testcases.length; i += 1) {
        const testcase = job.testcases[i];
        const sandboxResult = await sandboxRunner.run({
          sourceCode: job.sourceCode,
          stdin: testcase.input,
          limits: job.limits,
        });
        cases.push(mapSandboxResult({
          caseNo: i + 1,
          sandboxResult,
          expectedOutput: testcase.expectedOutput,
        }));
      }

      return summarizeCases(job.submissionId, cases);
    },
  };
}

module.exports = { createJudgeWorker };
