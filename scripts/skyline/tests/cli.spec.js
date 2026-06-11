const assert = require('node:assert/strict');
const test = require('node:test');
const { parseArgs } = require('../cli');

test('normalizes help flags to the help command', () => {
  assert.deepEqual(parseArgs(['--help']), { command: 'help', options: {} });
  assert.deepEqual(parseArgs(['-h']), { command: 'help', options: {} });
});
