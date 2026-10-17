// PreToolUse guard for Claude Code (see docs/agents/harness.md#hooks).
// Blocks destructive git/file commands, commits/merges on protected branches,
// and edits to real .env files. Exit 2 = block (stderr is shown to the agent).
import { execFileSync } from 'node:child_process';
import { basename } from 'node:path';
import { pathToFileURL } from 'node:url';

const PROTECTED_BRANCHES = new Set(['master', 'develop']);
// Build/output dirs that are safe to delete recursively (matched on the last path segment).
const DELETABLE_DIRS = new Set(['bin', 'obj', 'node_modules', 'dist', '.data', 'TestResults', 'coverage', 'playwright-report', 'test-results', 'blob-report']);
const isDeletable = (t) => {
  const p = t.replace(/^["']|["']$/g, '').replace(/\\/g, '/').replace(/\/+$/, '');
  return !p.split('/').includes('..') && !p.startsWith('/') && DELETABLE_DIRS.has(p.split('/').pop());
};

const DESTRUCTIVE_GIT = [
  [/\bgit\s+push\b[^\n;&|]*\s(--force(-with-lease)?|-f)\b/, 'force-push is not allowed'],
  [/\bgit\s+push\b[^\n;&|]*\s\+\S+/, 'force-push via +refspec is not allowed'],
  [/\bgit\s+reset\b[^\n;&|]*--hard\b/, 'git reset --hard discards work'],
  [/\bgit\s+clean\b[^\n;&|]*\s-[a-zA-Z]*f/, 'git clean -f deletes untracked files'],
  [/\bgit\s+branch\b[^\n;&|]*\s(-D|--delete\s+--force|-d\s+-f)\b/, 'force branch deletion is not allowed'],
  [/\bgit\s+(checkout|restore)\b[^\n;&|]*\s(--\s+)?\.(\s|$)/, 'discarding all working-tree changes is not allowed'],
];

function rmTargetsUnsafe(command) {
  // bash: rm with both -r and -f (any order/combination)
  for (const m of command.matchAll(/\brm\s+([^\n;&|]+)/g)) {
    const tokens = m[1].trim().split(/\s+/);
    const flags = tokens.filter((t) => t.startsWith('-')).join('');
    if (!(/r/i.test(flags) && /f/.test(flags))) continue;
    const targets = tokens.filter((t) => !t.startsWith('-'));
    if (targets.length === 0 || targets.some((t) => !isDeletable(t))) return true;
  }
  // PowerShell: Remove-Item ... -Recurse
  for (const m of command.matchAll(/\b(Remove-Item|rd|rmdir)\b([^\n;|]+)/gi)) {
    if (!/-Recurse\b|\/s\b/i.test(m[2])) continue;
    const targets = m[2].trim().split(/\s+/).filter((t) => !t.startsWith('-') && !t.startsWith('/'));
    if (targets.length === 0 || targets.some((t) => !isDeletable(t))) return true;
  }
  return false;
}

/** Returns a block reason, or null to allow. `branch` is the current git branch (or null). */
export function check(input, { branch } = {}) {
  const tool = input?.tool_name ?? '';
  const ti = input?.tool_input ?? {};

  if (tool === 'Bash' || tool === 'PowerShell') {
    const command = String(ti.command ?? '');
    for (const [re, reason] of DESTRUCTIVE_GIT) if (re.test(command)) return reason;
    if (rmTargetsUnsafe(command)) return 'recursive delete outside build/output folders is not allowed';
    if (/\bgit\s+(commit|merge)\b/.test(command) && PROTECTED_BRANCHES.has(branch ?? '')) {
      return `do not commit or merge on '${branch}'; use a feature/* or fix/* branch and a PR after approval`;
    }
    return null;
  }

  if (tool === 'Edit' || tool === 'Write' || tool === 'MultiEdit' || tool === 'NotebookEdit') {
    const name = basename(String(ti.file_path ?? ti.notebook_path ?? '').replace(/\\/g, '/'));
    if (/^\.env(\..+)?$/.test(name) && name !== '.env.example') {
      return `editing ${name} is blocked; put placeholders in .env.example and ask the user to set real values`;
    }
  }
  return null;
}

function currentBranch(cwd) {
  try {
    return execFileSync('git', ['branch', '--show-current'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

async function main() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0); // malformed input: don't block, normal permission flow applies
  }
  const reason = check(input, { branch: currentBranch(input.cwd || process.cwd()) });
  if (reason) {
    process.stderr.write(`Blocked by .claude/hooks/guard.mjs: ${reason}\n`);
    process.exit(2);
  }
  process.exit(0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
