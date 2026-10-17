// Context budget monitor (see docs/agents/handoff.md#thresholds).
// Hook events: PostToolUse + UserPromptSubmit. Reads the real token count of the
// latest main-thread API request from the session transcript and, when a tier is
// crossed, injects a short instruction into the agent's context.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Absolute token thresholds. Effective threshold = min(absolute, pct × window).
export const DEFAULT_POLICY = {
  window_tokens: 1_000_000,
  warn_tokens: 250_000, warn_pct: 0.5,
  handoff_tokens: 320_000, handoff_pct: 0.6,
  hard_stop_tokens: 400_000, hard_stop_pct: 0.75,
  never_exceed_tokens: 500_000,
};

export function loadPolicy(projectDir) {
  try {
    const p = JSON.parse(fs.readFileSync(path.join(projectDir, 'progress.json'), 'utf8'));
    return { ...DEFAULT_POLICY, ...(p.policy?.context ?? {}) };
  } catch {
    return { ...DEFAULT_POLICY };
  }
}

export function thresholds(policy) {
  const w = policy.window_tokens;
  return {
    warn: Math.min(policy.warn_tokens, policy.warn_pct * w),
    handoff: Math.min(policy.handoff_tokens, policy.handoff_pct * w),
    hardStop: Math.min(policy.hard_stop_tokens, policy.hard_stop_pct * w),
    neverExceed: Math.min(policy.never_exceed_tokens, 0.9 * w),
  };
}

/** 0 = ok, 1 = warn, 2 = handoff, 3 = hard stop */
export function tierOf(tokens, t) {
  if (tokens >= t.hardStop) return 3;
  if (tokens >= t.handoff) return 2;
  if (tokens >= t.warn) return 1;
  return 0;
}

/** Context size of the latest main-thread assistant message in a JSONL transcript (tail-read). */
export function contextTokensFromTranscript(file, tailBytes = 1_500_000) {
  let fd;
  try {
    fd = fs.openSync(file, 'r');
    const size = fs.fstatSync(fd).size;
    const len = Math.min(size, tailBytes);
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, size - len);
    const lines = buf.toString('utf8').split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (!line.includes('"usage"') || !line.includes('"assistant"')) continue;
      let o;
      try { o = JSON.parse(line); } catch { continue; } // first line may be cut
      if (o.type !== 'assistant' || o.isSidechain || !o.message?.usage) continue;
      const u = o.message.usage;
      return (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.output_tokens ?? 0);
    }
    return null;
  } catch {
    return null;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

const k = (n) => `${Math.round(n / 1000)}k`;

export function message(tier, tokens, t) {
  const head = `[context-monitor] Context is ~${k(tokens)} tokens (handoff at ${k(t.handoff)}, hard stop ${k(t.hardStop)}, never exceed ${k(t.neverExceed)}).`;
  if (tier === 1) return `${head} WARN: finish the current smallest safe unit of work; do not start a new sub-task or large reads. Prefer subagents for exploration.`;
  if (tier === 2) return `${head} HANDOFF NOW: stop feature work, reach a safe point, and run the \`handoff\` skill (docs/agents/handoff.md). Tell the user a new session is needed.`;
  if (tier === 3) return `${head} HARD STOP: do nothing except completing the handoff (progress.json, docs/handoff/next-session.md, commit). Then stop and tell the user to start a new session.`;
  return null;
}

/** Decide what to inject. Emits on tier increase; repeats on every call at tier ≥ 2; and on each user prompt at tier ≥ 1. */
export function decide({ tokens, lastTier, event, policy }) {
  const t = thresholds(policy);
  const tier = tierOf(tokens, t);
  const emit = tier > lastTier || tier >= 2 || (event === 'UserPromptSubmit' && tier >= 1);
  return { tier, text: emit ? message(tier, tokens, t) : null };
}

async function main() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  let input;
  try { input = JSON.parse(raw); } catch { return; }
  if (!input.transcript_path || !input.session_id) return;

  const tokens = contextTokensFromTranscript(input.transcript_path);
  if (tokens == null) return;

  const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
  const stateFile = path.join(os.tmpdir(), `keemese-ctx-${String(input.session_id).replace(/[^\w-]/g, '')}.json`);
  let lastTier = 0;
  try { lastTier = JSON.parse(fs.readFileSync(stateFile, 'utf8')).tier ?? 0; } catch { /* first run */ }

  const { tier, text } = decide({ tokens, lastTier, event: input.hook_event_name, policy: loadPolicy(projectDir) });
  try { fs.writeFileSync(stateFile, JSON.stringify({ tier, tokens, at: new Date().toISOString() })); } catch { /* non-fatal */ }
  if (text) {
    process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: input.hook_event_name, additionalContext: text } }));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
