const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
function ok(name, cond){ if(cond){ console.log('PASS', name); pass++; } else { console.error('FAIL', name); fail++; } }
function read(p){ return fs.readFileSync(path.join(root,p),'utf8'); }
function exists(p){ return fs.existsSync(path.join(root,p)); }
function sha(p){ return crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex'); }
const index = read('index.html');
ok('version family-read1', index.includes('V2.91RC0.rules-closure4.family-read1'));
ok('stamp familyread1', index.includes('291rc0familyread1-20260514'));
ok('css exists', exists('assets/family-read.v291rc0familyread1.css'));
ok('js exists', exists('assets/family-read.v291rc0familyread1.js'));
ok('index loads css', index.includes('assets/family-read.v291rc0familyread1.css'));
ok('index loads js', index.includes('assets/family-read.v291rc0familyread1.js'));
ok('familyRead version global', index.includes('LN_FAMILY_READ_VERSION'));
ok('lineage familyRead', index.includes("familyRead:'291rc0familyread1-20260514'"));
const js = read('assets/family-read.v291rc0familyread1.js');
ok('debug flag familyRead', js.includes('familyRead:VERSION'));
ok('tag count preserved', js.includes('tagCountPreserved:true'));
ok('does not modify formula flag', js.includes('doesModifyFormula:false'));
ok('copy family group summary', js.includes('copyFamilyGroupSummary'));
ok('main contradictions', js.includes('getMainContradictions'));
ok('family group copy action', js.includes('copy-group'));
ok('review checklist', js.includes('family-review-list-v291'));
const css = read('assets/family-read.v291rc0familyread1.css');
ok('family read body class css', css.includes('family-read-v291rc0familyread1'));
ok('report panel css', css.includes('family-read-panel-v291'));
ok('compact card css', css.includes('family-card-compact'));
ok('review checklist css', css.includes('family-review-list-v291'));
const core = {
  'assets/compute-pipeline.v2983.js':'e13b600b1344168b8f362a05b81d3280c20bb114bdcd20b39a57e8a53ce48425',
  'assets/filter-engine.v298fix1.js':'554534209df5090ffc56bb43d44d3dfc008cf28a77b136932ccb1a3e73a4e5cc',
  'assets/plan-engine.v297fix2.js':'6784b9d103cbaf33277bffff3b4711cbea6b97748563fad6d2d0c60fc3c29069',
  'assets/region-filter-rules.v2983fix5.js':'ae05166286f1fea36f3e4d3f34574872eaff028f5770b27b52c54fc0bf095610',
  'assets/rules-interest-core.v291rc0rules1.js':'229e5641e3d3f2a1d565688fb248f54c175c51c23a49a375d09f8a4e680fcfda',
  'assets/rules-decision-core.v291rc0rules1.js':'23ac43c750666b394be28e4f3067244143baaf789653dc029a25618cf86d49c5',
  'assets/child-interest-runtime.v298fix1.js':'4f719670d9f71c6ab539445d744939c791b417afdedf20a07afe1b0e2c85ef41',
  'assets/catalog-interest-binding.v298.js':'bb73ec5be18591a93e0ffe33b90cb13569fe0f483054c4a8b6a23f6b4683d793',
  'assets/catalog-match-engine.v298.js':'c5e2992a5f917cb9dee853047381e71ca6ece8f71bbb07f7a1e0a900eb02b387',
  'assets/rules-closure.v291rc0closure4.js':'1ff13bbfe53a6449c6a6f00fabdcd2f29a519997e40606c95a9069c2f1b3ae03'
};
for(const [file,hash] of Object.entries(core)) ok('hash unchanged '+file, sha(file)===hash);
ok('docs update exists', exists('docs/V2.91RC0.rules-closure4.family-read1_更新说明.md'));
ok('docs checklist exists', exists('docs/V2.91RC0.rules-closure4.family-read1_验证清单.md'));
console.log(`RESULT PASS ${pass} / FAIL ${fail}`);
if(fail) process.exit(1);
