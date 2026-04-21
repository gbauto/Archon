#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONVERTER="$SCRIPT_DIR/claude-session-archive.mjs"
PROJECTS_ROOT="$HOME/.claude/projects"

[ -d "$PROJECTS_ROOT" ] || { echo "no projects dir at $PROJECTS_ROOT" >&2; exit 1; }

count=0
for dir in "$PROJECTS_ROOT"/*/; do
  for f in "$dir"*.jsonl; do
    [ -e "$f" ] || continue
    bun run "$CONVERTER" "$f" && count=$((count + 1))
  done
done
echo "backfilled $count transcript(s)"
