// Run: node --test ".claude/hooks/*.test.mjs"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DEFAULT_POLICY, thresholds, tierOf, decide, contextTokensFromTranscript } from './context-monitor.mjs';
import { buildBriefing } from './session-start.mjs';

test('1M window uses absolute thresholds (handoff before 400k, never past 500k)', () => {
  const t = thresholds(DEFAULT_POLICY);
  assert.deepEqual([t.warn, t.handoff, t.hardStop, t.neverExceed], [250_000, 320_000, 400_000, 500_000]);
});

test('200k window falls back to percentages', () => {
  const t = thresholds({ ...DEFAULT_POLICY, window_tokens: 200_000 });
  assert.deepEqual([t.warn, t.handoff, t.hardStop], [100_000, 120_000, 150_000]);
});

test('tiers', () => {
  const t = thresholds(DEFAULT_POLICY);
  assert.equal(tierOf(100_000, t), 0);
  assert.equal(tierOf(250_000, t), 1);
  assert.equal(tierOf(330_000, t), 2);
  assert.equal(tierOf(450_000, t), 3);
});

test('emits on tier increase, repeats at handoff+, quiet otherwise', () => {
  const p = DEFAULT_POLICY;
  assert.equal(decide({ tokens: 100_000, lastTier: 0, event: 'PostToolUse', policy: p }).text, null);
  assert.match(decide({ tokens: 260_000, lastTier: 0, event: 'PostToolUse', policy: p }).text, /WARN/);
  assert.equal(decide({ tokens: 270_000, lastTier: 1, event: 'PostToolUse', policy: p }).text, null);
  assert.match(decide({ tokens: 270_000, lastTier: 1, event: 'UserPromptSubmit', policy: p }).text, /WARN/);
  assert.match(decide({ tokens: 330_000, lastTier: 2, event: 'PostToolUse', policy: p }).text, /HANDOFF NOW/);
  assert.match(decide({ tokens: 410_000, lastTier: 3, event: 'PostToolUse', policy: p }).text, /HARD STOP/);
});

test('reads the latest main-thread usage from a transcript, ignoring sidechains and cut lines', () => {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ctx-')), 't.jsonl');
  const usage = (n) => ({ input_tokens: 2, cache_creation_input_tokens: 8, cache_read_input_tokens: n, output_tokens: 90 });
  fs.writeFileSync(f, [
    'cut-off-partial-line"usage""assistant"',
    JSON.stringify({ type: 'assistant', isSidechain: false, message: { usage: usage(100_000) } }),
    JSON.stringify({ type: 'user', message: { content: 'hi' } }),
    JSON.stringify({ type: 'assistant', isSidechain: false, message: { usage: usage(200_000) } }),
    JSON.stringify({ type: 'assistant', isSidechain: true, message: { usage: usage(5) } }),
    '',
  ].join('\n'));
  assert.equal(contextTokensFromTranscript(f), 200_100);
  assert.equal(contextTokensFromTranscript(path.join(os.tmpdir(), 'does-not-exist.jsonl')), null);
});

const facts = {
  source: 'startup', branch: 'feature/x', head: 'abc123 feat: y', dirty: [], aheadBehind: '0 ahead, 0 behind',
  progress: { last_updated: '2026-10-17', current_phase: 'P2', current_task: { id: 'T-001', status: 'in_progress', branch: 'feature/x' }, next_task: { id: 'T-002', packet: 'docs/delivery/tasks/T-002.md' }, blockers: [] },
  handoff: '# Next session: T-001', commitsSinceHandoff: 0,
};

test('briefing includes state and handoff, stays under the cap', () => {
  const b = buildBriefing(facts);
  assert.match(b, /`feature\/x` @ abc123/);
  assert.match(b, /current task T-001 \[in_progress\]/);
  assert.match(b, /# Next session: T-001/);
  assert.doesNotMatch(b, /Inconsistencies/);
  assert.ok(buildBriefing({ ...facts, handoff: 'x'.repeat(20_000) }).length <= 9000);
});

test('briefing flags branch mismatch, stale handoff, broken progress.json and compaction', () => {
  assert.match(buildBriefing({ ...facts, branch: 'develop' }), /checkout is `develop`/);
  assert.match(buildBriefing({ ...facts, commitsSinceHandoff: 2 }), /handoff may be stale/);
  assert.match(buildBriefing({ ...facts, progress: null, progressError: 'invalid JSON' }), /unreadable/);
  assert.match(buildBriefing({ ...facts, source: 'compact' }), /forced handoff point/);
});
