#!/usr/bin/env bash
# Addis Photography Studio - Production Restore Script
# Usage: ./scripts/restore.sh <db_backup.sql.gz> [media_backup.tar.gz]

set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <path_to_db_backup.sql.gz> [path_to_media_backup.tar.gz]"
  exit 1
fi

DB_BACKUP_FILE="$1"
MEDIA_BACKUP_FILE="${2:-}"
DATABASE_NAME="${POSTGRES_DB:-addis_photography}"
DB_USER="${POSTGRES_USER:-addis_admin}"
DB_CONTAINER="${DB_CONTAINER:-addis_photography_db}"
MEDIA_DIR="${MEDIA_STORAGE_PATH:-./data/media}"

if [ ! -f "${DB_BACKUP_FILE}" ]; then
  echo "ERROR: Database backup file '${DB_BACKUP_FILE}' does not exist."
  exit 1
fi

echo "=================================================="
echo "Starting Addis Photography System Restore"
echo "Target DB: ${DATABASE_NAME}"
echo "=================================================="

# 1. Restore Database Dump
echo "[1/2] Restoring database from ${DB_BACKUP_FILE}..."
if docker ps -q -f name="${DB_CONTAINER}" | grep -q .; then
  gunzip -c "${DB_BACKUP_FILE}" | docker exec -i "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${DATABASE_NAME}"
elif command -v psql &> /dev/null; then
  gunzip -c "${DB_BACKUP_FILE}" | psql -U "${DB_USER}" -d "${DATABASE_NAME}"
else
  echo "ERROR: Neither Docker container '${DB_CONTAINER}' nor psql command found."
  exit 1
fi
echo "Database restored successfully."

# 2. Restore Media Archive
if [ -n "${MEDIA_BACKUP_FILE}" ] && [ -f "${MEDIA_BACKUP_FILE}" ]; then
  echo "[2/2] Restoring media files from ${MEDIA_BACKUP_FILE}..."
  mkdir -p "${MEDIA_DIR}"
  tar -xzf "${MEDIA_BACKUP_FILE}" -C "$(dirname "${MEDIA_DIR}")"
  echo "Media files restored successfully."
else
  echo "No media archive provided or file not found. Skipping media restoration."
fi

echo "=================================================="
echo "Restore operation finished successfully at $(date)!"
echo "=================================================="
