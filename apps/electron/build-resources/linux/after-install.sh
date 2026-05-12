#!/bin/sh
set -e

# Verify chrome-sandbox exists before setting permissions
if [ ! -f /opt/DMS/chrome-sandbox ]; then
  echo "Error: /opt/DMS/chrome-sandbox not found" >&2
  exit 1
fi

chown root:root /opt/DMS/chrome-sandbox
chmod 4755 /opt/DMS/chrome-sandbox
