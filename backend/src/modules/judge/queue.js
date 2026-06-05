function createJudgeQueue() {
  const jobs = [];

  return {
    async enqueue(job) {
      jobs.push(job);
      return job;
    },
    async dequeue() {
      return jobs.shift() || null;
    },
    size() {
      return jobs.length;
    },
  };
}

module.exports = { createJudgeQueue };
