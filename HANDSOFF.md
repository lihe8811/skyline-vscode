# SkylineAI Hydro Integration

This document is the canonical boundary and rollout plan for the sibling
repositories:

```text
Edu/
  skyline-vscode/
  skyline-hydro/
```

The repositories remain independent Git projects. Hydro source must not be
copied into `skyline-vscode`, and neither repository is a submodule of the
other.

## Production Architecture

```text
Git-managed course content
          |
          v
skyline validate / diff / sync / export / migrate
          |
          v
https://homework.skyline-ai.space/api/skyline/v1
          |
          v
SkylineAI Hydro plugin
          |
          v
Hydro models, storage, MongoDB, and judge workers
          |
          v
SkylineAI VS Code extension
```

One dedicated Hydro domain serves SkylineAI initially. Hydro groups represent
classes and cohorts. Git-managed files are authoritative for teacher-managed
course content; Hydro is authoritative for credentials, submissions, judge
results, and derived progress.

## Repository Ownership

### `skyline-vscode`

This repository owns:

- The student-facing VS Code extension.
- Login UI and token storage through VS Code SecretStorage.
- Homework, problem, progress, leaderboard, and submission workflows.
- The SkylineAI API client and a pinned copy of the API contract.
- Course content schemas and the `skyline` operator CLI.
- Historical backup conversion and migration tooling.
- This canonical `HANDSOFF.md`.

It must not:

- Connect directly to MongoDB.
- Depend on Hydro collection layouts or internal document shapes.
- Execute untrusted student code.
- Reimplement Hydro storage, queues, judging, or scheduling.
- Add new behavior to the experimental standalone backend or custom judge.

The existing `backend/`, `compose.yaml`, `deploy/`, `oj_app` migration path, and
custom judge are frozen. Remove them only after Hydro cutover, backup restore,
and rollback verification.

### `skyline-hydro`

The Hydro fork owns:

- The `plugins/skyline` workspace package.
- The canonical OpenAPI contract for `/api/skyline/v1`.
- Authentication and authorization for extension and CLI requests.
- Translation between stable SkylineAI DTOs and Hydro models.
- Idempotent synchronization of users, groups, problems, test data, and
  homework.
- Submission creation through Hydro's normal judge path.
- Progress and leaderboard derivation from Hydro runtime data.
- Audit records for administrative synchronization.
- Production container images and single-server deployment configuration.

It must not:

- Add a second SkylineAI database or write around Hydro models and services.
- Expose hidden tests, reference solutions, credentials, or internal documents.
- Redesign Hydro's administration UI for the normal SkylineAI workflow.
- Delete unused Hydro structures.
- Patch Hydro core unless a tested plugin feasibility case proves that an
  exported extension point is missing.

The initial baseline is Hydro 5.0.3 at upstream commit `44df5f04`, using
Node.js 22. The fork keeps `origin` for SkylineAI and
`https://github.com/hydro-dev/Hydro.git` as `upstream`.

## Public API

The public service origin is:

```text
https://homework.skyline-ai.space
```

The extension and CLI use only:

```text
POST /api/skyline/v1/auth/login
POST /api/skyline/v1/auth/logout
GET  /api/skyline/v1/auth/me
GET  /api/skyline/v1/problems
GET  /api/skyline/v1/problems/:id
GET  /api/skyline/v1/homeworks
GET  /api/skyline/v1/homeworks/:id
GET  /api/skyline/v1/homeworks/:id/leaderboard
POST /api/skyline/v1/submissions
GET  /api/skyline/v1/submissions/:id
POST /api/skyline/v1/admin/plan
POST /api/skyline/v1/admin/sync
```

The plugin owns the canonical OpenAPI document. CI exports a pinned snapshot to
`skyline-vscode`, where compatibility tests fail on drift.

Student authentication uses Hydro credentials and revocable bearer sessions.
Administrative synchronization uses separate revocable tokens with explicit
`plan`, `sync`, `export`, or `migrate` scopes. Student sessions are never
accepted by administrative routes.

SkylineAI accepts only Hydro language `py3`. The deployed judge must report
Python 3.13 before it is considered healthy.

## Course Administration

Course content remains in `skyline-vscode` until repository size or access
control requires a dedicated private repository:

```text
content/
  users.csv
  groups/
  problems/
    hello-world/
      problem.yaml
      statement.md
      solution.py
      tests/
  homeworks/
```

The CLI provides:

```text
skyline validate
skyline diff
skyline sync
skyline export
skyline migrate
```

`validate` is offline. `diff` calls the administrative planning endpoint.
`sync` requires a validated plan revision, is idempotent, archives by default,
and requires an explicit destructive flag for deletion. Every mutating command
supports `--dry-run`. Content files never contain passwords, hashes, session
tokens, or administrative tokens.

## Deployment

The first production deployment uses one Linux server:

- Caddy or Nginx exposes ports 80 and 443, redirects HTTP to HTTPS, and
  terminates TLS for `homework.skyline-ai.space`.
- Hydro web/API runs with the SkylineAI addon installed at image build time.
- MongoDB uses authentication and a private Docker network.
- Hydro files, MongoDB, configuration, and addon metadata use persistent
  volumes.
- The Hydro judge is private, uses the normal Hydro protocol, and runs Python
  3.13.
- MongoDB, Hydro's internal port, and judge control traffic are not published.

Back up MongoDB, Hydro storage, configuration, and addon metadata before every
production rollout or Hydro upgrade. Pin both Hydro and SkylineAI plugin
revisions. Test upstream merges on a separate branch and never synchronize
course content during an upgrade.

## Delivery Sequence

1. Add plugin health, OpenAPI, and read-only problem/homework endpoints.
2. Add login, logout, current-user, and authorization tests.
3. Add Python 3.13 submission creation and result polling.
4. Add offline course validation and administrative plan/sync.
5. Convert and compare historical backup data.
6. Deploy a production-equivalent HTTPS staging instance.
7. Point a staging extension build at `homework.skyline-ai.space`.
8. Rehearse backup restore and rollback.
9. Cut over production.
10. Remove the standalone backend only after the rollback window closes.

## Release Gates

A release is blocked unless all of the following pass:

- Hydro plugin unit, authorization, and hidden-data tests.
- OpenAPI compatibility tests in both repositories.
- CLI validation, dry-run, idempotency, archive, and partial-failure tests.
- Extension login, browsing, submission, polling, and expired-session tests.
- HTTPS health checks against the deployment.
- Real Python 3.13 accepted, wrong-answer, runtime-error, and time-limit
  submissions.
- Backup restoration and rollback rehearsal.

