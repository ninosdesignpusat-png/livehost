#!/usr/bin/env bash
# Script to run LiveHost Pro server
set -e

PORT=${PORT:-8080}
echo "Starting LiveHost Pro Application on http://localhost:${PORT} ..."
python3 -m app.server
