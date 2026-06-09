# SkylineAI OJ

> Solve SkylineAI Python homework problems in VS Code.

<p align="center">
  <img src="resources/SkylineAI.png" alt="SkylineAI" width="168">
</p>

SkylineAI OJ is a refactor of the original VS Code LeetCode extension into a classroom-oriented online judge for Python students. The target product is a VS Code extension backed by a single self-hosted service that owns classroom data, homework assignment data, submissions, leaderboards, and Python 3.11 judging.

The extension code still contains legacy LeetCode command IDs and package metadata while the migration is in progress. New SkylineAI integration code is enabled through the `skylineOj.*` settings described below.

## Product Goals

- Students can sign in, browse assigned homework, open problems, write Python solutions, submit from VS Code, and review judging results.
- Teachers can migrate existing OJ data, organize users into groups/classes, assign homework, and review per-homework leaderboards.
- The backend exposes RESTful APIs for problems, homework, submissions, users, groups, and leaderboards.
- The judging path is Python 3.11 only, which keeps the infrastructure simpler than a general multi-language OJ.
- Historical MongoDB backup data from the previous OJ can be transformed into the new application collections.

## Current Status

Implemented in this branch:

- Migration scripts for Hydro/MongoDB backup data under `scripts/migration/`.
- Application collection design and migration validation checks.
- Backend scaffold under `backend/` with route registration, auth/RBAC helpers, read-model services, submission orchestration, and judge worker modules.
- Python judge runner scaffold with result mapping for accepted, wrong answer, runtime error, time limit, and memory limit states.
- VS Code extension API client and command integration that use SkylineAI OJ when `skylineOj.backendUrl` is configured.
- Cutover and rollback runbooks under `docs/migration/`.

Not complete yet:

- Production authentication. Auth0 is planned, but current backend auth is scaffolding.
- Production-grade sandbox hardening and deployment packaging for the Python judge worker.
- Full extension renaming from legacy LeetCode package metadata and command IDs.
- Teacher/admin UI workflows for managing classes and homework.

## Architecture

```text
VS Code extension
  -> SkylineAI OJ REST API
      -> MongoDB application database
      -> Python 3.11 judge queue and worker
      -> sandboxed solution execution
```

The backend is intentionally the single integration point for the extension. It owns both classroom data and judging orchestration so the extension does not need to talk to Judge0 or directly understand migrated MongoDB backup schemas.

## Extension Configuration

Add these settings to VS Code `settings.json` when testing the SkylineAI backend path:

```json
{
  "skylineOj.backendUrl": "http://localhost:3000",
  "skylineOj.token": "dev-token"
}
```

`skylineOj.backendUrl` enables the custom OJ API integration. If it is missing, the extension falls back to the legacy LeetCode flow.

`skylineOj.token` is sent as the API bearer token when configured. This is a temporary development path until Auth0 integration is added.

## REST API Scope

The backend design is centered around these resource groups:

- `GET /api/v1/problems` lists available problems.
- `GET /api/v1/problems/:id` returns problem details and visible examples.
- `GET /api/v1/homeworks` lists assigned homework.
- `GET /api/v1/homeworks/:id` returns homework details and problem membership.
- `GET /api/v1/homeworks/:id/leaderboard` returns ranking data for a homework.
- `POST /api/v1/submissions` creates a Python submission and enqueues judging.
- `GET /api/v1/submissions/:id` returns submission state and judge result.

The public extension client currently depends on problem listing/detail and submission creation/result endpoints. Teacher/admin endpoints for managing users, groups, and assignments are part of the backend roadmap.

## Data Migration

The previous OJ data export lives in `backup/` and is treated as a raw MongoDB restore source. Migration is split into repeatable steps:

```bash
bash scripts/migration/01_restore_raw.sh --dry-run --uri mongodb://localhost:27017
MONGO_URI='mongodb://localhost:27017' bash scripts/migration/01_restore_raw.sh
node scripts/migration/02_create_oj_app_indexes.js
node scripts/migration/03_etl_users_groups.js
node scripts/migration/04_etl_problems_testcases.js
node scripts/migration/05_etl_homeworks_scores.js
node scripts/migration/06_validate.js
```

The migration keeps the raw backup separate from the new application collections:

- `hydro_raw` stores restored source collections.
- `oj_app` stores normalized users, groups, problems, test cases, homework, submissions, and leaderboard read models.

See `scripts/migration/README.md`, `scripts/migration/schema/oj_app_collections.md`, `docs/migration/custom-oj-cutover.md`, and `docs/migration/custom-oj-rollback.md` for operational details.

## Development

Install dependencies:

```bash
npm ci
```

Compile the VS Code extension:

```bash
npm run compile
```

Run the extension API client test:

```bash
node --test src/test/extension_custom_oj.spec.js
```

Run backend tests:

```bash
cd backend
npm test
```

Run migration tests:

```bash
node --test scripts/migration/tests/*.spec.js
node scripts/migration/tests/index_smoke.js
DRY_RUN=1 bash scripts/migration/tests/restore_smoke.sh
```

## Build For Local Verification

The fastest verification path is:

```bash
npm ci
npm run compile
```

Then open the repository in VS Code and press `F5` to launch an Extension Development Host. Configure `skylineOj.backendUrl` in the development host settings to test against the local or staging backend.

For packaging a `.vsix`, use the VS Code extension packaging tool:

```bash
npx vsce package
```

## Project Layout

```text
backend/                  Backend API and Python judge worker scaffold
docs/migration/           Cutover and rollback runbooks
resources/                Extension and README assets
scripts/migration/        MongoDB restore, ETL, indexes, and validation scripts
src/api/                  SkylineAI OJ API client and configuration
src/commands/             Extension command integration
src/test/                 Extension-side tests
```

## Security Notes

The Python judge must be deployed as an isolated service with strict resource controls. The current scaffold is useful for local development and API integration, but production deployment must enforce:

- Container isolation per submission.
- No network access from submitted code.
- CPU, memory, process, and wall-clock limits.
- Read-only problem/testcase inputs.
- Separate worker credentials from teacher/admin API credentials.

## Acknowledgement

This repository started from the open-source VS Code LeetCode extension. The current work is replacing that product surface with SkylineAI-specific classroom OJ behavior while retaining useful extension infrastructure during the transition.
