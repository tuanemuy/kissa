#!/bin/bash

# Kissa Backup Script
# This script performs database backups and uploads them to S3

set -euo pipefail

# Configuration
DATABASE_URL="${DATABASE_URL:-}"
S3_BUCKET="${BACKUP_S3_BUCKET:-kissa-backups}"
AWS_REGION="${AWS_REGION:-us-east-1}"
BACKUP_TYPE="${1:-full}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

# Paths
BACKUP_DIR="/tmp/kissa-backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="kissa_${BACKUP_TYPE}_${DATE}.sql"
COMPRESSED_FILE="${BACKUP_FILE}.gz"

# Logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >&2
}

# Error handling
error_exit() {
    log "ERROR: $1"
    exit 1
}

# Check dependencies
check_dependencies() {
    log "Checking dependencies..."
    
    command -v pg_dump >/dev/null 2>&1 || error_exit "pg_dump not found"
    command -v gzip >/dev/null 2>&1 || error_exit "gzip not found"
    command -v aws >/dev/null 2>&1 || error_exit "AWS CLI not found"
    
    if [ -z "$DATABASE_URL" ]; then
        error_exit "DATABASE_URL environment variable not set"
    fi
}

# Create backup directory
setup_backup_dir() {
    log "Setting up backup directory..."
    mkdir -p "$BACKUP_DIR"
    cd "$BACKUP_DIR"
}

# Perform database backup
backup_database() {
    log "Starting $BACKUP_TYPE backup..."
    
    case "$BACKUP_TYPE" in
        "full")
            pg_dump "$DATABASE_URL" \
                --format=custom \
                --verbose \
                --no-password \
                --file="$BACKUP_FILE" \
                || error_exit "Database backup failed"
            ;;
        "incremental")
            # For incremental backups, you would need WAL archiving
            # This is a simplified approach
            pg_dump "$DATABASE_URL" \
                --format=custom \
                --verbose \
                --no-password \
                --file="$BACKUP_FILE" \
                || error_exit "Incremental backup failed"
            ;;
        *)
            error_exit "Unknown backup type: $BACKUP_TYPE"
            ;;
    esac
    
    log "Database backup completed: $BACKUP_FILE"
}

# Compress backup
compress_backup() {
    log "Compressing backup..."
    gzip "$BACKUP_FILE" || error_exit "Compression failed"
    log "Backup compressed: $COMPRESSED_FILE"
}

# Calculate checksum
calculate_checksum() {
    log "Calculating checksum..."
    CHECKSUM=$(sha256sum "$COMPRESSED_FILE" | cut -d' ' -f1)
    echo "$CHECKSUM" > "${COMPRESSED_FILE}.sha256"
    log "Checksum: $CHECKSUM"
}

# Upload to S3
upload_to_s3() {
    log "Uploading to S3..."
    
    S3_PATH="s3://$S3_BUCKET/$(date +%Y/%m/%d)/$COMPRESSED_FILE"
    CHECKSUM_PATH="s3://$S3_BUCKET/$(date +%Y/%m/%d)/${COMPRESSED_FILE}.sha256"
    
    aws s3 cp "$COMPRESSED_FILE" "$S3_PATH" \
        --region "$AWS_REGION" \
        --storage-class STANDARD_IA \
        || error_exit "Failed to upload backup to S3"
    
    aws s3 cp "${COMPRESSED_FILE}.sha256" "$CHECKSUM_PATH" \
        --region "$AWS_REGION" \
        || error_exit "Failed to upload checksum to S3"
    
    log "Backup uploaded to: $S3_PATH"
}

# Cleanup local files
cleanup() {
    log "Cleaning up local files..."
    rm -f "$BACKUP_DIR/$COMPRESSED_FILE"
    rm -f "$BACKUP_DIR/${COMPRESSED_FILE}.sha256"
    rmdir "$BACKUP_DIR" 2>/dev/null || true
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up old backups (retention: $RETENTION_DAYS days)..."
    
    CUTOFF_DATE=$(date -d "$RETENTION_DAYS days ago" +%Y-%m-%d)
    
    aws s3 ls "s3://$S3_BUCKET/" --recursive \
        | awk '{print $1, $2, $4}' \
        | while read -r date time file; do
            if [[ "$date" < "$CUTOFF_DATE" ]]; then
                log "Deleting old backup: $file"
                aws s3 rm "s3://$S3_BUCKET/$file" || log "Warning: Failed to delete $file"
            fi
        done
}

# Verify backup
verify_backup() {
    log "Verifying backup integrity..."
    
    # Download and verify checksum
    TEMP_FILE="/tmp/verify_$(basename $COMPRESSED_FILE)"
    TEMP_CHECKSUM="/tmp/verify_$(basename $COMPRESSED_FILE).sha256"
    
    aws s3 cp "$S3_PATH" "$TEMP_FILE" || error_exit "Failed to download backup for verification"
    aws s3 cp "$CHECKSUM_PATH" "$TEMP_CHECKSUM" || error_exit "Failed to download checksum for verification"
    
    EXPECTED_CHECKSUM=$(cat "$TEMP_CHECKSUM")
    ACTUAL_CHECKSUM=$(sha256sum "$TEMP_FILE" | cut -d' ' -f1)
    
    if [ "$EXPECTED_CHECKSUM" = "$ACTUAL_CHECKSUM" ]; then
        log "Backup verification successful"
    else
        error_exit "Backup verification failed: checksum mismatch"
    fi
    
    # Cleanup verification files
    rm -f "$TEMP_FILE" "$TEMP_CHECKSUM"
}

# Send notification
send_notification() {
    local status="$1"
    local message="$2"
    
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"Kissa Backup $status: $message\"}" \
            "$SLACK_WEBHOOK_URL" || log "Warning: Failed to send Slack notification"
    fi
    
    if [ -n "${EMAIL_RECIPIENT:-}" ]; then
        echo "$message" | mail -s "Kissa Backup $status" "$EMAIL_RECIPIENT" || log "Warning: Failed to send email notification"
    fi
}

# Main execution
main() {
    log "Starting Kissa backup process..."
    
    check_dependencies
    setup_backup_dir
    
    trap cleanup EXIT
    
    backup_database
    compress_backup
    calculate_checksum
    upload_to_s3
    verify_backup
    cleanup_old_backups
    
    send_notification "SUCCESS" "Backup completed successfully: $S3_PATH"
    log "Backup process completed successfully"
}

# Error handling
trap 'send_notification "FAILED" "Backup process failed"; cleanup; exit 1' ERR

# Run main function
main "$@"