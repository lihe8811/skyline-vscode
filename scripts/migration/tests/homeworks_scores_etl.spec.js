const test = require('node:test');
const assert = require('node:assert/strict');

const { transformHomeworksAndScores } = require('../etl/homeworks');

test('transformHomeworksAndScores maps homework docs and expands leaderboard detail', () => {
  const raw = {
    documents: [
      {
        docType: 30,
        docId: 'hw1',
        title: 'Loop Homework',
        pids: [2, 3],
        assign: ['g1', 'u9'],
        beginAt: 1000,
        endAt: 2000,
      },
    ],
    documentStatus: [
      {
        docType: 30,
        docId: 'hw1',
        uid: 9,
        score: 150,
        time: 3456,
        detail: {
          '2': { pid: 2, score: 100, time: 1000, rid: 'r1', status: 1 },
          '3': { pid: 3, score: 50, time: 2456, rid: 'r2', status: 2 },
        },
      },
    ],
  };

  const out = transformHomeworksAndScores(raw);

  assert.deepEqual(out.homeworks[0], {
    homeworkId: 'hw1',
    title: 'Loop Homework',
    problemIds: [2, 3],
    startAt: 1000,
    dueAt: 2000,
  });

  assert.deepEqual(out.homeworkAssignments, [
    { homeworkId: 'hw1', assigneeType: 'group', assigneeId: 'g1' },
    { homeworkId: 'hw1', assigneeType: 'user', assigneeId: 'u9' },
  ]);

  assert.deepEqual(out.homeworkScores, [
    { homeworkId: 'hw1', userId: 9, totalScore: 150, totalTimeMs: 3456 },
  ]);

  assert.equal(out.homeworkProblemScores.length, 2);
  assert.deepEqual(out.homeworkProblemScores[0], {
    homeworkId: 'hw1',
    userId: 9,
    problemId: 2,
    score: 100,
    timeMs: 1000,
    rid: 'r1',
    status: 1,
  });
});
