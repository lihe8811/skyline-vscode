const test = require('node:test');
const assert = require('node:assert/strict');

const { createReadModelRepository } = require('../src/modules/readmodel/repository');
const { createProblemsService } = require('../src/modules/problems/problems.service');
const { createHomeworksService } = require('../src/modules/homeworks/homeworks.service');
const { createLeaderboardService } = require('../src/modules/leaderboard/leaderboard.service');

function buildMemoryDb(seed) {
  return {
    collection(name) {
      const rows = seed[name] || [];
      return {
        find(query = {}) {
          const filtered = rows.filter((row) => Object.entries(query).every(([k, v]) => row[k] === v));
          return {
            sort(sorter = {}) {
              const keys = Object.keys(sorter);
              filtered.sort((a, b) => {
                for (const key of keys) {
                  const direction = sorter[key];
                  if (a[key] === b[key]) continue;
                  return direction >= 0 ? (a[key] > b[key] ? 1 : -1) : (a[key] > b[key] ? -1 : 1);
                }
                return 0;
              });
              return {
                toArray: async () => filtered,
              };
            },
            toArray: async () => filtered,
          };
        },
        findOne(query = {}) {
          return Promise.resolve(rows.find((row) => Object.entries(query).every(([k, v]) => row[k] === v)) || null);
        },
      };
    },
  };
}

test('read-model services return expected data from oj_app collections', async () => {
  const db = buildMemoryDb({
    problems: [{ problemId: 2, title: 'Sum', difficulty: 1, tags: ['Python'] }],
    homeworks: [{ homeworkId: 'hw1', title: 'Loop', problemIds: [2], dueAt: 2000 }],
    homework_scores: [
      { homeworkId: 'hw1', userId: 9, totalScore: 150, totalTimeMs: 4000 },
      { homeworkId: 'hw1', userId: 10, totalScore: 120, totalTimeMs: 1000 },
    ],
  });

  const repository = createReadModelRepository(db);
  const problemsService = createProblemsService(repository);
  const homeworksService = createHomeworksService(repository);
  const leaderboardService = createLeaderboardService(repository);

  const problems = await problemsService.listProblems();
  assert.equal(problems.length, 1);
  assert.equal(problems[0].problemId, 2);

  const homeworks = await homeworksService.listHomeworks();
  assert.equal(homeworks.length, 1);
  assert.equal(homeworks[0].homeworkId, 'hw1');

  const leaderboard = await leaderboardService.getLeaderboard('hw1');
  assert.deepEqual(leaderboard.map((row) => row.userId), [9, 10]);
});
