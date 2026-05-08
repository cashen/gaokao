const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(p){ return fs.readFileSync(path.join(root,p),'utf8'); }
const index = read('index.html');
const app = read('assets/app.v2951.js');
const rules = read('assets/rules.v2951.js');
const css = read('assets/app.v2951.css');
const required = [
  ['index references rules', index.includes('assets/rules.v2951.js')],
  ['index references app v2951', index.includes('assets/app.v2951.js')],
  ['rules global exists', rules.includes('window.LN_GAOKAO_RULES_V2951')],
  ['scenarioPresets exists', rules.includes('scenarioPresets')],
  ['12 scenarios include edgeBachelor', rules.includes('edgeBachelor')],
  ['app reads rules', app.includes('rulesV2951') && app.includes('scenarioRuleV2951')],
  ['strategy cards rendered from rules', app.includes('renderStrategyCardsV2951')],
  ['applyStrategy uses scenario preset', app.includes('applyScenarioPresetV2951(type)')],
  ['plan bias connected', app.includes('scenarioPlanBiasV2951(type)')],
  ['advanced full mode helper exists', app.includes('switchFullModeV2951')],
  ['css scenario styles exist', css.includes('scenario-explain-v2951')],
];
const failed = required.filter(x=>!x[1]);
if(failed.length){ console.error('V2.9.5.1 validation failed:'); failed.forEach(x=>console.error('-',x[0])); process.exit(1); }
console.log('V2.9.5.1 release validation passed');
