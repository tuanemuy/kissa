#!/bin/bash

# Kissa Restore Script
# This script restores database backups from S3

set -euo pipefail

# Configuration
DATABASE_URL="${DATABASE_URL:-}"
S3_BUCKET="${BACKUP_S3_BUCKET:-kissa-backups}"
AWS_REGION="${AWS_REGION:-us-east-1}"
BACKUP_FILE="$1"
TARGET_DATABASE="${2:-}"

# Paths
RESTORE_DIR="/tmp/kissa-restore"
DOWNLOADED_FILE=""
DECOMPRESSED_FILE=""

# Logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >&2
}

# Error handling
error_exit() {
    log "ERROR: $1"
    exit 1
}

# Show usage
usage() {
    echo "Usage: $0 <backup_file> [target_database_url]"
    echo ""
    echo "Examples:"
    echo "  $0 s3://kissa-backups/2024/01/15/kissa_full_20240115_020000.sql.gz"
    echo "  $0 s3://kissa-backups/2024/01/15/kissa_full_20240115_020000.sql.gz postgresql://user:pass@localhost/kissa_restored"
    echo ""
    exit 1
}

# Check arguments
check_arguments() {
    if [ $# -lt 1 ]; then
        usage
    fi
    
    if [ -z "$BACKUP_FILE" ]; then
        error_exit "Backup file not specified"
    fi
    
    if [ -z "$TARGET_DATABASE" ]; then
        TARGET_DATABASE="$DATABASE_URL"
    fi
    
    if [ -z "$TARGET_DATABASE" ]; then
        error_exit "Target database URL not specified and DATABASE_URL not set"
    fi
}

# Check dependencies
check_dependencies() {
    log "Checking dependencies..."
    
    command -v pg_restore >/dev/null 2>&1 || error_exit "pg_restore not found"
    command -v gunzip >/dev/null 2>&1 || error_exit "gunzip not found"
    command -v aws >/dev/null 2>&1 || error_exit "AWS CLI not found"
}

# Create restore directory
setup_restore_dir() {
    log "Setting up restore directory..."
    mkdir -p "$RESTORE_DIR"
    cd "$RESTORE_DIR"
}

# Download backup from S3
download_backup() {
    log "Downloading backup from S3..."
    
    DOWNLOADED_FILE="$RESTORE_DIR/$(basename "$BACKUP_FILE")"
    CHECKSUM_FILE="${DOWNLOADED_FILE}.sha256"
    
    aws s3 cp "$BACKUP_FILE" "$DOWNLOADED_FILE" \
        --region "$AWS_REGION" \
        || error_exit "Failed to download backup from S3"
    
    aws s3 cp "${BACKUP_FILE}.sha256" "$CHECKSUM_FILE" \
        --region "$AWS_REGION" \
        || log "Warning: Checksum file not found, skipping verification"
    
    log "Backup downloaded: $DOWNLOADED_FILE"
}

# Verify backup integrity
verify_backup() {
    CHECKSUM_FILE="${DOWNLOADED_FILE}.sha256"
    
    if [ -f "$CHECKSUM_FILE" ]; then
        log "Verifying backup integrity..."
        
        EXPECTED_CHECKSUM=$(cat "$CHECKSUM_FILE")
        ACTUAL_CHECKSUM=$(sha256sum "$DOWNLOADED_FILE" | cut -d' ' -f1)
        
        if [ "$EXPECTED_CHECKSUM" = "$ACTUAL_CHECKSUM" ]; then
            log "Backup verification successful"
        else
            error_exit "Backup verification failed: checksum mismatch"
        fi
    else
        log "Warning: No checksum file found, skipping verification"
    fi
}

# Decompress backup
decompress_backup() {
    if [[ "$DOWNLOADED_FILE" == *.gz ]]; then
        log "Decompressing backup..."
        
        DECOMPRESSED_FILE="${DOWNLOADED_FILE%.gz}"
        gunzip -c "$DOWNLOADED_FILE" > "$DECOMPRESSED_FILE" \
            || error_exit "Decompression failed"
        
        log "Backup decompressed: $DECOMPRESSED_FILE"
    else
        DECOMPRESSED_FILE="$DOWNLOADED_FILE"
        log "Backup is not compressed, using as-is"
    fi
}

# Check target database connection
check_database_connection() {
    log "Checking target database connection..."
    
    psql "$TARGET_DATABASE" -c "SELECT 1;" >/dev/null 2>&1 \
        || error_exit "Cannot connect to target database"
    
    log "Database connection successful"
}

# Create confirmation prompt
confirm_restore() {
    log "Target database: $TARGET_DATABASE"
    log "Backup file: $BACKUP_FILE"
    
    if [ "${FORCE_RESTORE:-}" != "true" ]; then
        echo ""
        echo "WARNING: This will restore the database and may overwrite existing data!"
        echo "Are you sure you want to continue? (yes/no)"
        read -r confirmation
        
        if [ "$confirmation" != "yes" ]; then
            log "Restore cancelled by user"
            exit 0
        fi
    fi
}

# Create database backup before restore
backup_current_database() {
    if [ "${SKIP_CURRENT_BACKUP:-}" != "true" ]; then
        log "Creating backup of current database before restore..."
        
        CURRENT_BACKUP="$RESTORE_DIR/pre_restore_backup_$(date +%Y%m%d_%H%M%S).sql"
        
        pg_dump "$TARGET_DATABASE" \
            --format=custom \
            --verbose \
            --no-password \
            --file="$CURRENT_BACKUP" \
            || log "Warning: Failed to backup current database"
        
        if [ -f "$CURRENT_BACKUP" ]; then
            log "Current database backed up to: $CURRENT_BACKUP"
        fi
    fi
}

# Restore database
restore_database() {
    log "Starting database restore..."
    
    # Drop and recreate database (if specified)
    if [ "${RECREATE_DATABASE:-}" = "true" ]; then
        DB_NAME=$(echo "$TARGET_DATABASE" | sed 's/.*\///' | sed 's/?.*//')
        log "Recreating database: $DB_NAME"
        
        # This is a simplified approach - in production you'd want more sophisticated handling
        psql "$TARGET_DATABASE" -c "DROP DATABASE IF EXISTS $DB_NAME;" || true
        psql "$TARGET_DATABASE" -c "CREATE DATABASE $DB_NAME;" || true
    fi
    
    # Restore the backup
    pg_restore \
        --dbname="$TARGET_DATABASE" \
        --verbose \
        --clean \
        --if-exists \
        --no-owner \
        --no-privileges \
        "$DECOMPRESSED_FILE" \
        || error_exit "Database restore failed"
    
    log "Database restore completed successfully"
}

# Verify restore
verify_restore() {
    log "Verifying restore..."
    
    # Basic verification - check if tables exist and have data
    TABLE_COUNT=$(psql "$TARGET_DATABASE" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null || echo "0")
    
    if [ "$TABLE_COUNT" -gt 0 ]; then
        log "Restore verification: $TABLE_COUNT tables found"
    else
        error_exit "Restore verification failed: no tables found"
    fi
    
    # Check for specific core tables
    CORE_TABLES=("users" "regions" "locations" "check_ins")
    for table in "${CORE_TABLES[@]}"; do
        EXISTS=$(psql "$TARGET_DATABASE" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$table');" 2>/dev/null || echo "f")
        if [ "$EXISTS" = "t" ]; then
            log "Core table '$table' exists"
        else
            log "Warning: Core table '$table' not found"
        fi
    done
}

# Cleanup
cleanup() {
    log "Cleaning up temporary files..."
    rm -rf "$RESTORE_DIR"
}

# Send notification
send_notification() {
    local status="$1"
    local message="$2"
    
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"Kissa Restore $status: $message\"}" \
            "$SLACK_WEBHOOK_URL" || log "Warning: Failed to send Slack notification"
    fi
    
    if [ -n "${EMAIL_RECIPIENT:-}" ]; then
        echo "$message" | mail -s "Kissa Restore $status" "$EMAIL_RECIPIENT" || log "Warning: Failed to send email notification"
    fi
}

# Main execution
main() {
    log "Starting Kissa restore process..."
    
    check_arguments "$@"
    check_dependencies
    setup_restore_dir
    
    trap cleanup EXIT
    
    download_backup
    verify_backup
    decompress_backup
    check_database_connection
    confirm_restore
    backup_current_database
    restore_database
    verify_restore
    
    send_notification "SUCCESS" "Database restore completed successfully from $BACKUP_FILE"
    log "Restore process completed successfully"
}

# Error handling
trap 'send_notification "FAILED" "Restore process failed"; cleanup; exit 1' ERR

# Run main function
main "$@"