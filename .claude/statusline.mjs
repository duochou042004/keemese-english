// Status line: real context size vs the handoff thresholds, plus the Ponytail badge if active.
// Input: Claude Code status line JSON on stdin (context_window.total_input_tokens, …).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadPolicy, thresholds, tierOf } from './hooks/context-monitor.mjs';

let input = {};
try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch { /* ignore */ }
const cw = input.context_window ?? {};
const tokens = (cw.total_input_tokens ?? 0) + (cw.total_output_tokens ?? 0);
const projectDir = input.workspace?.project_dir || process.env.CLAUDE_PROJECT_DIR || process.cwd();
const policy = loadPolicy(projectDir);
if (cw.context_window_size) policy.window_tokens = cw.context_window_size;
const t = thresholds(policy);
const tier = tierOf(tokens, t);

const k = (n) => `${Math.round(n / 1000)}k`;
const label = ['ok', 'WARN: wrap up', 'HANDOFF NOW', 'HARD STOP'][tier];
const color = ['32', '33', '31', '41;97'][tier];
let line = `\x1b[${color}m[ctx ${k(tokens)} · handoff@${k(t.handoff)} · ${label}]\x1b[0m`;

try {
  const flag = path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), '.ponytail-active');
  const mode = fs.readFileSync(flag, 'utf8').trim();
  line += mode && mode !== 'full' ? ` \x1b[38;5;108m[PONYTAIL:${mode.toUpperCase()}]\x1b[0m` : ' \x1b[38;5;108m[PONYTAIL]\x1b[0m';
} catch { /* ponytail not active */ }

process.stdout.write(line);
