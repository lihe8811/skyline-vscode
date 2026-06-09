# oj_app Collections

Collections created/managed by migration and backend read model:

- `users`
- `groups`
- `group_members`
- `problems`
- `problem_testcases`
- `homeworks`
- `homework_assignments`
- `submissions`
- `homework_scores`
- `homework_problem_scores`

The `users` collection includes `username`, `usernameLower`, `displayName`,
`role`, and `passwordHash`. Migrated users require a password to be initialized
with `MONGO_URI=... USER_PASSWORD=... npm run set-password -- <username>` from
the `backend/` directory before username/password login.

Index creation is defined in:
- `scripts/migration/02_create_oj_app_indexes.js`
