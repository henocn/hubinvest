#!/usr/bin/env bash
# Sauvegarde quotidienne de la base HubInvest, compressée et datée, gardée 14 jours.
# À installer sur le VPS (une seule fois) :
#   chmod +x /var/www/hubinvest/deploy/backup-db.sh
#   crontab -e   puis ajouter :
#   15 3 * * * /var/www/hubinvest/deploy/backup-db.sh >> /var/log/hubinvest-backup.log 2>&1
# Restauration : gunzip -c <fichier>.sql.gz | psql -h <hôte> -U <utilisateur> <base>
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/hubinvest}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/hubinvest}"
KEEP_DAYS="${KEEP_DAYS:-14}"

# Lit uniquement les variables de connexion dans le .env du backend.
read_env() { grep -E "^$1=" "$APP_DIR/backend/.env" | tail -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//'; }

DB_HOST="$(read_env DB_HOST)"; DB_HOST="${DB_HOST:-localhost}"
DB_PORT="$(read_env DB_PORT)"; DB_PORT="${DB_PORT:-5432}"
DB_NAME="$(read_env DB_NAME)"; DB_NAME="${DB_NAME:-hubinvest}"
DB_USER="$(read_env DB_USER)"
export PGPASSWORD="$(read_env DB_PASSWORD)"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
FILE="$BACKUP_DIR/hubinvest-$(date +%Y-%m-%d_%H%M).sql.gz"

pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" --no-owner --no-privileges "$DB_NAME" | gzip -9 > "$FILE"
chmod 600 "$FILE"
find "$BACKUP_DIR" -name 'hubinvest-*.sql.gz' -mtime +"$KEEP_DAYS" -delete

echo "$(date '+%F %T') sauvegarde : $FILE ($(du -h "$FILE" | cut -f1))"
