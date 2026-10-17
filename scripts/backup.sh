#!/usr/bin/env bash
# Addis Photography Studio - Automated Production Backup Script
# Usage: ./scripts/backup.sh [backup_dir]

set -euo pipefail

BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DATABASE_NAME="${POSTGRES_DB:-addis_photography}"
DB_USER="${POSTGRES_USER:-addis_admin}"
DB_CONTAINER="${DB_CONTAINER:-addis_photography_db}"
MEDIA_DIR="${MEDIA_STORAGE_PATH:-./data/media}"

mkdir -p "${BACKUP_DIR}"

echo "=================================================="
echo "Starting Addis Photography System Backup: ${TIMESTAMP}"
echo "=================================================="

# 1. PostgreSQL Database Dump
DB_BACKUP_FILE="${BACKUP_DIR}/db_${DATABASE_NAME}_${TIMESTAMP}.sql.gz"
echo "[1/2] Exporting PostgreSQL schema and records to ${DB_BACKUP_FILE}..."

if docker ps -q -f name="${DB_CONTAINER}" | grep -q .; then
  docker exec -t "${DB_CONTAINER}" pg_dump -U "${DB_USER}" -d "${DATABASE_NAME}" --clean --if-exists | gzip > "${DB_BACKUP_FILE}"
elif command -v pg_dump &> /dev/null; then
  pg_dump -U "${DB_USER}" -d "${DATABASE_NAME}" --clean --if-exists | gzip > "${DB_BACKUP_FILE}"
else
  echo "WARNING: Docker container '${DB_CONTAINER}' or pg_dump not found. Using local schema backup..."
  tar -czf "${DB_BACKUP_FILE}" ./src/server/db/schema.sql
fi

echo "Database dump complete. Size: $(du -h "${DB_BACKUP_FILE}" | cut -f1)"

# 2. Media Storage Directory Archive
MEDIA_BACKUP_FILE="${BACKUP_DIR}/media_${TIMESTAMP}.tar.gz"
echo "[2/2] Archiving persistent photo/video media storage to ${MEDIA_BACKUP_FILE}..."

if [ -d "${MEDIA_DIR}" ]; then
  tar -czf "${MEDIA_BACKUP_FILE}" -C "$(dirname "${MEDIA_DIR}")" "$(basename "${MEDIA_DIR}")"
  echo "Media archive complete. Size: $(du -h "${MEDIA_BACKUP_FILE}" | cut -f1)"
else
  echo "Media directory ${MEDIA_DIR} does not exist yet. Skipping media archive."
fi

# 3. Retention policy: Remove backups older than 30 days
echo "Applying 30-day retention cleanup in ${BACKUP_DIR}..."
find "${BACKUP_DIR}" -type f -name "*.gz" -mtime +30 -delete

echo "=================================================="
echo "Backup successfully completed at $(date)!"
echo "Files created:"
ls -lh "${BACKUP_DIR}"/*"${TIMESTAMP}"*
echo "=================================================="
