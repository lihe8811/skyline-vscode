function createReadModelRepository(db) {
  return {
    async listProblems(filter = {}) {
      return db.collection('problems').find(filter).toArray();
    },
    async listHomeworks(filter = {}) {
      return db.collection('homeworks').find(filter).toArray();
    },
    async listHomeworkScores(homeworkId) {
      return db.collection('homework_scores').find({ homeworkId }).sort({ totalScore: -1, totalTimeMs: 1 }).toArray();
    },
  };
}

module.exports = { createReadModelRepository };
