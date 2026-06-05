#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "usage: source scripts/iac/load-env.sh <env> <target>" >&2
  return 2 2>/dev/null || exit 2
fi

env_name="$1"
target="$2"
while IFS= read -r line; do
  if [ -n "${line}" ]; then
    export "${line}"
  fi
done < <(node scripts/iac/render-env.mjs --env "${env_name}" --target "${target}" --print)
