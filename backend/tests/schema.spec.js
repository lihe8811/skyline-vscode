const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const schemaPath = new URL('../prisma/schema.prisma', `file://${__filename}`).pathname;
const migrationPath = new URL('../prisma/migrations/202602091900_init/migration.sql', `file://${__filename}`).pathname;

test('schema defines core OJ models', () => {
  const schema = fs.readFileSync(schemaPath, 'utf8');
  const expectedModels = [
    'model User',
    'model Group',
    'model GroupMember',
    'model Problem',
    'model ProblemTestcase',
    'model Homework',
    'model HomeworkAssignment',
    'model Submission',
    'model HomeworkScore',
    'model HomeworkProblemScore',
  ];

  for (const model of expectedModels) {
    assert.equal(schema.includes(model), true, `missing ${model}`);
  }
});

test('migration creates core tables', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');
  const expectedTables = [
    'users',
    'groups',
    'group_members',
    'problems',
    'problem_testcases',
    'homeworks',
    'homework_assignments',
    'submissions',
    'homework_scores',
    'homework_problem_scores',
  ];

  for (const table of expectedTables) {
    assert.equal(sql.includes(`CREATE TABLE ${table}`), true, `missing table ${table}`);
  }
});
