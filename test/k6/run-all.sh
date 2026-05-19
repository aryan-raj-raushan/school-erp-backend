#!/usr/bin/env bash
set -e

BASE_URL="${BASE_URL:-http://localhost:3000/api/v1}"
PROFILE="${PROFILE:-smoke}"
RESULTS_DIR="test/k6/results"

mkdir -p "$RESULTS_DIR"

timestamp=$(date +%Y%m%d_%H%M%S)

export BASE_URL

echo "=== k6 Load Tests — profile: $PROFILE — target: $BASE_URL ==="

tests=("auth" "schools" "students" "subscriptions")

for test in "${tests[@]}"; do
  echo ""
  echo "--- Running: $test.test.js ---"
  k6 run \
    --env PROFILE="$PROFILE" \
    --out json="$RESULTS_DIR/${test}_${timestamp}.json" \
    "test/k6/${test}.test.js"
  echo "--- Done: $test ---"
done

echo ""
echo "=== All tests complete. Results in $RESULTS_DIR ==="
