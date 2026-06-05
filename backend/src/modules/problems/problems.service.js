function createProblemsService(repository) {
  return {
    async listProblems(filter = {}) {
      return repository.listProblems(filter);
    },
  };
}

module.exports = { createProblemsService };
