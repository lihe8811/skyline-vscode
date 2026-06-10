#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKUP_DUMP_DIR="${BACKUP_DUMP_DIR:-$REPO_ROOT/backup/dump/hydro}"
MONGO_URI="${MONGO_URI:-}"

show_help() {
  cat <<USAGE
Usage: $0 [--dry-run] [--uri <mongodb-uri>] [--backup-dir <path>]

Options:
  --dry-run            Print the mongorestore command only.
  --uri <uri>          MongoDB URI (overrides MONGO_URI env).
  --backup-dir <path>  Path to hydro dump directory (default: $BACKUP_DUMP_DIR).
USAGE
}

DRY_RUN=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --uri)
      MONGO_URI="${2:-}"
      shift 2
      ;;
    --backup-dir)
      BACKUP_DUMP_DIR="${2:-}"
      shift 2
      ;;
    -h|--help)
      show_help
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      show_help
      exit 1
      ;;
  esac
done

[[ -d "$BACKUP_DUMP_DIR" ]] || { echo "Backup dump directory not found: $BACKUP_DUMP_DIR" >&2; exit 1; }

CMD=(mongorestore)
if [[ -n "$MONGO_URI" ]]; then
  CMD+=(--uri "$MONGO_URI")
fi
CMD+=(--nsFrom 'hydro.*' --nsTo 'hydro_raw.*' "$BACKUP_DUMP_DIR")

if [[ "$DRY_RUN" == "1" ]]; then
  printf '%q ' "${CMD[@]}"
  printf '\n'
  exit 0
fi

command -v mongorestore >/dev/null 2>&1 || { echo "mongorestore command not found" >&2; exit 1; }
[[ -n "$MONGO_URI" ]] || { echo "MONGO_URI must be set for live restore" >&2; exit 1; }

"${CMD[@]}"
echo "Restore completed into hydro_raw"
