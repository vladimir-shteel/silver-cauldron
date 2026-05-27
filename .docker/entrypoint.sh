#!/bin/sh
# Patch settings/banshee.conf from environment variables at container start.
# This lets native dev keep settings/banshee.conf with DB_HOSTNAME=localhost
# while Docker overrides credentials without touching the file on disk.

set -e

CONF=/var/www/html/settings/banshee.conf

patch_setting() {
    key="$1"
    val="$2"
    if [ -n "$val" ]; then
        sed -i "s|^${key} = .*|${key} = ${val}|" "$CONF"
    fi
}

patch_setting DB_HOSTNAME "$DB_HOSTNAME"
patch_setting DB_DATABASE "$DB_DATABASE"
patch_setting DB_USERNAME "$DB_USERNAME"
patch_setting DB_PASSWORD "$DB_PASSWORD"

exec apache2-foreground
