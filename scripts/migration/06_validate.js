function formatPercent(value) {
  return `${(value * 100).toFixed(2)}%`;
}

function validateCountDelta({ name, rawCount, appCount, maxCountDeltaRatio, errors }) {
  if (!rawCount) {
    return;
  }

  const deltaRatio = Math.abs(rawCount - appCount) / rawCount;
  if (deltaRatio > maxCountDeltaRatio) {
    errors.push(`${name} count delta ${formatPercent(deltaRatio)} exceeds threshold ${formatPercent(maxCountDeltaRatio)}`);
  }
}

function validateMigrationSnapshot({ rawCounts = {}, app, maxCountDeltaRatio = 0.05 }) {
  const errors = [];
  const users = app.users || [];
  const problems = app.problems || [];
  const submissions = app.submissions || [];
  const homeworks = app.homeworks || [];

  validateCountDelta({ name: 'users', rawCount: rawCounts.users, appCount: users.length, maxCountDeltaRatio, errors });
  validateCountDelta({ name: 'problems', rawCount: rawCounts.problems, appCount: problems.length, maxCountDeltaRatio, errors });
  validateCountDelta({ name: 'submissions', rawCount: rawCounts.submissions, appCount: submissions.length, maxCountDeltaRatio, errors });

  const userIds = new Set(users.map((user) => user.userId));
  const problemIds = new Set(problems.map((problem) => problem.problemId));

  for (const submission of submissions) {
    if (!userIds.has(submission.userId)) {
      errors.push(`submission ${submission.submissionId} references missing user ${submission.userId}`);
    }
    if (!problemIds.has(submission.problemId)) {
      errors.push(`submission ${submission.submissionId} references missing problem ${submission.problemId}`);
    }
  }

  for (const homework of homeworks) {
    for (const problemId of homework.problemIds || []) {
      if (!problemIds.has(problemId)) {
        errors.push(`homework ${homework.homeworkId} references missing problem ${problemId}`);
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    counts: {
      users: users.length,
      problems: problems.length,
      submissions: submissions.length,
      homeworks: homeworks.length,
    },
  };
}

module.exports = { validateMigrationSnapshot };

if (require.main === module) {
  console.error('Use validateMigrationSnapshot from tests or wire it to Mongo in the migration runner.');
}
