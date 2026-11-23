#!/usr/bin/env bash
# Stop the running stack, pull the latest code, then start it back up.
set -euo pipefail

./scripts/stop.sh && git pull && ./scripts/start.sh
