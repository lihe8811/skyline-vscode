const test = require('node:test');
const assert = require('node:assert/strict');

const { validateMigrationSnapshot } = require('../06_validate');

test('validateMigrationSnapshot fails on orphan submissions and large count deltas', () => {
  const report = validateMigrationSnapshot({
    rawCounts: { users: 10, problems: 10, submissions: 10 },
    app: {
      users: [{ userId: 1 }],
      problems: [{ problemId: 2 }],
      submissions: [
        { submissionId: 'sub-1', userId: 999, problemId: 2 },
        { submissionId: 'sub-2', userId: 1, problemId: 888 },
      ],
      homeworks: [{ homeworkId: 'hw1', problemIds: [2, 888] }],
    },
    maxCountDeltaRatio: 0.2,
  });

  assert.equal(report.ok, false);
  assert.deepEqual(report.errors, [
    'users count delta 90.00% exceeds threshold 20.00%',
    'problems count delta 90.00% exceeds threshold 20.00%',
    'submissions count delta 80.00% exceeds threshold 20.00%',
    'submission sub-1 references missing user 999',
    'submission sub-2 references missing problem 888',
    'homework hw1 references missing problem 888',
  ]);
});

test('validateMigrationSnapshot passes when counts and references are consistent', () => {
  const report = validateMigrationSnapshot({
    rawCounts: { users: 1, problems: 1, submissions: 1 },
    app: {
      users: [{ userId: 1 }],
      problems: [{ problemId: 2 }],
      submissions: [{ submissionId: 'sub-1', userId: 1, problemId: 2 }],
      homeworks: [{ homeworkId: 'hw1', problemIds: [2] }],
    },
  });

  assert.equal(report.ok, true);
  assert.deepEqual(report.errors, []);
});
