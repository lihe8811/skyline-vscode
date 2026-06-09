# OJ Backend REST API + VS Code Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a new RESTful OJ backend for Python classes and refactor the VS Code extension to use it, with Judge0-compatible submission APIs and migrated Hydro backup data.

**Architecture:** Introduce a backend service as the single source of truth for auth, RBAC, homework assignment, leaderboard, and submission records. The backend exposes resource-oriented REST APIs (`/problems`, `/homeworks`, `/groups`, `/users`, etc.) and a Judge0-compatible facade for `/submissions`. The extension only calls backend APIs; backend internally dispatches to self-hosted Judge0 and updates leaderboard/materialized views.

**Tech Stack:** TypeScript, Fastify, Zod, PostgreSQL, Prisma, Redis (submission polling cache/queue), Vitest + Supertest, VS Code extension (existing TypeScript codebase).

## Data Model (derived from backup)

Hydro backup mapping used for migration:
- `document.docType=10` -> `problems`
- `document.docType=30` with `rule=homework` -> `homeworks`
- `document.status.docType=30` -> `homework_scores` and `homework_problem_scores`
- `record` -> `submissions`
- `user` -> `users`
- `domain.user` -> `user_roles`
- `user.group` -> `groups` + `group_members`
- `storage` + `backup/file/hydro/*` -> `testcase_files` (resolved by storage path)

## API Surface (final contract)

### Auth
- `POST /v1/auth/login`
  - Req: `{ "username": "...", "password": "..." }`
  - Resp: `{ "accessToken": "jwt", "refreshToken": "jwt", "user": { ... } }`
- `POST /v1/auth/refresh`
- `POST /v1/auth/logout`
- `GET /v1/auth/me`

Note: Auth0 can replace local login later. Keep token verification behind an interface.

### Users and Groups
- `GET /v1/users?role=student&groupId=...&q=...`
- `GET /v1/users/:userId`
- `POST /v1/users` (teacher/admin)
- `PATCH /v1/users/:userId`
- `GET /v1/groups`
- `POST /v1/groups`
- `GET /v1/groups/:groupId`
- `PATCH /v1/groups/:groupId`
- `DELETE /v1/groups/:groupId`
- `POST /v1/groups/:groupId/members`
  - Req: `{ "userIds": [4,5,6] }`
- `DELETE /v1/groups/:groupId/members/:userId`

### Problems and Testcases
- `GET /v1/problems?tag=...&difficulty=...&q=...&assignedOnly=true`
- `POST /v1/problems`
- `GET /v1/problems/:problemId`
- `PATCH /v1/problems/:problemId`
- `DELETE /v1/problems/:problemId`
- `GET /v1/problems/:problemId/testcases` (teacher/admin; metadata only)
- `POST /v1/problems/:problemId/testcases` (teacher/admin)
- `PATCH /v1/problems/:problemId/testcases/:caseId`
- `DELETE /v1/problems/:problemId/testcases/:caseId`

### Homeworks and Assignment
- `GET /v1/homeworks?active=true&groupId=...`
- `POST /v1/homeworks`
  - Req includes: `title`, `description`, `problemIds[]`, `startAt`, `dueAt`, `latePenaltyAt`, `assignedGroupIds[]`, `assignedUserIds[]`
- `GET /v1/homeworks/:homeworkId`
- `PATCH /v1/homeworks/:homeworkId`
- `DELETE /v1/homeworks/:homeworkId`
- `POST /v1/homeworks/:homeworkId/assign`
- `GET /v1/homeworks/:homeworkId/problems`

### Leaderboard and Progress
- `GET /v1/homeworks/:homeworkId/leaderboard`
  - Resp row: `{ userId, displayName, totalScore, totalTimeMs, solvedCount, lastSubmitAt }`
- `GET /v1/homeworks/:homeworkId/progress?userId=...`
- `GET /v1/users/:userId/homeworks/:homeworkId/progress`

### Judge0-Compatible Submission APIs (backend facade)
- `POST /submissions` (Judge0 format)
  - Accept standard Judge0 fields (`source_code`, `language_id`, `stdin`, `expected_output`, `cpu_time_limit`, etc.) plus optional metadata:
  - `metadata: { problem_id, homework_id }`
  - Resp: `{ "token": "uuid" }`
- `GET /submissions/:token`
  - Judge0-compatible response fields (`stdout`, `stderr`, `compile_output`, `status`, `time`, `memory`, etc.)
- `GET /submissions/batch?tokens=...`
- `POST /submissions/batch`

Server behavior:
- Validate caller permission to submit `problem_id` / `homework_id`
- Build hidden testcase runs from backend DB (ignore client-provided hidden cases)
- Forward to Judge0
- Normalize Judge0 result -> internal `submissions` and `submission_testcase_results`
- Upsert homework score aggregates

### Submission History APIs (extension-friendly)
- `GET /v1/submissions?problemId=...&homeworkId=...&userId=...`
- `GET /v1/submissions/:submissionId`

## Task Plan

### Task 1: Bootstrap backend service skeleton

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/src/server.ts`
- Create: `backend/src/app.ts`
- Create: `backend/src/plugins/env.ts`
- Create: `backend/src/plugins/auth.ts`
- Create: `backend/src/plugins/prisma.ts`
- Test: `backend/tests/health.spec.ts`

**Step 1: Write the failing test**
```ts
it("GET /health returns ok", async () => {
  const app = await buildApp();
  const res = await app.inject({ method: "GET", url: "/health" });
  expect(res.statusCode).toBe(200);
  expect(res.json()).toEqual({ ok: true });
});
```

**Step 2: Run test to verify it fails**
Run: `cd backend && npm test -- health.spec.ts`
Expected: FAIL with missing app/server files.

**Step 3: Write minimal implementation**
- Add `buildApp()` with `/health` route.

**Step 4: Run test to verify it passes**
Run: `cd backend && npm test -- health.spec.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add backend/package.json backend/tsconfig.json backend/src backend/tests/health.spec.ts
git commit -m "feat(backend): bootstrap fastify service"
```

### Task 2: Add database schema and migration

**Files:**
- Create: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/*`
- Create: `backend/src/db/types.ts`
- Test: `backend/tests/schema.spec.ts`

**Step 1: Write the failing test**
- DB test expects tables: `users`, `groups`, `group_members`, `problems`, `problem_testcases`, `homeworks`, `homework_assignments`, `submissions`, `homework_scores`, `homework_problem_scores`.

**Step 2: Run test to verify it fails**
Run: `cd backend && npm test -- schema.spec.ts`
Expected: FAIL missing tables.

**Step 3: Write minimal implementation**
- Add Prisma models + generate migration.

**Step 4: Run test to verify it passes**
Run: `cd backend && npm test -- schema.spec.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add backend/prisma backend/src/db/types.ts backend/tests/schema.spec.ts
git commit -m "feat(db): add core oj relational schema"
```

### Task 3: Implement auth + RBAC middleware

**Files:**
- Create: `backend/src/modules/auth/auth.routes.ts`
- Create: `backend/src/modules/auth/auth.service.ts`
- Create: `backend/src/modules/auth/rbac.ts`
- Test: `backend/tests/auth.spec.ts`

**Step 1: Write the failing test**
- Login succeeds with seeded user.
- Unauthorized access to teacher-only route returns `403`.

**Step 2: Run test to verify it fails**
Run: `cd backend && npm test -- auth.spec.ts`
Expected: FAIL

**Step 3: Write minimal implementation**
- JWT issue/verify and role guard.

**Step 4: Run test to verify it passes**
Run: `cd backend && npm test -- auth.spec.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add backend/src/modules/auth backend/tests/auth.spec.ts
git commit -m "feat(auth): add local auth and role-based guards"
```

### Task 4: Implement users/groups endpoints

**Files:**
- Create: `backend/src/modules/users/users.routes.ts`
- Create: `backend/src/modules/users/users.service.ts`
- Create: `backend/src/modules/groups/groups.routes.ts`
- Create: `backend/src/modules/groups/groups.service.ts`
- Test: `backend/tests/users-groups.spec.ts`

**Step 1: Write the failing test**
- CRUD groups + add/remove members.

**Step 2: Run test to verify it fails**
Run: `cd backend && npm test -- users-groups.spec.ts`
Expected: FAIL

**Step 3: Write minimal implementation**
- Add list/filter users and group membership APIs.

**Step 4: Run test to verify it passes**
Run: `cd backend && npm test -- users-groups.spec.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add backend/src/modules/users backend/src/modules/groups backend/tests/users-groups.spec.ts
git commit -m "feat(api): add users and groups endpoints"
```

### Task 5: Implement problem + testcase endpoints

**Files:**
- Create: `backend/src/modules/problems/problems.routes.ts`
- Create: `backend/src/modules/problems/problems.service.ts`
- Create: `backend/src/modules/problems/testcase.repository.ts`
- Test: `backend/tests/problems.spec.ts`

**Step 1: Write the failing test**
- Teacher can create problem + testcases.
- Student can read problem but cannot read hidden testcase content.

**Step 2: Run test to verify it fails**
Run: `cd backend && npm test -- problems.spec.ts`
Expected: FAIL

**Step 3: Write minimal implementation**
- CRUD problems + testcase metadata endpoints.

**Step 4: Run test to verify it passes**
Run: `cd backend && npm test -- problems.spec.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add backend/src/modules/problems backend/tests/problems.spec.ts
git commit -m "feat(api): add problems and testcase endpoints"
```

### Task 6: Implement homework and assignment endpoints

**Files:**
- Create: `backend/src/modules/homeworks/homeworks.routes.ts`
- Create: `backend/src/modules/homeworks/homeworks.service.ts`
- Create: `backend/src/modules/homeworks/assignment.service.ts`
- Test: `backend/tests/homeworks.spec.ts`

**Step 1: Write the failing test**
- Create homework with multiple problems.
- Assign to groups/users.
- Student sees only assigned homeworks.

**Step 2: Run test to verify it fails**
Run: `cd backend && npm test -- homeworks.spec.ts`
Expected: FAIL

**Step 3: Write minimal implementation**
- Add homework CRUD and assignment routes.

**Step 4: Run test to verify it passes**
Run: `cd backend && npm test -- homeworks.spec.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add backend/src/modules/homeworks backend/tests/homeworks.spec.ts
git commit -m "feat(api): add homework and assignment endpoints"
```

### Task 7: Implement Judge0-compatible facade

**Files:**
- Create: `backend/src/modules/judge0/judge0.routes.ts`
- Create: `backend/src/modules/judge0/judge0.proxy.ts`
- Create: `backend/src/modules/submissions/submission.service.ts`
- Create: `backend/src/modules/submissions/result-normalizer.ts`
- Test: `backend/tests/judge0-compat.spec.ts`

**Step 1: Write the failing test**
- `POST /submissions` returns Judge0 token format.
- `GET /submissions/:token` returns Judge0-compatible fields.
- Metadata-driven permission checks enforced.

**Step 2: Run test to verify it fails**
Run: `cd backend && npm test -- judge0-compat.spec.ts`
Expected: FAIL

**Step 3: Write minimal implementation**
- Proxy to Judge0, map token/status, persist submission.

**Step 4: Run test to verify it passes**
Run: `cd backend && npm test -- judge0-compat.spec.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add backend/src/modules/judge0 backend/src/modules/submissions backend/tests/judge0-compat.spec.ts
git commit -m "feat(api): add judge0-compatible submissions facade"
```

### Task 8: Implement leaderboard/progress endpoints

**Files:**
- Create: `backend/src/modules/leaderboard/leaderboard.routes.ts`
- Create: `backend/src/modules/leaderboard/leaderboard.service.ts`
- Create: `backend/src/modules/leaderboard/aggregator.ts`
- Test: `backend/tests/leaderboard.spec.ts`

**Step 1: Write the failing test**
- After submissions, leaderboard orders by score desc then time asc.

**Step 2: Run test to verify it fails**
Run: `cd backend && npm test -- leaderboard.spec.ts`
Expected: FAIL

**Step 3: Write minimal implementation**
- Aggregate `homework_scores` + per-problem details.

**Step 4: Run test to verify it passes**
Run: `cd backend && npm test -- leaderboard.spec.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add backend/src/modules/leaderboard backend/tests/leaderboard.spec.ts
git commit -m "feat(api): add homework leaderboard endpoints"
```

### Task 9: Build Hydro backup importer

**Files:**
- Create: `backend/scripts/import-hydro.ts`
- Create: `backend/src/modules/importer/hydro-parser.ts`
- Create: `backend/src/modules/importer/mappers.ts`
- Test: `backend/tests/import-hydro.spec.ts`

**Step 1: Write the failing test**
- Import sample backup subset and verify counts and key field mappings.

**Step 2: Run test to verify it fails**
Run: `cd backend && npm test -- import-hydro.spec.ts`
Expected: FAIL

**Step 3: Write minimal implementation**
- Parse BSON files and storage mappings.
- Import users, groups, problems, testcases, homeworks, records.

**Step 4: Run test to verify it passes**
Run: `cd backend && npm test -- import-hydro.spec.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add backend/scripts/import-hydro.ts backend/src/modules/importer backend/tests/import-hydro.spec.ts
git commit -m "feat(import): add hydro backup importer"
```

### Task 10: Refactor VS Code extension API layer

**Files:**
- Create: `src/api/ojApiClient.ts`
- Create: `src/api/types.ts`
- Modify: `src/leetCodeManager.ts`
- Modify: `src/commands/list.ts`
- Modify: `src/commands/show.ts`
- Modify: `src/commands/submit.ts`
- Modify: `src/commands/test.ts`
- Test: `src/test/apiClient.spec.ts`

**Step 1: Write the failing test**
- `ojApiClient` handles login, list problems, submit/poll submission.

**Step 2: Run test to verify it fails**
Run: `npm test -- apiClient.spec.ts`
Expected: FAIL

**Step 3: Write minimal implementation**
- Replace CLI executor dependency for core workflows.

**Step 4: Run test to verify it passes**
Run: `npm test -- apiClient.spec.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add src/api src/leetCodeManager.ts src/commands src/test/apiClient.spec.ts
git commit -m "refactor(extension): switch core flows to backend oj api"
```

### Task 11: Add homework + leaderboard explorer nodes

**Files:**
- Modify: `src/explorer/LeetCodeTreeDataProvider.ts`
- Modify: `src/explorer/LeetCodeNode.ts`
- Modify: `src/extension.ts`
- Modify: `package.json`
- Create: `src/commands/homework.ts`
- Create: `src/webview/homeworkLeaderboardProvider.ts`
- Test: `src/test/explorer-homework.spec.ts`

**Step 1: Write the failing test**
- Explorer shows assigned homeworks and opens leaderboard.

**Step 2: Run test to verify it fails**
Run: `npm test -- explorer-homework.spec.ts`
Expected: FAIL

**Step 3: Write minimal implementation**
- Add commands and tree nodes for homework + leaderboard.

**Step 4: Run test to verify it passes**
Run: `npm test -- explorer-homework.spec.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add src/explorer src/commands/homework.ts src/webview/homeworkLeaderboardProvider.ts src/extension.ts package.json src/test/explorer-homework.spec.ts
git commit -m "feat(extension): add homework explorer and leaderboard views"
```

### Task 12: Docs, env templates, and verification

**Files:**
- Create: `backend/.env.example`
- Create: `backend/README.md`
- Modify: `README.md`
- Create: `docs/api/oj-openapi.yaml`
- Create: `docs/migration/hydro-mapping.md`

**Step 1: Write the failing test**
- Add contract validation test against `docs/api/oj-openapi.yaml`.

**Step 2: Run test to verify it fails**
Run: `cd backend && npm test -- openapi.spec.ts`
Expected: FAIL

**Step 3: Write minimal implementation**
- Add OpenAPI for all endpoints.
- Add runbooks and migration checklist.

**Step 4: Run full verification**
Run: `cd backend && npm test && npm run lint`
Run: `npm test && npm run lint`
Expected: all PASS

**Step 5: Commit**
```bash
git add backend/.env.example backend/README.md README.md docs/api/oj-openapi.yaml docs/migration/hydro-mapping.md
git commit -m "docs: add api contract and migration runbooks"
```

## Security and Policy Constraints
- Students can only view assigned homework and public problem statements.
- Hidden testcase content is never returned to student clients.
- Submission metadata (`problem_id`, `homework_id`) required for grading submissions.
- Teacher/admin-only operations guarded by RBAC.

## Minimal Runtime Configuration
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JUDGE0_BASE_URL`
- `JUDGE0_API_KEY` (optional)
- `FILES_ROOT` (for imported testcase assets)

## Acceptance Criteria
- All endpoints above implemented and tested.
- `/submissions` and `/submissions/:token` are Judge0-compatible in request/response shape.
- Existing Hydro backup imported with integrity checks.
- VS Code extension no longer depends on `vsc-leetcode-cli` for core OJ workflows.
- Students can: login, list assigned homework, open problems, submit code, view leaderboard.
