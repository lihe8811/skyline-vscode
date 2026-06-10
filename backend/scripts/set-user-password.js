#!/usr/bin/env node
const { MongoClient } = require('mongodb');
const { hashPassword } = require('../src/modules/auth/auth.service');
const { loadEnv } = require('../src/plugins/env');
const { buildMongoUri } = require('../src/server');

async function main() {
  const [username] = process.argv.slice(2);
  const password = process.env.USER_PASSWORD;
  const env = loadEnv();
  if (!username || !password) {
    throw new Error('Usage: USER_PASSWORD=... node scripts/set-user-password.js <username>');
  }

  const client = new MongoClient(buildMongoUri(env));
  await client.connect();
  try {
    const usernameLower = username.trim().toLowerCase();
    const result = await client.db(env.MONGO_DB).collection('users').updateOne(
      { $or: [{ usernameLower }, { username }] },
      {
        $set: {
          usernameLower,
          passwordHash: await hashPassword(password),
          updatedAt: new Date(),
        },
      },
    );
    if (result.matchedCount !== 1) {
      throw new Error(`User not found: ${username}`);
    }
    process.stdout.write(`Password updated for ${username}\n`);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
