const { parseBearerToken } = require('../../plugins/auth');

function createResponse(statusCode, payload) {
  return {
    statusCode,
    json: () => payload,
  };
}

function registerAuthRoutes(app, { authService }) {
  app.register('POST', '/v1/auth/login', async ({ body }) => {
    const result = await authService.login(body?.username, body?.password);
    if (!result) {
      return createResponse(401, { error: 'Invalid credentials' });
    }

    return createResponse(200, result);
  });

  app.register('GET', '/v1/auth/me', async ({ headers }) => {
    const user = authService.verifyAccessToken(parseBearerToken(headers));
    if (!user) {
      return createResponse(401, { error: 'Unauthorized' });
    }
    return createResponse(200, { user });
  });
}

module.exports = { registerAuthRoutes };
