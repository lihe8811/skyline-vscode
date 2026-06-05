function createSubmissionId() {
  return `sub_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function createSubmissionService({ queue, worker }) {
  const submissions = new Map();

  return {
    async createSubmission(input) {
      const submissionId = createSubmissionId();
      submissions.set(submissionId, {
        submissionId,
        problemId: input.problemId,
        homeworkId: input.homeworkId || null,
        status: 'pending',
        score: 0,
      });

      await queue.enqueue({
        submissionId,
        sourceCode: input.sourceCode,
        testcases: input.testcases || [],
        limits: input.limits || {},
      });

      const result = await worker.runNext();
      if (result) {
        submissions.set(submissionId, {
          ...submissions.get(submissionId),
          ...result,
        });
      }

      return submissions.get(submissionId);
    },

    async getSubmission(submissionId) {
      return submissions.get(submissionId) || null;
    },
  };
}

module.exports = { createSubmissionService };
