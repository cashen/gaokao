const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function must(file){
  const p = path.join(root, file);
  if(!fs.existsSync(p)) throw new Error(`Missing: ${file}`);
  return fs.readFileSync(p, 'utf8');
}
const index = must('index.html');
const appRef = (index.match(/assets\/(app\.v\d+\.js)/)||[])[1] || 'app.v29461.js';
const cssRef = (index.match(/assets\/(app\.v\d+\.css)/)||[])[1] || 'app.v29461.css';
const js = must('assets/' + appRef);
const css = must('assets/' + cssRef);
const conf = must('data/confusable_major_model/v2946_manifest.json');
const requiredIndex = ['confusable-major-model.v29462.js','major-name-model.v2946.js'];
for(const x of requiredIndex){ if(!index.includes(x)) throw new Error(`index.html missing ${x}`); }
if(!/app\.v\d+\.css/.test(index) || !/app\.v\d+\.js/.test(index)) throw new Error('index.html missing current app js/css');
const requiredJs = [
  'CARD_VIEW_MODE_KEY_V29461',
  'ensureCardViewModeToolbarV29461',
  'setCardViewModeV29461',
  'primarySummaryV29461',
  'riskBadgesV29461',
  'confusable-v29461',
  'parent-insight-v29461'
];
for(const x of requiredJs){ if(!js.includes(x)) throw new Error(`${appRef} missing ${x}`); }
const requiredCss = ['view-mode-toolbar-v29461','card-mode-compact','confusable-v29461','parent-insight-v29461','summary-v29461'];
for(const x of requiredCss){ if(!css.includes(x)) throw new Error(`${cssRef} missing ${x}`); }
JSON.parse(conf);
console.log('card-density compatibility validation passed for '+appRef+' / '+cssRef);
