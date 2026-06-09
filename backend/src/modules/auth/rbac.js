const { parseBearerToken } = require('../../plugins/auth');

function getUserFromHeaders(headers, authService) {
  const token = parseBearerToken(headers || {});
  if (!token) {
    return null;
  }
  return authService.verifyAccessToken(token);
}

function requireRole(headers, roles, authService) {
  const user = getUserFromHeaders(headers, authService);
  if (!user) {
    return { ok: false, statusCode: 401, error: 'Unauthorized' };
  }
  if (!roles.includes(user.role)) {
    return { ok: false, statusCode: 403, error: 'Forbidden' };
  }
  return { ok: true, user };
}

module.exports = { getUserFromHeaders, requireRole };
