# Custom OJ Rollback Runbook

## Rollback Triggers

- Migration validation fails after cutover.
- Backend submission flow fails for students.
- Leaderboard values differ from expected migrated scores.
- Extension cannot list or open assigned problems.

## Steps

1. Switch extension/backend config back to the previous endpoint.
2. Stop judge workers to prevent new custom OJ submissions.
3. Preserve `hydro_raw`, `oj_app`, backend logs, and validation reports.
4. Record failing request IDs and affected users.
5. Re-run validation after fixing ETL or backend defects.

## Recovery

Do not delete the migrated MongoDB databases until a replacement migration has passed validation and extension smoke checks.
