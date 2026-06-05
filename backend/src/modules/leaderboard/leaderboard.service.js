function createLeaderboardService(repository) {
  return {
    async getLeaderboard(homeworkId) {
      return repository.listHomeworkScores(homeworkId);
    },
  };
}

module.exports = { createLeaderboardService };
