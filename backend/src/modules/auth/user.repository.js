function createUserRepository(db) {
  return {
    async findByUsername(username) {
      const normalized = String(username || '').trim().toLowerCase();
      if (!normalized) {
        return null;
      }

      return db.collection('users').findOne({
        $or: [
          { usernameLower: normalized },
          { username: normalized },
        ],
      });
    },
  };
}

module.exports = { createUserRepository };
