#!/usr/bin/env node

const { transformUsersAndGroups } = require('./etl/users_groups');

function runEtl(rawData) {
  return transformUsersAndGroups(rawData);
}

module.exports = { runEtl };

if (require.main === module) {
  console.error('ETL runner requires integration with Mongo client in next step.');
  process.exit(0);
}
