const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function must(file){
  const p = path.join(root, file);
  if(!fs.existsSync(p)) throw new Error(`Missing: ${file}`);
  return fs.readFileSync(p, 'utf8');
}
const index = must('index.html');
const js = must('assets/app.v29461.js');
const css = must('assets/app.v29461.css');
const conf = must('data/confusable_major_model/v2946_manifest.json');
const requiredIndex = ['app.v29461.css','app.v29461.js','confusable-major-model.v2946.js'];
for(const x of requiredIndex){ if(!index.includes(x)) throw new Error(`index.html missing ${x}`); }
const requiredJs = [
  'CARD_VIEW_MODE_KEY_V29461',
  'ensureCardViewModeToolbarV29461',
  'setCardViewModeV29461',
  'primarySummaryV29461',
  'riskBadgesV29461',
  'confusable-v29461',
  'parent-insight-v29461'
];
for(const x of requiredJs){ if(!js.includes(x)) throw new Error(`app.v29461.js missing ${x}`); }
const requiredCss = ['view-mode-toolbar-v29461','card-mode-compact','confusable-v29461','parent-insight-v29461','summary-v29461'];
for(const x of requiredCss){ if(!css.includes(x)) throw new Error(`app.v29461.css missing ${x}`); }
JSON.parse(conf);
console.log('V2.9.4.6.1 card-density validation passed.');
