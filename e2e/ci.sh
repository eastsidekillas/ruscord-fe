#!/usr/bin/env bash
# Runs the e2e smoke against the whole stack in Docker, like `make up-all`:
# ruscord-core (with Postgres, Valkey, NATS, SeaweedFS, LiveKit) and this
# client behind its nginx on http://localhost:8081.
#
#   e2e/ci.sh <ruscord-core dir> [<ruscord-fe dir>]
#   E2E_STAGING=1 e2e/ci.sh ...   the test server's stack instead (ruscord-core
#                                 deploy/staging): HTTPS by Caddy on
#                                 https://localhost with its local certificate
#
# Both CIs call it: ruscord-fe tests itself against ruscord-core main, and
# ruscord-core tests itself against ruscord-fe master. A change that needs
# both sides lands in the one the other already works with first.
set -euo pipefail

core=$(cd "$1" && pwd)
fe=$(cd "${2:-$(dirname "$0")/..}" && pwd)
compose=(docker compose --env-file "$core/.env" -f "$core/deploy/docker-compose.yml")
base=http://localhost:8081
if [ -n "${E2E_STAGING:-}" ]; then
  compose+=(-f "$core/deploy/staging/compose.yml" --profile staging)
  base=https://localhost
  [ -f "$core/.env" ] || { "$core/scripts/gen-env.sh" "$core/deploy/staging/env.example" \
    | sed -e 's/^RUSCORD_DOMAIN=$/RUSCORD_DOMAIN=localhost/' -e 's/^RUSCORD_LIVEKIT_EXTERNAL_IP=.*/RUSCORD_LIVEKIT_EXTERNAL_IP=false/' > "$core/.env"; }
  export E2E_INSECURE=1 # Caddy's local certificate authority
fi
compose+=(--profile app --profile web)

[ -f "$core/.env" ] || "$core/scripts/gen-env.sh" > "$core/.env"
export RUSCORD_FE_DIR="$fe"
# Chromium sends WebRTC media from the machine's own address, from which
# LiveKit's default 127.0.0.1 is unreachable; give LiveKit that address.
export RUSCORD_LIVEKIT_NODE_IP="${RUSCORD_LIVEKIT_NODE_IP:-$(hostname -I | awk '{print $1}')}"

logs() { "${compose[@]}" logs --no-color > "$fe/e2e/failures/stack.log" 2>&1 || true; }
mkdir -p "$fe/e2e/failures"

"${compose[@]}" up -d --build --wait --wait-timeout 180 postgres valkey
"${compose[@]}" up -d --build
for url in http://127.0.0.1:8080/readyz "$base/"; do
  for i in $(seq 1 60); do curl -kfsS -o /dev/null "$url" && break; sleep 2; done
  curl -kfsS -o /dev/null "$url" || { echo "not ready: $url"; logs; exit 1; }
done

cd "$fe"
export E2E_BASE="$base"
export E2E_FIXTURES="$core/internal/platform/imaging/testdata"
# The smoke restarts the core once to check that clients recover.
export E2E_RESTART_CMD="${compose[*]} restart app"
node e2e/smoke.mjs || { logs; exit 1; }
