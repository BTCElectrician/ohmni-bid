#!/usr/bin/env bash
set -euo pipefail

npm run pricing:extract
npm run pricing:import
npm run embeddings:backfill
python3 scripts/pricing/price_sync_monitor.py --mark-synced
