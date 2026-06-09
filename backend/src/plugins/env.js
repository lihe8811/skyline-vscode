function loadEnv() {
  return {
    NODE_ENV: process.env.NODE_ENV || 'development',
    HOST: process.env.HOST || '127.0.0.1',
    PORT: Number(process.env.PORT || 3000),
    MONGO_URI: process.env.MONGO_URI || '',
    MONGO_DB: process.env.MONGO_DB || 'oj_app',
    AUTH_TOKEN_SECRET: process.env.AUTH_TOKEN_SECRET || '',
  };
}

module.exports = { loadEnv };
