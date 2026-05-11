const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function assert(cond, msg){ if(!cond){ console.error('FAIL:', msg); process.exit(1); } }
function read(p){ return fs.readFileSync(path.join(root,p),'utf8'); }
const index = read('fenxi/index.html');
const diag = read('fenxi/diagnostics.html');
assert(index.includes('v296fix2'), 'index should reference v296fix2');
assert(diag.includes('v296fix2'), 'diagnostics should reference v296fix2');
const assetFiles = [...index.matchAll(/"(assets\/[^"]+\.js)"/g)].map(m=>m[1]);
assetFiles.forEach(f=>assert(fs.existsSync(path.join(root,'fenxi',f)), 'missing '+f));
const major = read('fenxi/assets/major-name-model.v2946.js');
const conf = read('fenxi/assets/confusable-major-model.v29462.js');
assert(!major.includes('loadMajorNameModelV2944({withEntryIndex:false}).catch'), 'major model should not auto preload');
assert(!conf.includes('loadConfusableMajorModelV2946().catch'), 'confusable model should not auto preload');
assert(major.includes('LN_MAJOR_NAME_MODEL_2944_DEFERRED'), 'major deferred flag missing');
assert(conf.includes('LN_CONFUSABLE_MAJOR_MODEL_2946_DEFERRED'), 'confusable deferred flag missing');
const app = read('fenxi/assets/app.v296fix2.js');
assert(app.includes('loadMajorNameModelV2944({withEntryIndex:false})'), 'app should load major model after auth boot');
assert(app.includes('loadConfusableMajorModelV2946()'), 'app should load confusable model after auth boot');
for(const f of fs.readdirSync(path.join(root,'fenxi/assets')).filter(x=>x.endsWith('.js'))){
  new Function(read('fenxi/assets/'+f));
}
console.log('V2.9.6.fix2 validation passed');
