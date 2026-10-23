#!/usr/bin/env node
// progress.json shape check: the fields the session hooks and the handoff protocol rely on. Run from the repo root.
import fs from 'node:fs';
import path from 'node:path';

const TASK_STATUS = ['not_started', 'in_progress', 'in_review', 'done', 'blocked'];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function validate(p, root) {
  const errors = [];
  const need = (ok, msg) => ok || errors.push(msg);
  const str = (v) => typeof v === 'string' && v.trim() !== '';
  const strings = (v) => Array.isArray(v) && v.every((s) => typeof s === 'string');
  const exists = (rel) => str(rel) && fs.existsSync(path.join(root, rel));

  need(p.schema_version === 1, 'schema_version must be 1');
  need(DATE.test(p.last_updated ?? ''), 'last_updated must be YYYY-MM-DD');
  need(str(p.current_phase), 'current_phase is required');

  const c = p.policy?.context ?? {};
  const t = ['warn_tokens', 'handoff_tokens', 'hard_stop_tokens', 'never_exceed_tokens'].map((k) => c[k]);
  need(t.every(Number.isInteger) && t[0] < t[1] && t[1] < t[2] && t[2] < t[3], 'policy.context: warn < handoff < hard_stop < never_exceed tokens');
  need(Number.isInteger(p.policy?.handoff_prompt_max_chars), 'policy.handoff_prompt_max_chars must be an integer');

  for (const key of ['current_task', 'next_task']) {
    const task = p[key];
    need(str(task?.id) && str(task?.title), `${key}.id and .title are required`);
    need(exists(task?.packet), `${key}.packet must point to an existing file`);
  }
  need(TASK_STATUS.includes(p.current_task?.status), `current_task.status must be one of ${TASK_STATUS.join(', ')}`);

  for (const key of ['blockers', 'pending_owner_actions', 'completed', 'decisions', 'risks']) need(strings(p[key]), `${key} must be an array of strings`);

  need(Array.isArray(p.evidence), 'evidence must be an array');
  (p.evidence ?? []).forEach((e, i) => {
    const at = `evidence[${i}]`;
    need(DATE.test(e.date ?? ''), `${at}.date must be YYYY-MM-DD`);
    need(str(e.task) && str(e.tool) && str(e.result) && str(e.summary), `${at}: task, tool, result and summary are required`);
    need(/^L[1-4]$/.test(e.level ?? ''), `${at}.level must be L1-L4`);
    need(strings(e.commands) && strings(e.not_run), `${at}: commands and not_run must be arrays of strings`);
  });

  const handoff = path.join(root, 'docs/handoff/next-session.md');
  if (fs.existsSync(handoff) && Number.isInteger(p.policy?.handoff_prompt_max_chars)) {
    const len = fs.readFileSync(handoff, 'utf8').length;
    need(len <= p.policy.handoff_prompt_max_chars, `docs/handoff/next-session.md is ${len} chars (max ${p.policy.handoff_prompt_max_chars})`);
  }
  return errors;
}

if (import.meta.main) {
  let errors;
  try {
    errors = validate(JSON.parse(fs.readFileSync('progress.json', 'utf8')), process.cwd());
  } catch (e) {
    errors = [`progress.json: ${e.message}`];
  }
  for (const e of errors) console.error(e);
  console.log(`check-progress: ${errors.length} problems`);
  process.exit(errors.length ? 1 : 0);
}
