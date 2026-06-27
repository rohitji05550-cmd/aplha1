#!/usr/bin/env bash
# Build a downloadable zip of the SmartSetupUAE codebase.
# Excludes node_modules, .git, build artefacts, lockfile-only caches.
# Output: /app/smartsetupuae-latest.zip (also a dated copy in /app/dist/)
set -euo pipefail

OUTPUT_DIR="/app/dist"
mkdir -p "$OUTPUT_DIR"

LATEST_ZIP="/app/smartsetupuae-latest.zip"
DATE_TAG=$(date +%Y%m%d_%H%M%S)
DATED_ZIP="$OUTPUT_DIR/smartsetupuae_${DATE_TAG}.zip"

cd /app
rm -f "$LATEST_ZIP"

zip -r -q "$LATEST_ZIP" . \
    -x "*/node_modules/*" \
    -x "node_modules/*" \
    -x "*/.git/*" \
    -x ".git/*" \
    -x ".git*" \
    -x "*/.next/*" \
    -x "frontend/build/*" \
    -x "frontend/dist/*" \
    -x ".yarn/*" \
    -x "*/yarn.lock" \
    -x ".cache/*" \
    -x "dist/*" \
    -x "tests/__pycache__/*" \
    -x "backend/__pycache__/*" \
    -x "*.pyc" \
    -x "*.log" \
    -x "test_reports/*" \
    -x ".emergent/*" \
    -x "backend/.env" \
    -x "frontend/.env" \
    -x ".env" \
    -x "*/.env" \
    -x "*/.env.*" \
    -x ".env.*"

# Always include example .env files so devs know what variables to set
cp /app/backend/.env /tmp/.env.backend.example 2>/dev/null && \
    sed -i 's/=".*"/="<REDACTED>"/g' /tmp/.env.backend.example && \
    (cd /tmp && zip -q "$LATEST_ZIP" .env.backend.example) || true
cp /app/frontend/.env /tmp/.env.frontend.example 2>/dev/null && \
    sed -i 's/=.*/=<REDACTED>/g' /tmp/.env.frontend.example && \
    (cd /tmp && zip -q "$LATEST_ZIP" .env.frontend.example) || true

cp "$LATEST_ZIP" "$DATED_ZIP"
size=$(du -h "$LATEST_ZIP" | cut -f1)

echo ""
echo "============================================================"
echo "✅  ZIP READY"
echo "  Latest  : $LATEST_ZIP ($size)"
echo "  Dated   : $DATED_ZIP"
echo ""
echo "Download by opening the file in the Emergent file explorer,"
echo "or fetch via SSH:  scp app:$LATEST_ZIP ."
echo "============================================================"
