#!/bin/bash

# DOOODHWALA Database Backup & Recovery Script
# Automated backup, restore, and disaster recovery procedures

set -e

BACKUP_DIR="${BACKUP_DIR:-./../backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Database configuration from environment
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-dooodhwala}"
DB_USER="${DB_USER:-postgres}"

echo "=========================================="
echo "DOOODHWALA Database Backup & Recovery"
echo "=========================================="
echo ""

# Function: Create backup
backup_database() {
    echo "📦 Creating database backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Full backup
    BACKUP_FILE="$BACKUP_DIR/backup_${DB_NAME}_${TIMESTAMP}.sql"
    BACKUP_FILE_GZ="${BACKUP_FILE}.gz"
    
    PGPASSWORD="$DB_PASSWORD" pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --verbose \
        --format=plain \
        > "$BACKUP_FILE"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Database dumped${NC}"
    else
        echo -e "${RED}❌ Database dump failed${NC}"
        exit 1
    fi
    
    # Compress backup
    gzip "$BACKUP_FILE"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Backup compressed: $BACKUP_FILE_GZ${NC}"
    else
        echo -e "${RED}❌ Compression failed${NC}"
        exit 1
    fi
    
    # Verify backup
    if gunzip -t "$BACKUP_FILE_GZ" 2>/dev/null; then
        echo -e "${GREEN}✓ Backup verified${NC}"
    else
        echo -e "${RED}❌ Backup verification failed${NC}"
        exit 1
    fi
    
    # Calculate size
    SIZE=$(du -h "$BACKUP_FILE_GZ" | cut -f1)
    echo "Backup size: $SIZE"
    
    # Upload to cloud storage (optional)
    if command -v aws &> /dev/null; then
        echo "Uploading to S3..."
        aws s3 cp "$BACKUP_FILE_GZ" \
            "s3://${S3_BUCKET}/backups/dooodhwala_${TIMESTAMP}.sql.gz" \
            --storage-class GLACIER \
            --metadata "timestamp=${TIMESTAMP},database=${DB_NAME}"
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Uploaded to S3${NC}"
        fi
    fi
    
    echo ""
}

# Function: Restore backup
restore_database() {
    BACKUP_FILE="$1"
    
    if [ -z "$BACKUP_FILE" ]; then
        echo -e "${RED}❌ Please provide backup file path${NC}"
        exit 1
    fi
    
    if [ ! -f "$BACKUP_FILE" ]; then
        echo -e "${RED}❌ Backup file not found: $BACKUP_FILE${NC}"
        exit 1
    fi
    
    echo "📥 Restoring database from backup..."
    echo "Backup file: $BACKUP_FILE"
    echo ""
    echo -e "${YELLOW}⚠ WARNING: This will OVERWRITE the current database!${NC}"
    read -p "Are you sure? Type 'yes' to continue: " CONFIRM
    
    if [ "$CONFIRM" != "yes" ]; then
        echo "Restore cancelled"
        exit 0
    fi
    
    # Backup current database first
    echo "Creating safety backup of current database..."
    backup_database
    
    # Determine if file is compressed
    if [[ "$BACKUP_FILE" == *.gz ]]; then
        RESTORE_CMD="gunzip -c $BACKUP_FILE | PGPASSWORD='$DB_PASSWORD' psql"
    else
        RESTORE_CMD="PGPASSWORD='$DB_PASSWORD' psql"
    fi
    
    # Drop connections to database
    echo "Disconnecting users from database..."
    PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d postgres \
        -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '$DB_NAME' AND pid <> pg_backend_pid();"
    
    # Drop and recreate database
    echo "Dropping database..."
    PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d postgres \
        -c "DROP DATABASE IF EXISTS $DB_NAME;"
    
    echo "Creating database..."
    PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d postgres \
        -c "CREATE DATABASE $DB_NAME;"
    
    # Restore from backup
    echo "Restoring data..."
    if [[ "$BACKUP_FILE" == *.gz ]]; then
        gunzip -c "$BACKUP_FILE" | PGPASSWORD="$DB_PASSWORD" psql \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME"
    else
        PGPASSWORD="$DB_PASSWORD" psql \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            < "$BACKUP_FILE"
    fi
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Database restored successfully${NC}"
    else
        echo -e "${RED}❌ Restore failed${NC}"
        exit 1
    fi
    
    echo ""
}

# Function: List backups
list_backups() {
    echo "📋 Available backups:"
    echo ""
    
    if [ ! -d "$BACKUP_DIR" ]; then
        echo "No backups found (backup directory does not exist)"
        return
    fi
    
    ls -lh "$BACKUP_DIR"/*.gz 2>/dev/null | awk '{print $9, "(" $5 ")"}' || echo "No backups found"
    echo ""
}

# Function: Cleanup old backups
cleanup_backups() {
    echo "🧹 Cleaning up old backups (older than $RETENTION_DAYS days)..."
    
    if [ ! -d "$BACKUP_DIR" ]; then
        echo "No backup directory found"
        return
    fi
    
    find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime "+$RETENTION_DAYS" -delete
    
    echo -e "${GREEN}✓ Cleanup complete${NC}"
    echo ""
}

# Function: Verify backups
verify_backups() {
    echo "🔍 Verifying all backups..."
    echo ""
    
    if [ ! -d "$BACKUP_DIR" ]; then
        echo "No backup directory found"
        return
    fi
    
    FAILED=0
    for backup in "$BACKUP_DIR"/backup_*.sql.gz; do
        if [ -f "$backup" ]; then
            echo -n "Checking $(basename "$backup")... "
            if gunzip -t "$backup" 2>/dev/null; then
                echo -e "${GREEN}✓ OK${NC}"
            else
                echo -e "${RED}✗ CORRUPTED${NC}"
                FAILED=$((FAILED + 1))
            fi
        fi
    done
    
    echo ""
    if [ $FAILED -eq 0 ]; then
        echo -e "${GREEN}✓ All backups verified${NC}"
    else
        echo -e "${RED}❌ $FAILED corrupted backups found${NC}"
    fi
    echo ""
}

# Function: Show usage
show_usage() {
    cat << EOF
DOOODHWALA Database Backup & Recovery

Usage: $0 [COMMAND] [OPTIONS]

Commands:
  backup          Create database backup
  restore FILE    Restore from backup file
  list            List all available backups
  cleanup         Remove old backups (30+ days)
  verify          Verify backup integrity
  help            Show this help message

Environment Variables:
  DB_HOST         Database host (default: localhost)
  DB_PORT         Database port (default: 5432)
  DB_NAME         Database name (default: dooodhwala)
  DB_USER         Database user (default: postgres)
  DB_PASSWORD     Database password (required for restore)
  BACKUP_DIR      Backup directory (default: ./backups)
  RETENTION_DAYS  Keep backups for N days (default: 30)
  S3_BUCKET       S3 bucket for cloud backup (optional)

Examples:
  # Create backup
  $0 backup

  # Restore from specific backup
  $0 restore ./backups/backup_dooodhwala_20260127_120000.sql.gz

  # List backups
  $0 list

  # Schedule daily backup with cron
  0 2 * * * /path/to/$0 backup

EOF
}

# Parse command
COMMAND="${1:-help}"

case "$COMMAND" in
    backup)
        backup_database
        cleanup_backups
        ;;
    restore)
        restore_database "$2"
        ;;
    list)
        list_backups
        ;;
    cleanup)
        cleanup_backups
        ;;
    verify)
        verify_backups
        ;;
    help|--help|-h)
        show_usage
        ;;
    *)
        echo -e "${RED}Unknown command: $COMMAND${NC}"
        show_usage
        exit 1
        ;;
esac

echo "=========================================="
echo "Done"
echo "=========================================="
