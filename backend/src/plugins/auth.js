function parseBearerToken(headers) {
  const authorization = headers?.authorization || headers?.Authorization;
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }
  return authorization.slice('Bearer '.length).trim();
}

module.exports = { parseBearerToken };
