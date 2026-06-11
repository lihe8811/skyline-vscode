const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

function filesUnder(root) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(root, entry.name);
    return entry.isDirectory() ? filesUnder(file) : [file];
  }).sort();
}

function parseCsvLine(line) {
  const values = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index++) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index++;
      } else quoted = !quoted;
    } else if (character === ',' && !quoted) {
      values.push(value);
      value = '';
    } else value += character;
  }
  values.push(value);
  return values;
}

function readUsers(filename) {
  if (!fs.existsSync(filename)) return [];
  const lines = fs.readFileSync(filename, 'utf8').replace(/\r/g, '').split('\n').filter(Boolean);
  if (!lines.length) return [];
  const headers = parseCsvLine(lines.shift());
  return lines.map((line) => {
    const values = parseCsvLine(line);
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
    if (!row.username) throw new Error('users.csv contains an empty username');
    return {
      id: row.username,
      email: row.email || undefined,
      displayName: row.displayName || row.username,
    };
  });
}

function readYamlFiles(directory) {
  return filesUnder(directory)
    .filter((file) => /\.ya?ml$/i.test(file))
    .map((file) => yaml.load(fs.readFileSync(file, 'utf8')));
}

function readProblems(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((entry) => {
      const root = path.join(directory, entry.name);
      const metadataFile = path.join(root, 'problem.yaml');
      if (!fs.existsSync(metadataFile)) throw new Error(`problem ${entry.name} is missing problem.yaml`);
      const metadata = yaml.load(fs.readFileSync(metadataFile, 'utf8')) || {};
      const statementFile = path.join(root, 'statement.md');
      const testsDirectory = path.join(root, 'tests');
      return {
        ...metadata,
        id: metadata.id || entry.name,
        statement: fs.existsSync(statementFile) ? fs.readFileSync(statementFile, 'utf8') : '',
        tests: filesUnder(testsDirectory).map((file) => ({
          name: path.basename(file),
          contentBase64: fs.readFileSync(file).toString('base64'),
        })),
      };
    });
}

function assertUnique(items, resource) {
  const ids = new Set();
  for (const item of items) {
    if (!item.id) throw new Error(`${resource} contains an empty id`);
    if (ids.has(item.id)) throw new Error(`duplicate ${resource} id ${item.id}`);
    ids.add(item.id);
  }
  return ids;
}

function validate(manifest) {
  const users = assertUnique(manifest.users, 'user');
  const groups = assertUnique(manifest.groups, 'group');
  const problems = assertUnique(manifest.problems, 'problem');
  assertUnique(manifest.homeworks, 'homework');
  for (const group of manifest.groups) {
    for (const username of group.members || []) {
      if (!users.has(username)) throw new Error(`group ${group.id} references unknown user ${username}`);
    }
  }
  for (const problem of manifest.problems) {
    if (problem.language && problem.language !== 'py3') {
      throw new Error(`problem ${problem.id}: SkylineAI supports only py3`);
    }
    const testNames = new Set(problem.tests.map((test) => test.name));
    for (const name of testNames) {
      if (name.endsWith('.in') && !testNames.has(name.replace(/\.in$/, '.out'))) {
        throw new Error(`problem ${problem.id} is missing output pair for ${name}`);
      }
      if (name.endsWith('.out') && !testNames.has(name.replace(/\.out$/, '.in'))) {
        throw new Error(`problem ${problem.id} is missing input pair for ${name}`);
      }
    }
  }
  for (const homework of manifest.homeworks) {
    for (const problemId of homework.problemIds || []) {
      if (!problems.has(problemId)) throw new Error(`homework ${homework.id} references unknown problem ${problemId}`);
    }
    for (const groupId of homework.groups || []) {
      if (!groups.has(groupId)) throw new Error(`homework ${homework.id} references unknown group ${groupId}`);
    }
    if (new Date(homework.beginAt) >= new Date(homework.endAt)) {
      throw new Error(`homework ${homework.id} must end after it begins`);
    }
  }
}

function revision(root) {
  const hash = crypto.createHash('sha256');
  for (const file of filesUnder(root)) {
    hash.update(path.relative(root, file));
    hash.update('\0');
    hash.update(fs.readFileSync(file));
    hash.update('\0');
  }
  return hash.digest('hex');
}

function loadContent(root) {
  const manifest = {
    revision: revision(root),
    users: readUsers(path.join(root, 'users.csv')),
    groups: readYamlFiles(path.join(root, 'groups')),
    problems: readProblems(path.join(root, 'problems')),
    homeworks: readYamlFiles(path.join(root, 'homeworks')),
  };
  validate(manifest);
  return manifest;
}

module.exports = { loadContent, validate };
