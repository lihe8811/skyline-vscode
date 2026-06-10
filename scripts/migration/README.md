# Migration Scripts

This folder contains one-off and repeatable migration scripts for Hydro backup data.

## Restore raw backup

Dry-run (recommended first):

```bash
bash scripts/migration/01_restore_raw.sh --dry-run --uri mongodb://localhost:27017
```

Live restore:

```bash
MONGO_URI='mongodb://localhost:27017' bash scripts/migration/01_restore_raw.sh
```

Optional env vars:
- `BACKUP_DUMP_DIR` (default: `<repository>/backup/dump/hydro`)

For the local Docker Compose stack, restore from the read-only `/backup`
mount using the MongoDB root account:

```bash
docker compose exec mongodb sh -lc '
  mongorestore \
    --username "$MONGO_INITDB_ROOT_USERNAME" \
    --password "$MONGO_INITDB_ROOT_PASSWORD" \
    --authenticationDatabase admin \
    --nsFrom "hydro.*" \
    --nsTo "hydro_raw.*" \
    /backup/dump/hydro
'
```

## Smoke check

Dry-run check:

```bash
DRY_RUN=1 bash scripts/migration/tests/restore_smoke.sh
```

Live DB check:

```bash
MONGO_URI='mongodb://localhost:27017' bash scripts/migration/tests/restore_smoke.sh
```
