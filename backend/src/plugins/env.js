function loadEnv() {
  return {
    NODE_ENV: process.env.NODE_ENV || 'development',
    HOST: process.env.HOST || '127.0.0.1',
    PORT: Number(process.env.PORT || 3000),
    MONGO_URI: process.env.MONGO_URI || '',
    MONGO_HOST: process.env.MONGO_HOST || '127.0.0.1',
    MONGO_SERVICE_PORT: Number(process.env.MONGO_SERVICE_PORT || 27017),
    MONGO_DB: process.env.MONGO_DB || 'oj_app',
    MONGO_AUTH_SOURCE: process.env.MONGO_AUTH_SOURCE || process.env.MONGO_DB || 'oj_app',
    MONGO_USERNAME: process.env.MONGO_USERNAME || '',
    MONGO_PASSWORD: process.env.MONGO_PASSWORD || '',
    AUTH_TOKEN_SECRET: process.env.AUTH_TOKEN_SECRET || '',
  };
}

module.exports = { loadEnv };
