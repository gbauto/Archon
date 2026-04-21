#!/usr/bin/env bash
# compile-knowledge.sh — Compiles second-brain knowledge into SKILL.md
# Source of truth: (optional) Google Drive via rclone remote set in DRIVE_REMOTE.
# Local second-brain/knowledge/ is a cache.
# Set KNOWLEDGE_SYNC=0 to skip the Drive pull (offline / testing).
# Override harness display name with HARNESS_NAME (defaults to package.json name, then dir name).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BRAIN="$ROOT/second-brain"
SKILL="$ROOT/SKILL.md"
DRIVE_REMOTE="${DRIVE_REMOTE:-}"

# Resolve harness name: HARNESS_NAME env > package.json "name" > dir basename
if [[ -n "${HARNESS_NAME:-}" ]]; then
  NAME="$HARNESS_NAME"
elif [[ -f "$ROOT/package.json" ]] && command -v node >/dev/null 2>&1; then
  NAME="$(node -e "try{console.log(require('$ROOT/package.json').name||'')}catch{}")"
  [[ -z "$NAME" ]] && NAME="$(basename "$ROOT")"
else
  NAME="$(basename "$ROOT")"
fi

if [[ "${KNOWLEDGE_SYNC:-1}" == "1" && -n "$DRIVE_REMOTE" ]]; then
  if ! command -v rclone >/dev/null 2>&1; then
    echo "rclone not installed — install rclone or unset DRIVE_REMOTE / set KNOWLEDGE_SYNC=0" >&2
    exit 1
  fi
  echo "Pulling knowledge from $DRIVE_REMOTE ..."
  rclone sync "$DRIVE_REMOTE" "$BRAIN/knowledge" --include "concepts/*.md" --include "connections/*.md"
fi

mkdir -p "$(dirname "$SKILL")"

cat > "$SKILL" << HEADER
---
name: $NAME
status: active
---

# $NAME — Knowledge Base

> This knowledge base is compiled from the second-brain knowledge graph.
> It is loaded as cached context at the start of every session.
> To update, edit files in \`second-brain/knowledge/\` then run \`scripts/compile-knowledge.sh\`.

---

HEADER

# --- Concepts ---
if [[ -d "$BRAIN/knowledge/concepts" ]]; then
  echo "## Concepts" >> "$SKILL"
  echo "" >> "$SKILL"

  for f in "$BRAIN"/knowledge/concepts/*.md; do
    [ -e "$f" ] || continue
    name=$(basename "$f" .md)
    echo "### $(echo "$name" | sed 's/-/ /g' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) tolower(substr($i,2))}1')" >> "$SKILL"
    echo "" >> "$SKILL"
    awk 'BEGIN{fm=0} /^---$/{fm++; next} fm>=2{print}' "$f" >> "$SKILL"
    echo "" >> "$SKILL"
    echo "---" >> "$SKILL"
    echo "" >> "$SKILL"
  done
fi

# --- Connections ---
if [[ -d "$BRAIN/knowledge/connections" ]]; then
  echo "## Connections (Knowledge Graph Edges)" >> "$SKILL"
  echo "" >> "$SKILL"
  echo "| Relationship | Strength | Summary |" >> "$SKILL"
  echo "|-------------|----------|---------|" >> "$SKILL"

  for f in "$BRAIN"/knowledge/connections/*.md; do
    [ -e "$f" ] || continue
    name=$(basename "$f" .md)
    direction=$(grep '^direction:' "$f" 2>/dev/null | sed 's/direction: //' || echo "$name")
    strength=$(grep '^strength:' "$f" 2>/dev/null | sed 's/strength: //' || echo "—")
    summary=$(awk 'BEGIN{fm=0} /^---$/{fm++; next} fm>=2 && NF{print; exit}' "$f")
    echo "| ${direction} | ${strength} | ${summary:0:120} |" >> "$SKILL"
  done

  echo "" >> "$SKILL"

  echo "### Connection Details" >> "$SKILL"
  echo "" >> "$SKILL"

  for f in "$BRAIN"/knowledge/connections/*.md; do
    [ -e "$f" ] || continue
    direction=$(grep '^direction:' "$f" 2>/dev/null | sed 's/direction: //' || echo "$(basename "$f" .md)")
    echo "**${direction}**" >> "$SKILL"
    awk 'BEGIN{fm=0} /^---$/{fm++; next} fm>=2{print}' "$f" >> "$SKILL"
    echo "" >> "$SKILL"
  done
fi

cat >> "$SKILL" << 'FOOTER'
---

*Compiled from second-brain/knowledge/ — run `scripts/compile-knowledge.sh` to refresh.*
FOOTER

echo "SKILL.md compiled: $(wc -c < "$SKILL") bytes, $(wc -l < "$SKILL") lines"
