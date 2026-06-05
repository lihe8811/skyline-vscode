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

  const matchRoute = (method, url) => {
    const exact = routes.get(`${method} ${url}`);
    if (exact) {
      return { handler: exact, params: {} };
    }

    const urlParts = url.split('/').filter(Boolean);
    for (const [key, handler] of routes.entries()) {
      const [routeMethod, routePath] = key.split(' ');
      if (routeMethod !== method) {
        continue;
      }

      const routeParts = routePath.split('/').filter(Boolean);
      if (routeParts.length !== urlParts.length) {
        continue;
      }

      const params = {};
      const matched = routeParts.every((part, index) => {
        if (part.startsWith(':')) {
          params[part.slice(1)] = urlParts[index];
          return true;
        }
        return part === urlParts[index];
      });

      if (matched) {
        return { handler, params };
      }
    }

    return null;
  };

  register('GET', '/health', async () => createResponse(200, { ok: true }));

  return {
    inject: async ({ method, url, body, headers }) => {
      const route = matchRoute(String(method || 'GET').toUpperCase(), url);
      if (!route) {
        return createResponse(404, { error: 'Not Found' });
      }
      return route.handler({ body, headers: headers || {}, params: route.params });
    },
    register,
  };
}

module.exports = { buildApp };
