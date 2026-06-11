const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { loadContent } = require('../content');

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skyline-content-'));
  fs.mkdirSync(path.join(root, 'groups'), { recursive: true });
  fs.mkdirSync(path.join(root, 'problems', 'hello', 'tests'), { recursive: true });
  fs.mkdirSync(path.join(root, 'homeworks'), { recursive: true });
  fs.writeFileSync(path.join(root, 'users.csv'), 'username,email,displayName\nstudent,student@example.com,Student\n');
  fs.writeFileSync(path.join(root, 'groups', 'class-a.yaml'), 'id: class-a\nmembers:\n  - student\n');
  fs.writeFileSync(path.join(root, 'problems', 'hello', 'problem.yaml'), [
    'id: hello',
    'title: Hello',
    'language: py3',
    'timeLimitMs: 1000',
    'memoryLimitMb: 64',
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(root, 'problems', 'hello', 'statement.md'), 'Print hello.\n');
  fs.writeFileSync(path.join(root, 'problems', 'hello', 'tests', '01.in'), '\n');
  fs.writeFileSync(path.join(root, 'problems', 'hello', 'tests', '01.out'), 'hello\n');
  fs.writeFileSync(path.join(root, 'homeworks', 'week-1.yaml'), [
    'id: week-1',
    'title: Week 1',
    'beginAt: 2026-06-01T00:00:00Z',
    'endAt: 2026-06-30T00:00:00Z',
    'groups:',
    '  - class-a',
    'problemIds:',
    '  - hello',
    '',
  ].join('\n'));
  return root;
}

test('loads and validates course content into a revisioned sync manifest', () => {
  const content = loadContent(fixture());
  assert.match(content.revision, /^[a-f0-9]{64}$/);
  assert.equal(content.users[0].id, 'student');
  assert.equal(content.problems[0].tests.length, 2);
  assert.equal(content.homeworks[0].problemIds[0], 'hello');
});

test('rejects homework references to unknown problems', () => {
  const root = fixture();
  fs.appendFileSync(path.join(root, 'homeworks', 'week-1.yaml'), '  - missing\n');
  assert.throws(() => loadContent(root), /unknown problem missing/);
});

test('rejects non-py3 problem configuration', () => {
  const root = fixture();
  const file = path.join(root, 'problems', 'hello', 'problem.yaml');
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('py3', 'cpp'));
  assert.throws(() => loadContent(root), /only py3/);
});
