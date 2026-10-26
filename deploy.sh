#!/usr/bin/env bash
set -euo pipefail

SSH_KEY="${DEPLOY_SSH_KEY:-$HOME/Downloads/school-erp-key.pem}"
SERVER="${DEPLOY_SERVER:-ubuntu@13.233.101.124}"
APP_DIR="${DEPLOY_APP_DIR:-/home/ubuntu/school-erp-backend}"
PM2_NAME="${DEPLOY_PM2_NAME:-school-erp-backend}"
BRANCH="${DEPLOY_BRANCH:-main}"

cd "$(dirname "$0")"

[ -f "$SSH_KEY" ] || { echo "SSH key not found: $SSH_KEY (set DEPLOY_SSH_KEY)"; exit 1; }
chmod 400 "$SSH_KEY"

git fetch --quiet origin "$BRANCH"
LOCAL_SHA="$(git rev-parse HEAD)"
REMOTE_SHA="$(git rev-parse "origin/$BRANCH")"
if [ "$LOCAL_SHA" != "$REMOTE_SHA" ]; then
  echo "Local HEAD ($LOCAL_SHA) is not origin/$BRANCH ($REMOTE_SHA)."
  echo "Push your commits (or pull) first — the server deploys origin/$BRANCH."
  exit 1
fi

echo "Deploying $BRANCH @ ${REMOTE_SHA:0:7} to $SERVER"

ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$SERVER" \
  APP_DIR="$APP_DIR" PM2_NAME="$PM2_NAME" BRANCH="$BRANCH" bash -s <<'REMOTE'
set -euo pipefail
cd "$APP_DIR"

PREVIOUS_SHA="$(git rev-parse HEAD)"

build() {
  if [ ! -d node_modules ] || ! git diff --quiet "$PREVIOUS_SHA" HEAD -- package.json package-lock.json; then
    npm ci --no-audit --no-fund || return 1
  fi
  rm -rf dist || return 1
  npm run build || return 1
  [ -f dist/main.js ] || { echo "Build produced no dist/main.js"; return 1; }
}

healthy() {
  for _ in $(seq 1 30); do
    if [ "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/health)" = "200" ]; then
      return 0
    fi
    sleep 2
  done
  return 1
}

rollback() {
  echo "!! Deploy failed — rolling back to ${PREVIOUS_SHA:0:7}"
  git reset --hard "$PREVIOUS_SHA"
  build
  pm2 restart "$PM2_NAME" --update-env
  healthy && echo "Rolled back and healthy." || echo "!! Rollback is not healthy — check: pm2 logs $PM2_NAME"
  exit 1
}

echo "==> Fetching code"
git fetch --quiet origin "$BRANCH"
git reset --hard "origin/$BRANCH"
echo "    ${PREVIOUS_SHA:0:7} -> $(git rev-parse --short HEAD)"

echo "==> Checking .env"
MISSING_ENV=""
for key in DATABASE_URL JWT_ACCESS_SECRET JWT_REFRESH_SECRET REDIS_HOST BOOTSTRAP_SECRET; do
  grep -q "^${key}=." .env || MISSING_ENV="$MISSING_ENV $key"
done
if [ -n "$MISSING_ENV" ]; then
  echo "!! Missing or empty in $APP_DIR/.env:$MISSING_ENV"
  rollback
fi

echo "==> Installing dependencies and building"
build || rollback

echo "==> Applying database migrations"
node --env-file-if-exists=.env migrations/migrate.js || rollback

echo "==> Restarting $PM2_NAME"
pm2 restart "$PM2_NAME" --update-env
pm2 save > /dev/null

echo "==> Health check"
healthy || rollback

echo "Deployed $(git rev-parse --short HEAD) — healthy."
REMOTE
