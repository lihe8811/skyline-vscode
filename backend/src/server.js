const http = require('node:http');
const { MongoClient } = require('mongodb');
const { buildApp } = require('./app');
const { loadEnv } = require('./plugins/env');
const { createAuthService } = require('./modules/auth/auth.service');
const { registerAuthRoutes } = require('./modules/auth/auth.routes');
const { createUserRepository } = require('./modules/auth/user.repository');

function buildMongoUri(env) {
  if (env.MONGO_URI) {
    return env.MONGO_URI;
  }
  if (!env.MONGO_USERNAME || !env.MONGO_PASSWORD) {
    throw new Error('MONGO_URI or MONGO_USERNAME and MONGO_PASSWORD are required');
  }

  const username = encodeURIComponent(env.MONGO_USERNAME);
  const password = encodeURIComponent(env.MONGO_PASSWORD);
  const authSource = encodeURIComponent(env.MONGO_AUTH_SOURCE || env.MONGO_DB);
  return `mongodb://${username}:${password}@${env.MONGO_HOST}:${env.MONGO_SERVICE_PORT}/${env.MONGO_DB}?authSource=${authSource}`;
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => {
      if (chunks.length === 0) {
        resolve(undefined);
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (error) {
        reject(error);
      }
    });
    request.on('error', reject);
  });
}

function createHttpServer(app) {
  return http.createServer(async (request, response) => {
    try {
      const result = await app.inject({
        method: request.method,
        url: new URL(request.url, 'http://localhost').pathname,
        headers: request.headers,
        body: await readJsonBody(request),
      });
      response.writeHead(result.statusCode, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify(result.json()));
    } catch (error) {
      response.writeHead(400, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ error: 'Invalid request' }));
    }
  });
}

async function start(options = {}) {
  const env = { ...loadEnv(), ...options };
  if (!env.AUTH_TOKEN_SECRET) {
    throw new Error('AUTH_TOKEN_SECRET is required');
  }

  const mongoClient = new MongoClient(buildMongoUri(env));
  await mongoClient.connect();
  const userRepository = createUserRepository(mongoClient.db(env.MONGO_DB));
  const authService = createAuthService({
    userRepository,
    tokenSecret: env.AUTH_TOKEN_SECRET,
  });
  const app = await buildApp();
  registerAuthRoutes(app, { authService });

  const server = createHttpServer(app);
  await new Promise((resolve) => server.listen(env.PORT, env.HOST, resolve));
  return { server, mongoClient };
}

if (require.main === module) {
  start()
    .then(({ server }) => {
      const address = server.address();
      process.stdout.write(`SkylineAI OJ backend listening on ${address.address}:${address.port}\n`);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { buildMongoUri, createHttpServer, start };
