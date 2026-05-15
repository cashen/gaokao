#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
function ok(name, cond){ if(cond){ console.log('PASS', name); pass++; } else { console.error('FAIL', name); fail++; } }
function read(p){ return fs.readFileSync(path.join(root,p),'utf8'); }
function exists(p){ return fs.existsSync(path.join(root,p)); }
function sha(p){ return crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex'); }
const idx = read('index.html');
ok('version title', idx.includes('V2.91RC0.rules-closure4.family-read1.frontfix1'));
ok('version stamp', idx.includes('291rc0familyread1frontfix1-20260514'));
ok('frontfix css exists', exists('assets/family-read-frontfix.v291rc0familyread1frontfix1.css'));
ok('frontfix js exists', exists('assets/family-read-frontfix.v291rc0familyread1frontfix1.js'));
ok('index loads frontfix css', idx.includes('family-read-frontfix.v291rc0familyread1frontfix1.css'));
ok('index loads frontfix js', idx.includes('family-read-frontfix.v291rc0familyread1frontfix1.js'));
const js = read('assets/family-read-frontfix.v291rc0familyread1frontfix1.js');
const css = read('assets/family-read-frontfix.v291rc0familyread1frontfix1.css');
ok('js debug flag', js.includes('familyReadFrontFix'));
ok('js keeps tag count', js.includes('tagCountPreserved:true'));
ok('js says no formula change', js.includes('doesModifyFormula:false'));
ok('css reduces big cta', css.includes('.family-detail-toggle-v291'));
ok('css makes detail button auto width', css.includes('width:auto!important'));
ok('css hides checkbox-like review mark', css.includes("content:''!important"));
ok('css weakens add button', css.includes('.decision-actions-v2981 button'));
ok('docs update exists', exists('docs/V2.91RC0.rules-closure4.family-read1.frontfix1_更新说明.md'));
ok('docs checklist exists', exists('docs/V2.91RC0.rules-closure4.family-read1.frontfix1_验证清单.md'));
const protectedFiles = [
  'assets/compute-pipeline.v2983.js',
  'assets/filter-engine.v298fix1.js',
  'assets/plan-engine.v297fix2.js',
  'assets/region-filter-rules.v2983fix5.js',
  'assets/rules-interest-core.v291rc0rules1.js',
  'assets/rules-decision-core.v291rc0rules1.js',
  'assets/child-interest-runtime.v298fix1.js',
  'assets/catalog-interest-binding.v298.js',
  'assets/catalog-match-engine.v298.js',
  'assets/rules-closure.v291rc0closure4.js'
];
for(const f of protectedFiles){ ok(`protected exists ${f}`, exists(f)); }
console.log(`SUMMARY PASS ${pass} / FAIL ${fail}`);
process.exit(fail?1:0);
