#!/usr/bin/env bash
# The WebODM checkout in ignored/WebODM, in dev mode, with this repo's plugin mounted (see dev/compose.yml).
#   dev/webodm.sh up | down | logs [service] | ps | <any docker compose command>
# Port 8001 (WO_PORT), livereload 35730 (GJ_LIVERELOAD_PORT); containers gj-webapp, gj-worker, gj-db, ...
set -euo pipefail
repo="$(cd "$(dirname "$0")/.." && pwd)"
webodm="$repo/ignored/WebODM"

export WO_PORT="${WO_PORT:-8001}" GJ_LIVERELOAD_PORT="${GJ_LIVERELOAD_PORT:-35730}"
export WO_HOST=localhost WO_DEBUG=YES WO_DEV=YES WO_BROKER=redis://broker WO_DEFAULT_NODES=1
export WO_MEDIA_DIR=appmedia WO_DB_DIR=dbdata WO_SECRET_KEY="${WO_SECRET_KEY:-}"
export GJ_PLUGIN_DIR="$repo/geojson"

compose=(docker compose -p webodm-geojson --project-directory "$webodm"
         -f "$webodm/docker-compose.yml" -f "$webodm/docker-compose.nodeodm.yml"
         -f "$webodm/docker-compose.dev.yml" -f "$repo/dev/compose.yml")

case "${1:-}" in
    up) shift; exec "${compose[@]}" up -d "$@" ;;
    down) shift; exec "${compose[@]}" down --remove-orphans "$@" ;;
    logs) shift; exec "${compose[@]}" logs -f --tail 100 "$@" ;;
    "") sed -n '2,4p' "$0"; exit 1 ;;
    *) exec "${compose[@]}" "$@" ;;
esac
