#!/usr/bin/env bash
# Stop the prod stack, pull the latest code from GitHub, then start it back up.
# Skips the pull when tracked files have local changes, so it can't conflict with them.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

./scripts/stop.sh

if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "==> Local changes detected - skipping git pull"
else
  git pull
fi

./scripts/start.sh
