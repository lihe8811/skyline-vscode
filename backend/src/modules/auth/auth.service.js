const crypto = require('node:crypto');
const { promisify } = require('node:util');

const scrypt = promisify(crypto.scrypt);
const PASSWORD_PREFIX = 'scrypt';

function encodeJson(value) {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

async function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const derivedKey = await scrypt(String(password), salt, 64);
  return `${PASSWORD_PREFIX}$${salt}$${Buffer.from(derivedKey).toString('hex')}`;
}

async function verifyPassword(password, passwordHash) {
  const [algorithm, salt, expectedHex] = String(passwordHash || '').split('$');
  if (algorithm !== PASSWORD_PREFIX || !salt || !expectedHex) {
    return false;
  }

  const actual = Buffer.from(await scrypt(String(password), salt, 64));
  const expected = Buffer.from(expectedHex, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function signToken(payload, secret) {
  const header = encodeJson({ alg: 'HS256', typ: 'JWT' });
  const body = encodeJson(payload);
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token, secret) {
  const [header, body, signature] = String(token || '').split('.');
  if (!header || !body || !signature) {
    return null;
  }

  const expected = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest();
  const actual = Buffer.from(signature, 'base64url');
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch (_) {
    return null;
  }
}

function publicUser(user) {
  return {
    userId: user.userId ?? user.id,
    username: user.username,
    displayName: user.displayName || user.username,
    role: user.role || 'student',
  };
}

function createAuthService({ userRepository, tokenSecret, tokenTtlSeconds = 3600 }) {
  if (!userRepository) {
    throw new Error('userRepository is required');
  }
  if (!tokenSecret) {
    throw new Error('tokenSecret is required');
  }

  return {
    async login(username, password) {
      if (!username || !password) {
        return null;
      }

      const user = await userRepository.findByUsername(username);
      if (!user || !(await verifyPassword(password, user.passwordHash))) {
        return null;
      }

      const safeUser = publicUser(user);
      const now = Math.floor(Date.now() / 1000);
      return {
        accessToken: signToken({ ...safeUser, iat: now, exp: now + tokenTtlSeconds }, tokenSecret),
        user: safeUser,
      };
    },

    verifyAccessToken(token) {
      const payload = verifyToken(token, tokenSecret);
      return payload ? publicUser(payload) : null;
    },
  };
}

module.exports = {
  createAuthService,
  hashPassword,
  verifyPassword,
};
