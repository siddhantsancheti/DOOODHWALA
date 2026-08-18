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
npm run build

echo "==> Applying database migrations"
npm run db:push

echo
echo "Build OK. Now run:  sudo systemctl restart dooodhwala"
