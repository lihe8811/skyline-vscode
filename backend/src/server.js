const { buildApp } = require('./app');

async function start() {
  const app = await buildApp();
  return app;
}

module.exports = { start };
