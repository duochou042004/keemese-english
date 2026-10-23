#!/usr/bin/env node
// Internal Markdown link check: every relative link points to an existing file, and every #anchor
// to an existing heading or <a id>. External (http, mailto) links are not checked. Run from the repo root.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// GitHub's heading slug: lowercase, drop punctuation except - and _, spaces → -.
export function slug(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/[`*~]/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-');
}

export function anchorsOf(markdown) {
  const anchors = new Set();
  const seen = new Map();
  let fence = false;
  for (const line of markdown.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    if (fence) continue;
    const h = /^#{1,6}\s+(.*?)\s*#*\s*$/.exec(line);
    if (h) {
      const base = slug(h[1]);
      const n = seen.get(base) ?? 0;
      seen.set(base, n + 1);
      anchors.add(n ? `${base}-${n}` : base);
    }
    for (const m of line.matchAll(/<a\s+(?:id|name)="([^"]+)"/g)) anchors.add(m[1]);
  }
  return anchors;
}

export function linksOf(markdown) {
  const links = [];
  let fence = false;
  markdown.split(/\r?\n/).forEach((line, i) => {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    if (fence) return;
    const code = line.replace(/`[^`]*`/g, '');
    for (const m of code.matchAll(/\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)) links.push({ target: m[1], line: i + 1 });
  });
  return links;
}

export function check(root, files) {
  const errors = [];
  const anchorCache = new Map();
  const anchors = (file) => {
    if (!anchorCache.has(file)) anchorCache.set(file, anchorsOf(fs.readFileSync(file, 'utf8')));
    return anchorCache.get(file);
  };
  for (const rel of files) {
    const file = path.join(root, rel);
    for (const { target, line } of linksOf(fs.readFileSync(file, 'utf8'))) {
      if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue; // http:, https:, mailto:, …
      const [rawPath, hash] = target.split('#');
      const dest = rawPath ? path.resolve(path.dirname(file), decodeURIComponent(rawPath)) : file;
      const where = `${rel}:${line}`;
      const inside = path.relative(root, dest);
      if (inside.startsWith('..') || path.isAbsolute(inside)) errors.push(`${where}: ${target} leaves the repository`);
      else if (!fs.existsSync(dest)) errors.push(`${where}: ${target} → missing file`);
      else if (hash && dest.endsWith('.md') && !anchors(dest).has(decodeURIComponent(hash).toLowerCase()) && !anchors(dest).has(decodeURIComponent(hash)))
        errors.push(`${where}: ${target} → missing anchor #${hash}`);
    }
  }
  return errors;
}

if (import.meta.main) {
  const files = execFileSync('git', ['ls-files', '*.md'], { encoding: 'utf8' }).split('\n').filter(Boolean);
  const errors = check(process.cwd(), files);
  for (const e of errors) console.error(e);
  console.log(`check-docs: ${files.length} files, ${errors.length} broken links`);
  process.exit(errors.length ? 1 : 0);
}
