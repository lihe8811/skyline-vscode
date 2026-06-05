#!/usr/bin/env node
const { argv, env } = process;

const dryRun = argv.includes('--dry-run');

const plan = [
  { collection: 'problems', name: 'problem_id', keys: { problemId: 1 } },
  { collection: 'problems', name: 'tags', keys: { tags: 1 } },
  { collection: 'problems', name: 'difficulty', keys: { difficulty: 1 } },
  { collection: 'problems', name: 'title_statement_text', keys: { title: 'text', statement: 'text' } },
  { collection: 'homeworks', name: 'homework_id', keys: { homeworkId: 1 } },
  { collection: 'homeworks', name: 'due_at', keys: { dueAt: 1 } },
  { collection: 'homeworks', name: 'assigned_groups', keys: { assignedGroupIds: 1 } },
  { collection: 'submissions', name: 'submission_token', keys: { submissionToken: 1 } },
  { collection: 'submissions', name: 'user_recent', keys: { userId: 1, createdAt: -1 } },
  { collection: 'submissions', name: 'homework_problem_user_recent', keys: { homeworkId: 1, problemId: 1, userId: 1, createdAt: -1 } },
  { collection: 'homework_scores', name: 'homework_leaderboard', keys: { homeworkId: 1, totalScore: -1, totalTimeMs: 1 } },
  { collection: 'group_members', name: 'group_user_unique', keys: { groupId: 1, userId: 1 }, options: { unique: true } },
];

if (dryRun) {
  process.stdout.write(JSON.stringify(plan, null, 2));
  process.stdout.write('\n');
  process.exit(0);
}

const mongoUri = env.MONGO_URI;
if (!mongoUri) {
  console.error('MONGO_URI is required for live index creation');
  process.exit(1);
}

console.error('Live mode is not implemented in this minimal step. Use --dry-run for now.');
process.exit(1);
