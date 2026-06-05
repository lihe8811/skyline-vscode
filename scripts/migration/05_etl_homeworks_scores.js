#!/usr/bin/env node

const { transformHomeworksAndScores } = require('./etl/homeworks');

function runEtl(rawData) {
  return transformHomeworksAndScores(rawData);
}

module.exports = { runEtl };

if (require.main === module) {
  console.error('ETL runner requires Mongo wiring in a later step.');
  process.exit(0);
}
