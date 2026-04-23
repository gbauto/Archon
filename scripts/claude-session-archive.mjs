#!/usr/bin/env node
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { basename, resolve } from "node:path";
import { homedir } from "node:os";

const VAULT_DIR = process.env.SECOND_BRAIN_LOG_PATH
  || resolve(homedir(), "OneDrive/Desktop/gbauto/gbautomation/second-brain/intelligence/claude-sessions");

// Known repo slugs under gbauto/ + adjacent. If the session cwd contains
// one of these as a path segment, it becomes the archive subfolder.
// Falls back to last path segment (or "unknown" for empty cwd).
const KNOWN_SLUGS = [
  "gbautomation",
  "fisch-group",
  "jid5274",
  "pbauer",
  "sylvan-hills",
  "loren-piretra",
  "cruz-creations",
  "greg-trading",
  "sm-eagle-scaffold",
  "eagle-app",
  "archon",
  "consulting-co",
  "wiki",
];

function slugFromCwd(cwd) {
  if (!cwd) return "unknown";
  const parts = String(cwd).replace(/\\/g, "/").split("/").filter(Boolean);
  // Segment immediately after `gbauto/` is the client repo slug. Handles
  // direct checkouts (`.../gbauto/{slug}/...`) AND Archon worktrees
  // (`.../.archon/workspaces/gbauto/{slug}/worktrees/archon/...`).
  for (let i = 0; i < parts.length - 1; i++) {
    if (parts[i] === "gbauto" && KNOWN_SLUGS.includes(parts[i + 1])) {
      return parts[i + 1];
    }
  }
  // Any known slug anywhere, walking backward.
  for (let i = parts.length - 1; i >= 0; i--) {
    if (KNOWN_SLUGS.includes(parts[i])) return parts[i];
  }
  if (parts.includes(".archon")) return "archon";
  return parts[parts.length - 1] || "unknown";
}

const transcriptPath = process.argv[2];
if (!transcriptPath) {
  console.error("usage: claude-session-archive.mjs <transcript.jsonl>");
  process.exit(1);
}
if (!existsSync(transcriptPath)) {
  console.error(`transcript not found: ${transcriptPath}`);
  process.exit(0);
}

const lines = readFileSync(transcriptPath, "utf8").split("\n").filter(Boolean);
const events = [];
for (const line of lines) {
  try { events.push(JSON.parse(line)); } catch { /* skip malformed */ }
}

const turns = [];
let sessionId = null;
let cwd = null;
let firstTs = null;
let lastTs = null;
let toolCallCount = 0;

for (const ev of events) {
  if (ev.sessionId && !sessionId) sessionId = ev.sessionId;
  if (ev.cwd && !cwd) cwd = ev.cwd;
  if (ev.isSidechain) continue;
  if (ev.type !== "user" && ev.type !== "assistant") continue;

  const ts = ev.timestamp;
  if (ts) {
    if (!firstTs) firstTs = ts;
    lastTs = ts;
  }

  if (ev.type === "user") {
    const c = ev.message?.content;
    if (typeof c === "string" && c.trim()) {
      turns.push({ role: "user", ts, text: c });
    }
    continue;
  }

  // assistant
  const blocks = Array.isArray(ev.message?.content) ? ev.message.content : [];
  const textParts = [];
  const toolLines = [];
  for (const b of blocks) {
    if (b.type === "text" && b.text) textParts.push(b.text);
    else if (b.type === "tool_use") {
      toolCallCount++;
      toolLines.push(`- Tool: ${b.name} — ${summarizeToolInput(b.name, b.input)}`);
    }
  }
  if (textParts.length || toolLines.length) {
    turns.push({ role: "assistant", ts, text: textParts.join("\n\n"), toolLines });
  }
}

if (!sessionId || turns.length === 0) {
  console.error(`no renderable turns in ${transcriptPath}`);
  process.exit(0);
}

const repoSlug = slugFromCwd(cwd);
const archiveDir = resolve(VAULT_DIR, repoSlug);
mkdirSync(archiveDir, { recursive: true });

const startDate = (firstTs || new Date().toISOString()).slice(0, 10);
const shortId = sessionId.slice(0, 8);
const outPath = resolve(archiveDir, `${startDate}-${shortId}.md`);

const frontmatter = [
  "---",
  `sessionId: ${sessionId}`,
  `started: ${firstTs || ""}`,
  `ended: ${lastTs || ""}`,
  `cwd: ${cwd || ""}`,
  `repo: ${repoSlug}`,
  `turn_count: ${turns.length}`,
  `tool_call_count: ${toolCallCount}`,
  `source: ${transcriptPath}`,
  "---",
  "",
].join("\n");

const body = turns.map(renderTurn).join("\n\n");
writeFileSync(outPath, frontmatter + body + "\n", "utf8");
console.error(`wrote ${outPath}`);

function renderTurn(t) {
  const heading = t.role === "user" ? "## User" : "## Claude";
  const ts = t.ts ? ` — ${formatTs(t.ts)}` : "";
  const parts = [`${heading}${ts}`];
  if (t.text) parts.push(t.text);
  if (t.toolLines?.length) {
    if (t.text) parts.push("");
    parts.push(t.toolLines.join("\n"));
  }
  return parts.join("\n\n");
}

function formatTs(iso) {
  try {
    return new Date(iso).toLocaleString("en-US", { timeZone: "America/New_York" });
  } catch {
    return iso;
  }
}

function summarizeToolInput(name, input) {
  if (!input || typeof input !== "object") return "";
  const oneLine = (s) => String(s).replace(/\s+/g, " ").trim().slice(0, 120);
  switch (name) {
    case "Read":
    case "Write":
    case "Edit":
    case "NotebookEdit":
      return oneLine(input.file_path || "");
    case "Bash":
      return oneLine(input.command || "");
    case "Grep":
      return oneLine(`${input.pattern || ""}${input.path ? ` in ${input.path}` : ""}`);
    case "Glob":
      return oneLine(input.pattern || "");
    case "WebFetch":
    case "WebSearch":
      return oneLine(input.url || input.query || "");
    case "Agent":
    case "Task":
      return oneLine(input.description || input.subagent_type || "");
    case "TodoWrite":
    case "TaskCreate":
    case "TaskUpdate":
      return oneLine(JSON.stringify(input).slice(0, 120));
    default:
      return oneLine(JSON.stringify(input));
  }
}
