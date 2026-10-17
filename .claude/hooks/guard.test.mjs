// Run: node --test .claude/hooks/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { check } from './guard.mjs';

const bash = (command, branch = 'feature/x') => check({ tool_name: 'Bash', tool_input: { command } }, { branch });
const ps = (command) => check({ tool_name: 'PowerShell', tool_input: { command } }, { branch: 'feature/x' });
const write = (file_path) => check({ tool_name: 'Write', tool_input: { file_path } });

test('blocks destructive git commands', () => {
  for (const c of [
    'git push --force origin feature/x',
    'git push -f',
    'git push --force-with-lease',
    'git push origin +feature/x',
    'git reset --hard HEAD~1',
    'git clean -fd',
    'git branch -D feature/old',
    'git checkout -- .',
    'git restore .',
  ]) assert.ok(bash(c), c);
});

test('allows normal git commands', () => {
  for (const c of [
    'git status',
    'git push -u origin feature/x',
    'git commit -m "feat: x"',
    'git branch -d feature/merged',
    'git checkout develop',
    'git restore src/a.cs',
    'git reset --soft HEAD~1',
  ]) assert.equal(bash(c), null, c);
});

test('blocks commit/merge on protected branches', () => {
  assert.ok(bash('git commit -m x', 'master'));
  assert.ok(bash('git merge feature/x', 'develop'));
  assert.equal(bash('git commit -m x', 'feature/a'), null);
  assert.equal(bash('git status', 'develop'), null);
});

test('recursive delete only for build/output folders', () => {
  assert.equal(bash('rm -rf node_modules'), null);
  assert.equal(bash('rm -rf web/node_modules web/dist'), null);
  assert.equal(bash('rm -rf src/Keemese.Api/bin src/Keemese.Api/obj'), null);
  assert.ok(bash('rm -rf /'));
  assert.ok(bash('rm -rf docs'));
  assert.ok(bash('rm -fr src'));
  assert.ok(bash('rm -r -f .'));
  assert.equal(bash('rm file.txt'), null);
  assert.equal(ps('Remove-Item -Recurse -Force web\\node_modules'), null);
  assert.ok(ps('Remove-Item -Recurse -Force docs'));
});

test('blocks edits to real .env files only', () => {
  assert.ok(write('D:\\repo\\.env'));
  assert.ok(write('/repo/.env.local'));
  assert.equal(write('/repo/.env.example'), null);
  assert.equal(write('/repo/src/env.ts'), null);
});

test('ignores unrelated tools', () => {
  assert.equal(check({ tool_name: 'Read', tool_input: { file_path: '.env' } }), null);
});
