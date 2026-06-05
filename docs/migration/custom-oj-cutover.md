# Custom OJ Cutover Runbook

## Gates

1. Restore Hydro backup into `hydro_raw`.
2. Run ETL into `oj_app`.
3. Run migration validation and confirm `ok: true`.
4. Run backend tests.
5. Configure staging extension with `skylineOj.backendUrl`.
6. Verify list, preview, submit, and submission polling.
7. Point production extension/backend config at the new backend.

## Commands

```bash
DRY_RUN=1 bash scripts/migration/tests/restore_smoke.sh
node scripts/migration/tests/index_smoke.js
node --test scripts/migration/tests/*.spec.js
cd backend && npm test
```

## Go/No-Go

Proceed only when all gates pass and the validation report has no orphan users, problems, homework references, or submission references.
