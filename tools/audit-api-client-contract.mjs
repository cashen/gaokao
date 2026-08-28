#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const lr = path.join(root, 'ln-rank');
const assets = JSON.parse(fs.readFileSync(path.join(lr, 'active-assets.json'), 'utf8'));
const q = String(assets.assetVersion || '').replace(/^v/, '');
const failures = [];
function read(rel){ return fs.readFileSync(path.join(lr, rel), 'utf8'); }
function exists(rel){ return fs.existsSync(path.join(lr, rel)); }
if (!exists('js/shared/api-client.js')) failures.push('missing shared api-client');
const client = exists('js/shared/api-client.js') ? read('js/shared/api-client.js') : '';
for (const token of ['html_response','json_parse_error','http_error','/api/ln-rank-runtime-health','/api/major-bands-health']) {
  if (!client.includes(token)) failures.push(`api-client missing ${token}`);
}
const majorBandsApi = read('js/feature/major-pool/bands-api.js');
if (!majorBandsApi.includes('fetchApiJson')) failures.push('major bands API must use shared fetchApiJson');
const appEntry = (assets.jsEntry || []).find(x => x.includes('app.'));
if (appEntry) {
  const app = read(appEntry);
  if (!app.includes('formatApiErrorForHuman') || !app.includes('errorDetail')) failures.push('app entry must store user-facing and engineer-facing API error separately');
}
const render = read('js/feature/major-pool/render.js');
if (!render.includes('/api/ln-rank-runtime-health') || !render.includes('/api/major-bands-health')) failures.push('major result error surface must link runtime health and major-bands health');
const lmEntry = (assets.jsEntry || []).find(x => x.includes('local-mainline-app'));
if (lmEntry) {
  const lm = read(lmEntry);
  if (!lm.includes('fetchApiJson') || !lm.includes('apiErrorDiagnosticHtml')) failures.push('local-mainline page must use shared API error handling');
}
const report = { version: assets.version, assetVersion: assets.assetVersion, failures, status: failures.length ? 'fail' : 'pass' };
fs.writeFileSync(path.join(lr, `api-client-contract-audit.${q}.json`), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
