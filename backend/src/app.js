function createResponse(statusCode, payload) {
  return {
    statusCode,
    json: () => payload,
  };
}

async function buildApp() {
  const routes = new Map();

  const register = (method, url, handler) => {
    routes.set(`${method.toUpperCase()} ${url}`, handler);
  };

  register('GET', '/health', async () => createResponse(200, { ok: true }));

  return {
    inject: async ({ method, url, body, headers }) => {
      const key = `${String(method || 'GET').toUpperCase()} ${url}`;
      const handler = routes.get(key);
      if (!handler) {
        return createResponse(404, { error: 'Not Found' });
      }
      return handler({ body, headers: headers || {} });
    },
    register,
  };
}

module.exports = { buildApp };
