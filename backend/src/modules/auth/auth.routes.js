const { login } = require('./auth.service');
const { requireRole } = require('./rbac');

function createResponse(statusCode, payload) {
  return {
    statusCode,
    json: () => payload,
  };
}

function registerAuthRoutes(app) {
  app.register('POST', '/v1/auth/login', async ({ body }) => {
    const result = login(body?.username, body?.password);
    if (!result) {
      return createResponse(401, { error: 'Invalid credentials' });
    }

    return createResponse(200, {
      accessToken: result.accessToken,
      refreshToken: `refresh-${result.user.id}`,
      user: result.user,
    });
  });

  app.register('GET', '/v1/admin/metrics', async ({ headers }) => {
    const auth = requireRole(headers, ['teacher', 'admin']);
    if (!auth.ok) {
      return createResponse(auth.statusCode, { error: auth.error });
    }

    return createResponse(200, { submissions: 0, users: 0 });
  });
}

module.exports = { registerAuthRoutes };
