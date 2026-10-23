import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { anchorsOf, check, slug } from './check-docs.mjs';
import { validate } from './check-progress.mjs';

test('slug follows GitHub heading anchors', () => {
  assert.equal(slug('Subagent contract (every delegation includes all of these)'), 'subagent-contract-every-delegation-includes-all-of-these');
  assert.equal(slug('`ci.yml` — every PR'), 'ciyml--every-pr');
  assert.equal(slug('Tiếng Việt'), 'tiếng-việt');
});

test('anchors skip fenced code and number duplicates', () => {
  const a = anchorsOf('# A\n```\n# Not a heading\n```\n# A\n<a id="custom"></a>');
  assert.deepEqual([...a].sort(), ['a', 'a-1', 'custom']);
});

test('check reports missing files and anchors, ignores external and inline-code links', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'check-docs-'));
  fs.writeFileSync(path.join(root, 'b.md'), '# Real heading\n');
  fs.writeFileSync(
    path.join(root, 'a.md'),
    '[ok](b.md#real-heading) [x](https://example.com) `[c](nope.md)`\n[gone](nope.md)\n[bad](b.md#nope)\n[self](#top)\n# Top\n',
  );
  assert.deepEqual(check(root, ['a.md', 'b.md']), ['a.md:2: nope.md → missing file', 'a.md:3: b.md#nope → missing anchor #nope']);
});

test('progress validation accepts the real file and rejects a broken one', () => {
  const root = path.resolve(import.meta.dirname, '..');
  const real = JSON.parse(fs.readFileSync(path.join(root, 'progress.json'), 'utf8'));
  assert.deepEqual(validate(real, root), []);

  const broken = structuredClone(real);
  broken.current_task.status = 'finished';
  broken.policy.context.handoff_tokens = 1;
  broken.evidence.push({ date: 'today', level: 'L9' });
  const errors = validate(broken, root);
  assert.ok(errors.some((e) => e.startsWith('current_task.status')));
  assert.ok(errors.some((e) => e.startsWith('policy.context')));
  assert.ok(errors.some((e) => e.endsWith('.date must be YYYY-MM-DD')));
  assert.ok(errors.some((e) => e.endsWith('.level must be L1-L4')));
});
