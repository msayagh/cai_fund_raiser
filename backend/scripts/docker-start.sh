#!/bin/sh
set -eu

normalize_quoted_value() {
  value="$1"
  case "$value" in
    \"*\") value="${value#\"}"; value="${value%\"}" ;;
    \'*\') value="${value#\'}"; value="${value%\'}" ;;
  esac
  printf '%s' "$value"
}

mkdir -p /app/data /app/uploads /app/logs

if [ -n "${DATABASE_URL:-}" ]; then
  DATABASE_URL="$(normalize_quoted_value "$DATABASE_URL")"
  export DATABASE_URL
fi

if [ -n "${SQLITE_DATABASE_URL:-}" ]; then
  SQLITE_DATABASE_URL="$(normalize_quoted_value "$SQLITE_DATABASE_URL")"
  export SQLITE_DATABASE_URL
fi

if [ "${DB_PROVIDER:-sqlite}" = "sqlite" ]; then
  if [ -z "${DATABASE_URL:-}" ] && { [ -z "${SQLITE_DATABASE_URL:-}" ] || [ "${SQLITE_DATABASE_URL}" = "file:./dev.db" ]; }; then
    export SQLITE_DATABASE_URL="file:/app/data/dev.db"
  fi
fi

if [ "${RUN_DB_MIGRATE:-true}" = "true" ]; then
  echo "Applying database schema (db push)..."
  npm run db:push
fi

exec node server.js
