const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildMongoUri } = require('../src/server');

const root = path.resolve(__dirname, '..', '..');

test('compose stack configures authenticated persistent MongoDB and backend health checks', () => {
  const compose = fs.readFileSync(path.join(root, 'compose.yaml'), 'utf8');

  assert.match(compose, /mongo:7\.0/);
  assert.match(compose, /MONGO_INITDB_ROOT_USERNAME/);
  assert.match(compose, /MONGO_INITDB_ROOT_PASSWORD/);
  assert.match(compose, /mongo_data:\/data\/db/);
  assert.match(compose, /01-create-app-user\.js/);
  assert.match(compose, /condition: service_healthy/);
  assert.match(compose, /127\.0\.0\.1:\$\{MONGO_PORT:-27017\}:27017/);
  assert.match(compose, /127\.0\.0\.1:\$\{BACKEND_PORT:-3000\}:3000/);
  assert.match(compose, /MONGO_USERNAME: \$\{MONGO_APP_USERNAME:\?/);
  assert.match(compose, /AUTH_TOKEN_SECRET: \$\{AUTH_TOKEN_SECRET:\?/);
});

test('backend container runs as a non-root user and exposes a health check', () => {
  const dockerfile = fs.readFileSync(path.join(root, 'backend', 'Dockerfile'), 'utf8');
  const compose = fs.readFileSync(path.join(root, 'compose.yaml'), 'utf8');

  assert.match(dockerfile, /USER node/);
  assert.match(dockerfile, /npm ci --omit=dev/);
  assert.match(compose, /http:\/\/127\.0\.0\.1:3000\/health/);
});

test('environment template contains required local deployment settings without real secrets', () => {
  const template = fs.readFileSync(path.join(root, '.env.example'), 'utf8');

  assert.match(template, /MONGO_ROOT_USERNAME=/);
  assert.match(template, /MONGO_ROOT_PASSWORD=/);
  assert.match(template, /MONGO_APP_USERNAME=/);
  assert.match(template, /MONGO_APP_PASSWORD=/);
  assert.match(template, /AUTH_TOKEN_SECRET=/);
  assert.doesNotMatch(template, /teacher-pass|student-pass/);
});

test('backend safely encodes MongoDB application credentials', () => {
  const uri = buildMongoUri({
    MONGO_URI: '',
    MONGO_USERNAME: 'app user',
    MONGO_PASSWORD: 'p@ss/word',
    MONGO_HOST: 'mongodb',
    MONGO_SERVICE_PORT: 27017,
    MONGO_DB: 'oj_app',
    MONGO_AUTH_SOURCE: 'oj_app',
  });

  assert.equal(
    uri,
    'mongodb://app%20user:p%40ss%2Fword@mongodb:27017/oj_app?authSource=oj_app',
  );
});

test('password utility reuses backend MongoDB connection configuration', () => {
  const script = fs.readFileSync(path.join(root, 'backend', 'scripts', 'set-user-password.js'), 'utf8');

  assert.match(script, /loadEnv/);
  assert.match(script, /buildMongoUri/);
  assert.match(script, /USER_PASSWORD/);
});
