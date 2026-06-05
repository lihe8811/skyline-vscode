function createDb() {
  return {
    query: async () => {
      throw new Error('Database not connected');
    },
  };
}

module.exports = { createDb };
