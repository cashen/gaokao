const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function exists(p){ return fs.existsSync(path.join(root,p)); }
function assert(cond,msg){ if(!cond){ console.error('FAIL:',msg); process.exit(1); } }
const index = fs.readFileSync(path.join(root,'index.html'),'utf8');
const appJs=(index.match(/assets\/(app\.v\d+\.js)/)||[])[1];
const appCss=(index.match(/assets\/(app\.v\d+\.css)/)||[])[1];
assert(appJs && appCss, 'index references current app js/css');
['assets/'+appCss,'assets/'+appJs,'assets/confusable-major-model.v29462.js'].forEach(x=>assert(exists(x), 'file exists '+x));
assert(index.includes('confusable-major-model.v29462.js'), 'index keeps warning-side confusable model');
assert(index.includes('V2.9.4.7.2') || index.includes('V2.9.4.6.2'), 'footer/current version');
console.log('OK front-end reference validation passed for '+appJs+' / '+appCss);
