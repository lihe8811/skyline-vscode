# Python 3.13 Custom OJ + Backup Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a single backend service with an internal Python 3.13 judge and migrate Hydro backup data into standalone MongoDB so the VS Code extension can use one unified API.

**Architecture:** Use one backend for auth, RBAC, problems, homework, submissions, and leaderboard. Replace Judge0 with an internal judge worker that runs untrusted Python code in isolated containers. Keep migration in two layers: raw backup restore (`hydro_raw`) and transformed app read model (`oj_app`). The extension talks only to backend REST endpoints.

**Tech Stack:** Node.js (TypeScript), MongoDB 7.x, Redis queue (or Mongo queue fallback), Docker sandbox runner (Python 3.13), VS Code extension.

## Scope
- Language support: Python 3.13 only.
- Submission result: accepted/wrong answer/runtime error/time limit/memory limit/compile error (syntax error).
- Homework leaderboard: score desc, time asc.
- Assignment model: users + groups.

## Non-Negotiable Safety Requirements
- Never execute user code directly on host.
- Execute in container/jail with:
  - `--network=none`
  - cpu/time/memory limits
  - process count limit
  - stdout/stderr size limit
  - temp filesystem isolation
- Hard kill on timeout.
- Hidden testcases are fetched server-side only (never from client payload).

## Backup Mapping (Hydro -> App)
- `document.docType=10` -> `oj_app.problems`
- `document.docType=30` and `rule=homework` -> `oj_app.homeworks`
- `document.status.docType=30` -> `oj_app.homework_scores`, `oj_app.homework_problem_scores`
- `record` -> `oj_app.submissions` (historical import)
- `user` + `domain.user` -> `oj_app.users`
- `user.group` -> `oj_app.groups`, `oj_app.group_members`
- `storage` + `backup/file/hydro/*` -> `oj_app.problem_testcases`

## API Contracts (Unified Backend)
- `POST /v1/auth/login`
- `GET /v1/problems`
- `GET /v1/problems/:problemId`
- `GET /v1/homeworks`
- `GET /v1/homeworks/:homeworkId`
- `GET /v1/homeworks/:homeworkId/leaderboard`
- `POST /v1/submissions` (create run request)
- `GET /v1/submissions/:submissionId` (poll status/result)
- `GET /v1/submissions?problemId=&homeworkId=&userId=`

## Task Plan

### Task 1: Restore raw backup into standalone MongoDB

**Files:**
- Create: `scripts/migration/01_restore_raw.sh`
- Create: `scripts/migration/tests/restore_smoke.sh`
- Create: `scripts/migration/README.md`

**Step 1: Write the failing test**
- `restore_smoke.sh` checks required raw collections exist (`document`, `record`, `user`, `user.group`, `domain.user`, `storage`).

**Step 2: Run test to verify it fails**
Run: `bash scripts/migration/tests/restore_smoke.sh`
Expected: FAIL before restore script exists.

**Step 3: Write minimal implementation**
- Implement restore script:
  - `mongorestore --uri "$MONGO_URI" --nsFrom 'hydro.*' --nsTo 'hydro_raw.*' backup/dump/hydro`

**Step 4: Run test to verify it passes**
Run: `bash scripts/migration/01_restore_raw.sh && bash scripts/migration/tests/restore_smoke.sh`
Expected: PASS.

**Step 5: Commit**
```bash
git add scripts/migration/01_restore_raw.sh scripts/migration/tests/restore_smoke.sh scripts/migration/README.md
git commit -m "feat(migration): restore hydro backup into hydro_raw"
```

### Task 2: Create transformed collections and indexes

**Files:**
- Create: `scripts/migration/02_create_oj_app_indexes.js`
- Create: `scripts/migration/schema/oj_app_collections.md`
- Test: `scripts/migration/tests/index_smoke.js`

**Step 1: Write the failing test**
- Assert indexes for query paths:
  - problems by tag/difficulty/search
  - homeworks by due/assignment
  - submissions by user/problem/homework/time
  - leaderboard by homework+score+time

**Step 2: Run test to verify it fails**
Run: `node scripts/migration/tests/index_smoke.js`
Expected: FAIL.

**Step 3: Write minimal implementation**
- Create indexes on `oj_app` collections.

**Step 4: Run test to verify it passes**
Run: `node scripts/migration/tests/index_smoke.js`
Expected: PASS.

**Step 5: Commit**
```bash
git add scripts/migration/02_create_oj_app_indexes.js scripts/migration/schema/oj_app_collections.md scripts/migration/tests/index_smoke.js
git commit -m "feat(migration): add oj_app indexes"
```

### Task 3: Implement users/groups ETL

**Files:**
- Create: `scripts/migration/etl/users_groups.ts`
- Create: `scripts/migration/03_etl_users_groups.ts`
- Test: `scripts/migration/tests/users_groups_etl.spec.ts`

**Step 1: Write the failing test**
- Validate role merge from `domain.user` and group membership expansion.

**Step 2: Run test to verify it fails**
Run: `npm test -- scripts/migration/tests/users_groups_etl.spec.ts`
Expected: FAIL.

**Step 3: Write minimal implementation**
- Transform raw user/group data into `oj_app.users/groups/group_members`.

**Step 4: Run test to verify it passes**
Run: `npm test -- scripts/migration/tests/users_groups_etl.spec.ts`
Expected: PASS.

**Step 5: Commit**
```bash
git add scripts/migration/etl/users_groups.ts scripts/migration/03_etl_users_groups.ts scripts/migration/tests/users_groups_etl.spec.ts
git commit -m "feat(migration): transform users and groups"
```

### Task 4: Implement problems/testcases ETL

**Files:**
- Create: `scripts/migration/etl/problems.ts`
- Create: `scripts/migration/04_etl_problems_testcases.ts`
- Test: `scripts/migration/tests/problems_etl.spec.ts`

**Step 1: Write the failing test**
- Validate problem count and testcase join by `storage.path` pattern `problem/system/{pid}/testdata/*`.

**Step 2: Run test to verify it fails**
Run: `npm test -- scripts/migration/tests/problems_etl.spec.ts`
Expected: FAIL.

**Step 3: Write minimal implementation**
- Transform problem docs and testcase references into `oj_app.problems/problem_testcases`.

**Step 4: Run test to verify it passes**
Run: `npm test -- scripts/migration/tests/problems_etl.spec.ts`
Expected: PASS.

**Step 5: Commit**
```bash
git add scripts/migration/etl/problems.ts scripts/migration/04_etl_problems_testcases.ts scripts/migration/tests/problems_etl.spec.ts
git commit -m "feat(migration): transform problems and testcases"
```

### Task 5: Implement homework/leaderboard ETL

**Files:**
- Create: `scripts/migration/etl/homeworks.ts`
- Create: `scripts/migration/05_etl_homeworks_scores.ts`
- Test: `scripts/migration/tests/homeworks_scores_etl.spec.ts`

**Step 1: Write the failing test**
- Validate homework assignment and score aggregation parity with sample raw rows.

**Step 2: Run test to verify it fails**
Run: `npm test -- scripts/migration/tests/homeworks_scores_etl.spec.ts`
Expected: FAIL.

**Step 3: Write minimal implementation**
- Transform `docType=30` + `document.status` to `homeworks`, `homework_assignments`, `homework_scores`, `homework_problem_scores`.

**Step 4: Run test to verify it passes**
Run: `npm test -- scripts/migration/tests/homeworks_scores_etl.spec.ts`
Expected: PASS.

**Step 5: Commit**
```bash
git add scripts/migration/etl/homeworks.ts scripts/migration/05_etl_homeworks_scores.ts scripts/migration/tests/homeworks_scores_etl.spec.ts
git commit -m "feat(migration): transform homework and leaderboard data"
```

### Task 6: Implement unified backend read modules (Mongo)

**Files:**
- Create: `backend/src/modules/readmodel/repository.ts`
- Modify: `backend/src/modules/problems/problems.service.ts`
- Modify: `backend/src/modules/homeworks/homeworks.service.ts`
- Modify: `backend/src/modules/leaderboard/leaderboard.service.ts`
- Test: `backend/tests/readmodel.spec.ts`

**Step 1: Write the failing test**
- Backend endpoints return expected DTOs from `oj_app`.

**Step 2: Run test to verify it fails**
Run: `cd backend && npm test -- readmodel.spec.ts`
Expected: FAIL.

**Step 3: Write minimal implementation**
- Add Mongo repository and service adapters.

**Step 4: Run test to verify it passes**
Run: `cd backend && npm test -- readmodel.spec.ts`
Expected: PASS.

**Step 5: Commit**
```bash
git add backend/src/modules/readmodel backend/src/modules/problems/problems.service.ts backend/src/modules/homeworks/homeworks.service.ts backend/src/modules/leaderboard/leaderboard.service.ts backend/tests/readmodel.spec.ts
git commit -m "feat(api): read OJ data from oj_app"
```

### Task 7: Build Python 3.13 judge worker (no Judge0)

**Files:**
- Create: `backend/src/modules/judge/queue.ts`
- Create: `backend/src/modules/judge/worker.ts`
- Create: `backend/src/modules/judge/sandbox_runner.ts`
- Create: `backend/src/modules/judge/result_mapper.ts`
- Test: `backend/tests/judge_worker.spec.ts`

**Step 1: Write the failing test**
- Queue job executes Python submission against testcase set and returns normalized status.

**Step 2: Run test to verify it fails**
Run: `cd backend && npm test -- judge_worker.spec.ts`
Expected: FAIL.

**Step 3: Write minimal implementation**
- Worker executes `python3.13` in Docker sandbox with strict limits and compares outputs.

**Step 4: Run test to verify it passes**
Run: `cd backend && npm test -- judge_worker.spec.ts`
Expected: PASS.

**Step 5: Commit**
```bash
git add backend/src/modules/judge backend/tests/judge_worker.spec.ts
git commit -m "feat(judge): add python3.13 sandbox worker"
```

### Task 8: Add submissions API orchestration in unified backend

**Files:**
- Create: `backend/src/modules/submissions/submission.routes.ts`
- Create: `backend/src/modules/submissions/submission.service.ts`
- Modify: `backend/src/modules/homeworks/homeworks.service.ts`
- Test: `backend/tests/submission_flow.spec.ts`

**Step 1: Write the failing test**
- `POST /v1/submissions` enqueues job and stores pending submission.
- `GET /v1/submissions/:submissionId` returns terminal result after worker updates.

**Step 2: Run test to verify it fails**
Run: `cd backend && npm test -- submission_flow.spec.ts`
Expected: FAIL.

**Step 3: Write minimal implementation**
- Connect submission service to queue + Mongo updates + leaderboard recompute.

**Step 4: Run test to verify it passes**
Run: `cd backend && npm test -- submission_flow.spec.ts`
Expected: PASS.

**Step 5: Commit**
```bash
git add backend/src/modules/submissions backend/src/modules/homeworks/homeworks.service.ts backend/tests/submission_flow.spec.ts
git commit -m "feat(api): orchestrate submissions with internal judge"
```

### Task 9: Extension integration (single backend)

**Files:**
- Modify: `src/api/ojApiClient.ts`
- Modify: `src/commands/list.ts`
- Modify: `src/commands/show.ts`
- Modify: `src/commands/submit.ts`
- Modify: `src/webview/leetCodeSubmissionProvider.ts`
- Test: `src/test/extension_custom_oj.spec.ts`

**Step 1: Write the failing test**
- Extension flows: list problem, open homework, submit code, poll result.

**Step 2: Run test to verify it fails**
Run: `npm test -- extension_custom_oj.spec.ts`
Expected: FAIL.

**Step 3: Write minimal implementation**
- Use unified backend APIs only.

**Step 4: Run test to verify it passes**
Run: `npm test -- extension_custom_oj.spec.ts`
Expected: PASS.

**Step 5: Commit**
```bash
git add src/api/ojApiClient.ts src/commands/list.ts src/commands/show.ts src/commands/submit.ts src/webview/leetCodeSubmissionProvider.ts src/test/extension_custom_oj.spec.ts
git commit -m "feat(extension): integrate with custom python oj backend"
```

### Task 10: Validation, cutover, and rollback runbooks

**Files:**
- Create: `scripts/migration/06_validate.ts`
- Create: `docs/migration/custom-oj-cutover.md`
- Create: `docs/migration/custom-oj-rollback.md`

**Step 1: Write the failing test**
- Validation fails when missing references or large count deltas.

**Step 2: Run test to verify it fails**
Run: `npm test -- scripts/migration/tests/validation.spec.ts`
Expected: FAIL.

**Step 3: Write minimal implementation**
- Generate reconciliation report and explicit go/no-go checks.

**Step 4: Run test to verify it passes**
Run: `npm test -- scripts/migration/tests/validation.spec.ts`
Expected: PASS.

**Step 5: Commit**
```bash
git add scripts/migration/06_validate.ts docs/migration/custom-oj-cutover.md docs/migration/custom-oj-rollback.md
git commit -m "docs(migration): add custom oj cutover and rollback guides"
```

## Success Criteria
- Backup data migrated into `oj_app` with validated consistency.
- Unified backend serves all extension-required flows.
- Python 3.13 submissions judged correctly in isolated sandbox.
- No direct Judge0 dependency remains.
- Cutover is repeatable and rollback is documented and fast.
