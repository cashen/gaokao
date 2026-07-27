import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { UI_COMPONENT_REGISTRY } from '../shared/ui/component-registry.v3967_0.js';

const read = rel => fs.readFileSync(rel, 'utf8');
const active = JSON.parse(read('ln-rank/active-assets.json'));
const resolveActive = rel => rel.startsWith('../') ? rel.slice(3) : path.posix.join('ln-rank', rel);
const cssPaths = active.cssEntry.map(resolveActive).filter(rel => fs.existsSync(rel));
assert.equal(cssPaths.length, active.cssEntry.length, 'active CSS graph contains missing files');

const historyOwner = UI_COMPONENT_REGISTRY.historyEvidence.cssOwner.replace(/^\//, '');
const schoolOwner = UI_COMPONENT_REGISTRY.schoolResults.cssOwner.replace(/^\//, '');
const workspaceOwner = UI_COMPONENT_REGISTRY.majorResults.cssOwner.replace(/^\//, '');
for (const owner of [historyOwner, schoolOwner, workspaceOwner]) assert.ok(cssPaths.includes(owner), `component CSS owner is not active: ${owner}`);

const historyCss = read(historyOwner);
assert.match(historyCss, /container-name:ln-history-evidence/);
assert.match(historyCss, /@container ln-history-evidence/);
assert.ok(!historyCss.includes('@container school-all-results'), 'stale unmatched school container query');
assert.ok(!historyCss.includes('.history-score'), 'new component reuses legacy history class');
assert.ok(!historyCss.includes('.history-evidence{'), 'new component reuses legacy root class');
assert.match(historyCss, /minmax\(min\(100%,168px\),1fr\)/);

const schoolCss = read(schoolOwner);
assert.match(schoolCss, /container-name:school-results/);
assert.match(schoolCss, /@container school-results/);
const workspaceCss = read(workspaceOwner);
assert.ok(!workspaceCss.includes('.school-all-results-shell'), 'workspace CSS still owns school-result component layout');

for (const rel of cssPaths) {
  if (rel !== historyOwner) assert.ok(!read(rel).includes('.ln-history-evidence'), `${rel} crosses history component boundary`);
  if (rel !== schoolOwner) assert.ok(!read(rel).includes('.school-all-results-shell'), `${rel} crosses school-results component boundary`);
}

const combined = cssPaths.map(read).join('\n');
const registered = new Set([...combined.matchAll(/container-name\s*:\s*([\w-]+)/g)].map(m => m[1]));
const queried = new Set([...combined.matchAll(/@container\s+([\w-]+)\s*\(/g)].map(m => m[1]));
for (const name of queried) assert.ok(registered.has(name), `container query has no registered owner: ${name}`);

const importantLines = historyCss.split('\n').filter(line => line.includes('!important'));
assert.ok(importantLines.every(line => /prefers-reduced-motion|transition|scroll-behavior/.test(line)), `unexpected !important in history component owner: ${importantLines.join(' | ')}`);

console.log(JSON.stringify({
  ok: true,
  activeCss: cssPaths.length,
  owners: { history: historyOwner, school: schoolOwner, workspace: workspaceOwner },
  registered: [...registered],
  queried: [...queried]
}, null, 2));
