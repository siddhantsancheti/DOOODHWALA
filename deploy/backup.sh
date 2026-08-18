#!/bin/bash
# Daily database backup. Run by dooodhwala-backup.timer, not by hand.
#
# Reads DATABASE_URL from the app's .env — one source of truth, so the backup
# can never quietly point at a different database than the app.
#
# Exits non-zero on any failure so systemd records it and the healthcheck can
# report it. A backup script that fails silently is worse than none, because
# you stop checking.

set -euo pipefail

APP_DIR="${APP_DIR:-/home/dooodhwala/DOOODHWALA}"
BACKUP_DIR="${BACKUP_DIR:-/home/dooodhwala/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
STAMP="$(date +%Y%m%d_%H%M%S)"
OUT="$BACKUP_DIR/dooodhwala_${STAMP}.sql.gz"

# DATABASE_URL lives in the app's .env (chmod 600). Pull just that line rather
# than sourcing the file, so nothing else in it gets executed.
if [ -z "${DATABASE_URL:-}" ]; then
    DATABASE_URL="$(grep -E '^DATABASE_URL=' "$APP_DIR/.env" | head -1 | cut -d= -f2-)"
    DATABASE_URL="${DATABASE_URL%\"}"
    DATABASE_URL="${DATABASE_URL#\"}"
fi

if [ -z "$DATABASE_URL" ]; then
    echo "FATAL: DATABASE_URL not set and not found in $APP_DIR/.env" >&2
    exit 1
fi

mkdir -p "$BACKUP_DIR"

echo "Backing up to $OUT"
pg_dump --no-owner --no-privileges --format=plain "$DATABASE_URL" | gzip -9 > "$OUT"

# A dump that "succeeded" but produced nothing is the failure mode that goes
# unnoticed for months. Check the file is real before trusting it.
SIZE=$(stat -c%s "$OUT")
if [ "$SIZE" -lt 1024 ]; then
    echo "FATAL: backup is only ${SIZE} bytes — treating as failed" >&2
    rm -f "$OUT"
    exit 1
fi

# Verify the gzip stream is intact, so a truncated write is caught now rather
# than on the day you need to restore.
gzip -t "$OUT"

# Confirm the dump actually contains the tables, not just an error message.
#
# grep -c, not grep -q: -q exits on the first match, which breaks the pipe
# feeding it, and under `pipefail` that reads as a failed check — so a good
# backup was being reported as empty and deleted, precisely because it found
# tables straight away. -c consumes the whole stream and cannot SIGPIPE.
if [ "$(gunzip -c "$OUT" | grep -c 'CREATE TABLE' || true)" -eq 0 ]; then
    echo "FATAL: backup contains no CREATE TABLE statements" >&2
    rm -f "$OUT"
    exit 1
fi

echo "OK: $(du -h "$OUT" | cut -f1)"

# Optional off-box copy. A backup sitting on the same VM as the database is
# not a backup — it dies with the box. Set BACKUP_REMOTE to an rclone target
# (e.g. gdrive:dooodhwala-backups) to keep a copy somewhere else.
if [ -n "${BACKUP_REMOTE:-}" ] && command -v rclone >/dev/null; then
    echo "Copying to $BACKUP_REMOTE"
    rclone copy "$OUT" "$BACKUP_REMOTE" && echo "OK: off-box copy done"
fi

# Rotate, but only after a successful backup — never delete yesterday's copy
# on a day the new one failed.
find "$BACKUP_DIR" -name 'dooodhwala_*.sql.gz' -mtime "+$RETENTION_DAYS" -delete
echo "Kept $(ls -1 "$BACKUP_DIR"/dooodhwala_*.sql.gz 2>/dev/null | wc -l) backup(s)"
