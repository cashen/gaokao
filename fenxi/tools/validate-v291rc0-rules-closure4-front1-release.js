#!/usr/bin/env node
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const requiredHashes={
  "assets/compute-pipeline.v2983.js": "e13b600b1344168b8f362a05b81d3280c20bb114bdcd20b39a57e8a53ce48425",
  "assets/filter-engine.v298fix1.js": "554534209df5090ffc56bb43d44d3dfc008cf28a77b136932ccb1a3e73a4e5cc",
  "assets/plan-engine.v297fix2.js": "6784b9d103cbaf33277bffff3b4711cbea6b97748563fad6d2d0c60fc3c29069",
  "assets/region-filter-rules.v2983fix5.js": "ae05166286f1fea36f3e4d3f34574872eaff028f5770b27b52c54fc0bf095610",
  "assets/rules-interest-core.v291rc0rules1.js": "229e5641e3d3f2a1d565688fb248f54c175c51c23a49a375d09f8a4e680fcfda",
  "assets/rules-decision-core.v291rc0rules1.js": "23ac43c750666b394be28e4f3067244143baaf789653dc029a25618cf86d49c5",
  "assets/child-interest-runtime.v298fix1.js": "4f719670d9f71c6ab539445d744939c791b417afdedf20a07afe1b0e2c85ef41",
  "assets/catalog-interest-binding.v298.js": "bb73ec5be18591a93e0ffe33b90cb13569fe0f483054c4a8b6a23f6b4683d793",
  "assets/catalog-match-engine.v298.js": "c5e2992a5f917cb9dee853047381e71ca6ece8f71bbb07f7a1e0a900eb02b387",
  "assets/rules-closure.v291rc0closure4.js": "1ff13bbfe53a6449c6a6f00fabdcd2f29a519997e40606c95a9069c2f1b3ae03"
};
let pass=0, fail=0;
function ok(name,cond,detail=''){ if(cond){console.log('PASS',name,detail);pass++;} else {console.error('FAIL',name,detail);fail++;} }
function read(p){ return fs.readFileSync(path.join(root,p),'utf8'); }
function exists(p){ return fs.existsSync(path.join(root,p)); }
function sha(p){ return crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex'); }
const index=read('index.html');
ok('version title',index.includes('V2.91RC0.rules-closure4.front1'));
ok('version stamp',index.includes('291rc0front1-20260514'));
ok('frontend css exists',exists('assets/frontend-trust.v291rc0front1.css'));
ok('frontend js exists',exists('assets/frontend-trust.v291rc0front1.js'));
ok('index loads frontend css',index.includes('assets/frontend-trust.v291rc0front1.css'));
ok('index loads frontend js',index.includes('assets/frontend-trust.v291rc0front1.js'));
ok('closure4 still loaded',index.includes('assets/rules-closure.v291rc0closure4.js'));
ok('parent trust still loaded',index.includes('assets/parent-trust.v291rc0parenttrust2.js'));
for(const [p,h] of Object.entries(requiredHashes)){ ok('hash unchanged '+p,sha(p)===h); }
const css=read('assets/frontend-trust.v291rc0front1.css');
ok('css warm palette',css.includes('--ft-bg')&&css.includes('--ft-gold')&&css.includes('--ft-dark'));
ok('css risk separate',css.includes('--ft-risk')&&css.includes('风险'));
const js=read('assets/frontend-trust.v291rc0front1.js');
ok('js debug flags',js.includes('frontendTrust')&&js.includes('doesModifyFormula:false'));
console.log(`Validation complete: PASS ${pass} / FAIL ${fail}`);
process.exit(fail?1:0);
