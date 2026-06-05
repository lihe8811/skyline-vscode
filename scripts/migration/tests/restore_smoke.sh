#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
RESTORE_SCRIPT="$ROOT_DIR/scripts/migration/01_restore_raw.sh"
BACKUP_DUMP_DIR="${BACKUP_DUMP_DIR:-/Users/lihe8811/Documents/Code/Edu/skyline-vscode/backup/dump/hydro}"

if [[ "${DRY_RUN:-0}" == "1" ]]; then
  [[ -x "$RESTORE_SCRIPT" ]] || { echo "missing executable restore script: $RESTORE_SCRIPT"; exit 1; }
  [[ -d "$BACKUP_DUMP_DIR" ]] || { echo "missing backup dump dir: $BACKUP_DUMP_DIR"; exit 1; }

  OUTPUT="$($RESTORE_SCRIPT --dry-run --uri mongodb://example:27017 2>&1 || true)"
  echo "$OUTPUT" | grep -q -- "--nsFrom" || { echo "dry-run output missing nsFrom flag"; exit 1; }
  echo "$OUTPUT" | grep -Fq -- "hydro.\\*" || { echo "dry-run output missing hydro source namespace"; exit 1; }
  echo "$OUTPUT" | grep -q -- "--nsTo" || { echo "dry-run output missing nsTo flag"; exit 1; }
  echo "$OUTPUT" | grep -Fq -- "hydro_raw.\\*" || { echo "dry-run output missing hydro_raw target namespace"; exit 1; }
  echo "$OUTPUT" | grep -q "$BACKUP_DUMP_DIR" || { echo "dry-run output missing backup path"; exit 1; }
  echo "restore dry-run smoke check passed"
  exit 0
fi

command -v mongosh >/dev/null 2>&1 || { echo "mongosh is required for live smoke check"; exit 1; }

MONGO_URI="${MONGO_URI:-}"
[[ -n "$MONGO_URI" ]] || { echo "MONGO_URI is required"; exit 1; }

collections=$(mongosh "$MONGO_URI" --quiet --eval 'db.getSiblingDB("hydro_raw").getCollectionNames().join("\n")')
for required in document record user storage domain.user user.group; do
  echo "$collections" | grep -qx "$required" || { echo "missing collection: $required"; exit 1; }
done

echo "restore live smoke check passed"
