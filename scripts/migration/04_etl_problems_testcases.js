#!/usr/bin/env node

const { transformProblemsAndTestcases } = require('./etl/problems');

function runEtl(rawData) {
  return transformProblemsAndTestcases(rawData);
}

module.exports = { runEtl };

if (require.main === module) {
  console.error('ETL runner requires Mongo wiring in a later step.');
  process.exit(0);
}
