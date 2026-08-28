#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function patch(rel, from, to) {
  const target = path.join(root, rel);
  let source = fs.readFileSync(target, 'utf8');
  if (source.includes(to)) return false;
  if (!source.includes(from)) throw new Error(`${rel}: missing ${from}`);
  source = source.replaceAll(from, to);
  fs.writeFileSync(target, source, 'utf8');
  return true;
}

const changed = [];
if (patch(
  'ln-rank/js/workspace/selection-workspace-orchestrator.v3966_0.js',
  "version: 'selection-workspace-orchestration-v3965_0'",
  "version: 'selection-workspace-orchestration-v3966_0'"
)) changed.push('workspace-version');
if (patch(
  'tools/ln-2026/verify-final-release-v9.py',
  '"selection-workspace-orchestration-v3965_0",',
  '"selection-workspace-orchestration-v3966_0",'
)) changed.push('release-verifier-workspace-version');

console.log(JSON.stringify({ ok: true, changed }, null, 2));
