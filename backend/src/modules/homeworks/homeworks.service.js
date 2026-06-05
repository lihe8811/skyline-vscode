function createHomeworksService(repository) {
  return {
    async listHomeworks(filter = {}) {
      return repository.listHomeworks(filter);
    },
  };
}

module.exports = { createHomeworksService };
