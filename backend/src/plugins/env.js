function loadEnv() {
  return {
    NODE_ENV: process.env.NODE_ENV || 'development',
  };
}

module.exports = { loadEnv };
