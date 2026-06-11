# SkylineAI OJ

SkylineAI OJ is a VS Code extension and course-management toolkit for Python
homework. Hydro provides accounts, homework persistence, judging, progress,
and leaderboards through:

```text
https://homework.skyline-ai.space/api/skyline/v1
```

The extension appends `/api/skyline/v1` internally, so its default setting is
the service origin:

```json
{
  "skylineOj.backendUrl": "https://homework.skyline-ai.space"
}
```

Student bearer tokens are stored only in VS Code SecretStorage. The extension
supports login and logout, assigned homework browsing, Python file creation,
submission polling, progress, and homework leaderboards. SkylineAI accepts
only Hydro `py3` submissions; production judges run Python 3.13.

See [HANDSOFF.md](HANDSOFF.md) for repository boundaries, architecture,
deployment gates, and the cutover sequence.

## Course Content

Teacher-managed content lives under a directory such as:

```text
content/
  users.csv
  groups/
  problems/
    hello-world/
      problem.yaml
      statement.md
      tests/
        01.in
        01.out
  homeworks/
```

Install dependencies and run the operator CLI:

```bash
npm ci
npm run skyline -- validate --content content
```

Administrative API commands require a scoped token:

```bash
export SKYLINE_ADMIN_TOKEN='<token>'
npm run skyline -- diff --content content
npm run skyline -- sync --content content --dry-run
npm run skyline -- sync --content content
```

Useful commands:

```text
skyline validate --content <dir>
skyline diff --content <dir> [--url <origin>] [--destructive]
skyline sync --content <dir> [--url <origin>] [--dry-run] [--destructive]
skyline export --content <dir> [--output <file>]
skyline migrate --input <normalized-json> [--output <file>]
```

`sync` always requests a plan before applying it. Revisions are deterministic,
repeated revisions are idempotent, and missing resources are archived unless
`--destructive` is explicitly provided.

`export` creates a reviewable manifest from local course content. `migrate`
normalizes and validates historical JSON before it is reviewed and synced; it
does not connect to MongoDB.

## Development

```bash
npm ci
npm run compile
npm run lint
npm run test:skyline
node --test src/test/extension_custom_oj.spec.js
```

The pinned API contract is
`contracts/skyline-openapi.yaml`. Its canonical source is
`skyline-hydro/plugins/skyline/openapi.yaml`.

The previous standalone backend, custom judge, Docker Compose stack, and raw
migration scripts remain in this repository only for cutover and rollback.
They are frozen and must not be extended. Remove them only after production
Hydro verification, backup restoration, and the rollback window.
