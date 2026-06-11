#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { SkylineAdminClient } = require('./client');
const { loadContent, validate } = require('./content');

function parseArgs(argv) {
  const [rawCommand, ...rest] = argv;
  const command = ['--help', '-h'].includes(rawCommand) ? 'help' : rawCommand;
  const options = {};
  for (let index = 0; index < rest.length; index++) {
    const value = rest[index];
    if (!value.startsWith('--')) continue;
    const key = value.slice(2);
    if (['dry-run', 'destructive'].includes(key)) options[key] = true;
    else options[key] = rest[++index];
  }
  return { command, options };
}

function writeJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function adminClient(options) {
  const token = process.env.SKYLINE_ADMIN_TOKEN;
  if (!token) throw new Error('SKYLINE_ADMIN_TOKEN is required');
  return new SkylineAdminClient({
    baseUrl: options.url || process.env.SKYLINE_URL || 'https://homework.skyline-ai.space',
    token,
  });
}

function migrateJson(input) {
  const source = JSON.parse(fs.readFileSync(input, 'utf8'));
  const manifest = {
    revision: source.revision || `migrated-${new Date().toISOString()}`,
    users: source.users || [],
    groups: source.groups || [],
    problems: source.problems || [],
    homeworks: source.homeworks || [],
  };
  validate(manifest);
  return manifest;
}

async function run(argv) {
  const { command, options } = parseArgs(argv);
  const contentRoot = path.resolve(options.content || 'content');
  if (command === 'validate') {
    const manifest = loadContent(contentRoot);
    writeJson({ valid: true, revision: manifest.revision });
    return;
  }
  if (command === 'diff') {
    writeJson(await adminClient(options).plan(loadContent(contentRoot), {
      destructive: options.destructive,
    }));
    return;
  }
  if (command === 'sync') {
    writeJson(await adminClient(options).sync(loadContent(contentRoot), {
      dryRun: options['dry-run'],
      destructive: options.destructive,
    }));
    return;
  }
  if (command === 'export') {
    const manifest = loadContent(contentRoot);
    if (options.output) fs.writeFileSync(path.resolve(options.output), `${JSON.stringify(manifest, null, 2)}\n`);
    else writeJson(manifest);
    return;
  }
  if (command === 'migrate') {
    if (!options.input) throw new Error('migrate requires --input <json>');
    const manifest = migrateJson(path.resolve(options.input));
    if (options.output) fs.writeFileSync(path.resolve(options.output), `${JSON.stringify(manifest, null, 2)}\n`);
    else writeJson(manifest);
    return;
  }
  process.stdout.write([
    'Usage: skyline <command> [options]',
    '',
    'Commands:',
    '  validate --content <dir>',
    '  diff --content <dir> [--url <origin>] [--destructive]',
    '  sync --content <dir> [--url <origin>] [--dry-run] [--destructive]',
    '  export --content <dir> [--output <file>]',
    '  migrate --input <json> [--output <file>]',
    '',
  ].join('\n'));
  if (command && command !== 'help') process.exitCode = 1;
}

if (require.main === module) {
  run(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { migrateJson, parseArgs, run };
