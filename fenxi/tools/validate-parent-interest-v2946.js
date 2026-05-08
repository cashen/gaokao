#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function readJson(p){
  return JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
}
function exists(p){
  if(!fs.existsSync(path.join(root,p))) throw new Error('missing file: '+p);
}
const required = [
  'index.html',
  'assets/app.v2945.js',
  'assets/app.v2945.css',
  'assets/major-name-model.v2945.js',
  'assets/app.v2946.js',
  'assets/app.v2946.css',
  'assets/major-name-model.v2946.js',
  'data/manifest.json',
  'data/chunks/rank_00000_10000.json',
  'data/major_name_model/v2944_manifest.json',
  'data/parent_interest_model/v2945_manifest.json',
  'data/parent_interest_model/parent_interest_rules_v2945.json',
  'data/parent_interest_model/parent_interest_quality_report_v2945.json'
];
required.forEach(exists);

const index = fs.readFileSync(path.join(root,'index.html'),'utf8');
const appMatch=index.match(/assets\/(app\.v\d+(?:fix2|fix)?\.js)/);
const cssMatch=index.match(/assets\/(app\.v\d+(?:fix2|fix)?\.css)/);
if(!appMatch || !cssMatch) throw new Error('index.html does not load current app js/css');

const appPath = 'assets/' + appMatch[1];
const app = fs.readFileSync(path.join(root,appPath),'utf8');
['renderParentInterestPanelV2945','admissionIdentityV2945','rankTrendV2945','candidateAdviceV2945'].forEach(fn=>{
  if(!app.includes('function '+fn)) throw new Error('missing function: '+fn);
});

const manifest = readJson('data/parent_interest_model/v2945_manifest.json');
const quality = readJson('data/parent_interest_model/parent_interest_quality_report_v2945.json');
const rules = readJson('data/parent_interest_model/parent_interest_rules_v2945.json');

if(manifest.version !== 'V2.9.4.5') throw new Error('bad manifest version');
if(!quality.overall_passed) throw new Error('quality_report overall_passed is false');
if(!rules.rules || rules.rules.length < 6) throw new Error('too few parent interest rules');

const baseManifest = readJson('data/manifest.json');
if(!baseManifest.totalRecords || baseManifest.totalRecords < 10000) throw new Error('base manifest records too small');

console.log('V2.9.4.6 parent-interest compatibility validation passed');
console.log(JSON.stringify({
  baseRecords: baseManifest.totalRecords,
  parentStats: manifest.stats,
  ruleCount: rules.rules.length
}, null, 2));
