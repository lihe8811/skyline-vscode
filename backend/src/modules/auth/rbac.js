const { parseBearerToken } = require('../../plugins/auth');
const { decodeToken } = require('./auth.service');

function getUserFromHeaders(headers) {
  const token = parseBearerToken(headers || {});
  if (!token) {
    return null;
  }
  return decodeToken(token);
}

function requireRole(headers, roles) {
  const user = getUserFromHeaders(headers);
  if (!user) {
    return { ok: false, statusCode: 401, error: 'Unauthorized' };
  }
  if (!roles.includes(user.role)) {
    return { ok: false, statusCode: 403, error: 'Forbidden' };
  }
  return { ok: true, user };
}

module.exports = { getUserFromHeaders, requireRole };
