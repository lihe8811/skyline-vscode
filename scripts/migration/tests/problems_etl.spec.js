const test = require('node:test');
const assert = require('node:assert/strict');

const { transformProblemsAndTestcases } = require('../etl/problems');

test('transformProblemsAndTestcases maps docType=10 and resolves testcase files from storage path', () => {
  const raw = {
    documents: [
      {
        docType: 10,
        docId: 2,
        title: 'Sum Two Numbers',
        difficulty: 1,
        content: '{"en":"desc"}',
        tag: ['Python 101'],
        config: 'type: default\nsubtasks:\n  - cases:\n      - input: 1.in\n        output: 1.out\n      - input: 2.in\n        output: 2.out\n',
      },
      { docType: 30, docId: 'ignore-me' },
    ],
    storage: [
      { _id: 'aa/1.in', path: 'problem/system/2/testdata/1.in', size: 2 },
      { _id: 'bb/1.out', path: 'problem/system/2/testdata/1.out', size: 1 },
      { _id: 'cc/2.in', path: 'problem/system/2/testdata/2.in', size: 2 },
      { _id: 'dd/2.out', path: 'problem/system/2/testdata/2.out', size: 1 },
    ],
  };

  const out = transformProblemsAndTestcases(raw);
  assert.equal(out.problems.length, 1);
  assert.deepEqual(out.problems[0], {
    problemId: 2,
    title: 'Sum Two Numbers',
    difficulty: 1,
    statement: '{"en":"desc"}',
    tags: ['Python 101'],
  });

  assert.equal(out.problemTestcases.length, 2);
  assert.deepEqual(out.problemTestcases[0], {
    problemId: 2,
    caseNo: 1,
    inputFileId: 'aa/1.in',
    outputFileId: 'bb/1.out',
    isHidden: true,
  });
});
