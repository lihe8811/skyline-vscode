#!/usr/bin/env node
const { execSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const { join } = require('node:path');

const root = join(__dirname, '..', '..', '..');
const scriptPath = join(root, 'scripts', 'migration', '02_create_oj_app_indexes.js');

if (!existsSync(scriptPath)) {
  console.error(`missing index script: ${scriptPath}`);
  process.exit(1);
}

const output = execSync(`node ${scriptPath} --dry-run`, { encoding: 'utf8' });
const required = [
  'problems',
  'homeworks',
  'submissions',
  'homework_scores',
  'group_members',
  'title_statement_text',
  'homework_leaderboard',
];

for (const marker of required) {
  if (!output.includes(marker)) {
    console.error(`missing index marker: ${marker}`);
    process.exit(1);
  }
}

console.log('index smoke check passed');
