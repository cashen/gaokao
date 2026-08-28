#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const projectRoot = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(process.cwd(), 'ln-rank');
const assets = JSON.parse(fs.readFileSync(path.join(projectRoot,'active-assets.json'),'utf8'));
const asset = String(assets.assetVersion||'').replace(/^v/,'');
const cssFiles = (assets.cssEntry||[]).filter(Boolean);
const requiredByFile = {
  'ln-rank-main': ['.hero','.panel','.score-input','.range-button','.major-card','.major-card-actions','.pool-add-button','.diagnose-button','.aux-background-entry','.background-hint-stack','.local-background-hint'],
  'ln-rank-selection': ['.selection-workspace','.workspace-item','.analysis-box'],
  'local-mainline': ['.lm-page','.lm-hero','.lm-tabs','.lm-card','.lm-record-card'],
  '211-mainline': ['.jm-page','.jm-hero','.jm-school-card','.lm-start-card']
};
const checks=[]; let ok=true;
for (const rel of cssFiles) {
  const abs=path.join(projectRoot,rel);
  if (!fs.existsSync(abs)) { ok=false; checks.push({rel,exists:false,pass:false}); continue; }
  const css=fs.readFileSync(abs,'utf8');
  const key=Object.keys(requiredByFile).find(k=>rel.includes(k));
  const required=key?requiredByFile[key]:[];
  const missing=required.filter(sel=>!css.includes(sel));
  const tooSmall = rel.includes('ln-rank-main') && css.length < 250000;
  const pass = missing.length===0 && !tooSmall;
  if (!pass) ok=false;
  checks.push({rel,bytes:css.length,required,missing,tooSmall,pass});
}
const out={ok,version:assets.version,assetVersion:assets.assetVersion,checks,manualReviewReminder:'Before release, visually open /ln-rank/ at PC and mobile width; naked HTML is a release failure.'};
fs.writeFileSync(path.join(projectRoot,`main-page-style-smoke-audit.${asset}.json`),JSON.stringify(out,null,2),'utf8');
if (!ok) { console.error(JSON.stringify(out,null,2)); process.exit(1); }
console.log(JSON.stringify(out,null,2));
