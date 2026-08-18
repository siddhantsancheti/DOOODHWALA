#!/bin/bash
# Deploy the latest main. Safe to re-run.
#
#   sudo -iu dooodhwala /home/dooodhwala/DOOODHWALA/deploy/update.sh
#   sudo systemctl restart dooodhwala
#
# Builds BEFORE restarting, so a broken build leaves the running server alone
# instead of taking the app down while you debug.
set -euo pipefail
cd "${APP_DIR:-/home/dooodhwala/DOOODHWALA}"

echo "==> Backing up before deploying"
./deploy/backup.sh

echo "==> Pulling main"
git fetch origin
git checkout main
git pull --ff-only origin main

echo "==> Installing"
# Full install, including devDependencies: vite, esbuild and drizzle-kit are
# all dev deps and all needed by the build and migration steps below.
npm ci || npm install

echo "==> Building"
# Node caps its own heap at roughly half of RAM, so on the 1 GB shape Vite dies
# at ~500 MB with "heap out of memory" while the machine still has swap free.
# Raising the cap lets it spill into swap instead of aborting. Slow, but it
# finishes.
NODE_OPTIONS="--max-old-space-size=2048" npm run build

# Schema changes are NOT applied automatically. `drizzle-kit push` diffs the
# whole schema, prompts interactively, and on this database offers to rename
# app_config — the table every installed phone reads its server address from.
# That must never run unattended. Apply changes deliberately instead:
#
#   psql "$DATABASE_URL" -f migrations/apply-v29.sql
echo "==> Schema: apply migrations/*.sql by hand if this release needs them"

echo
echo "Build OK. Now run:  sudo systemctl restart dooodhwala"
