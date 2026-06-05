const USERS = [
  { id: 1, username: 'teacher1', password: 'teacher-pass', role: 'teacher' },
  { id: 2, username: 'student1', password: 'student-pass', role: 'student' },
];

function encodeToken(payload) {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decodeToken(token) {
  try {
    const json = Buffer.from(token, 'base64url').toString('utf8');
    return JSON.parse(json);
  } catch (_) {
    return null;
  }
}

function login(username, password) {
  const user = USERS.find((candidate) => candidate.username === username && candidate.password === password);
  if (!user) {
    return null;
  }

  const safeUser = { id: user.id, username: user.username, role: user.role };
  return {
    accessToken: encodeToken(safeUser),
    user: safeUser,
  };
}

module.exports = { login, decodeToken };
