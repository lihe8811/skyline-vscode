const databaseName = process.env.MONGO_APP_DATABASE || 'oj_app';
const username = process.env.MONGO_APP_USERNAME;
const password = process.env.MONGO_APP_PASSWORD;

if (!username || !password) {
  throw new Error('MONGO_APP_USERNAME and MONGO_APP_PASSWORD are required');
}

const appDb = db.getSiblingDB(databaseName);
appDb.createUser({
  user: username,
  pwd: password,
  roles: [{ role: 'readWrite', db: databaseName }],
});
