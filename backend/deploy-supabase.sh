#!/usr/bin/env bash
# Deploy Veldryn Supabase migrations + the gameplay/coop Edge Functions to
# staging, let you verify, then (on explicit confirmation) to production.
#
# This script performs the deploy; it does NOT generate the Edge bundle. Run the
# bundle build first (pnpm --dir backend build:online) and commit it, so the
# committed, verified bundle is what ships. Requires the Supabase CLI and a prior
# `supabase login` (or SUPABASE_ACCESS_TOKEN in the environment). Never commit
# tokens; pass them through the environment.
#
# Usage:
#   backend/deploy-supabase.sh staging      # staging only
#   backend/deploy-supabase.sh production   # staging, verify, then production
#   backend/deploy-supabase.sh production --functions-only   # skip db push
set -euo pipefail

STAGING_REF="iqfmmpvwanvvmxcftfxw"
PRODUCTION_REF="nyjwigipamnvpdvpauuv"
FUNCTIONS=("gameplay" "coop")

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SUPABASE_DIR="$ROOT/backend/supabase"
TARGET="${1:-}"
FUNCTIONS_ONLY="false"
[[ "${2:-}" == "--functions-only" ]] && FUNCTIONS_ONLY="true"

if [[ "$TARGET" != "staging" && "$TARGET" != "production" ]]; then
  echo "Usage: $0 <staging|production> [--functions-only]" >&2
  exit 2
fi

sb() { npx --yes supabase "$@"; }

verify_bundle() {
  echo "==> Verifying committed gameplay Edge bundle matches the shared engine"
  node "$ROOT/tools/verify-gameplay-edge.mjs"
}

deploy_env() {
  local ref="$1" name="$2"
  echo
  echo "==> [$name] linking project $ref"
  sb link --project-ref "$ref" --workdir "$SUPABASE_DIR"
  if [[ "$FUNCTIONS_ONLY" != "true" ]]; then
    echo "==> [$name] applying migrations (db push)"
    sb db push --workdir "$SUPABASE_DIR"
  fi
  for fn in "${FUNCTIONS[@]}"; do
    echo "==> [$name] deploying function: $fn"
    sb functions deploy "$fn" --project-ref "$ref" --workdir "$SUPABASE_DIR"
  done
  echo "==> [$name] done"
}

verify_bundle
deploy_env "$STAGING_REF" "STAGING"

if [[ "$TARGET" == "production" ]]; then
  echo
  echo "Staging deploy complete. Verify staging (Guild Skills snapshot, upgrade"
  echo "gating, Guild Bank deposits, Projects load) before continuing."
  read -r -p "Type 'DEPLOY PRODUCTION' to apply to production ($PRODUCTION_REF): " CONFIRM
  if [[ "$CONFIRM" != "DEPLOY PRODUCTION" ]]; then
    echo "Aborted; production untouched." >&2
    exit 1
  fi
  deploy_env "$PRODUCTION_REF" "PRODUCTION"
fi

echo
echo "All requested deploys finished."
