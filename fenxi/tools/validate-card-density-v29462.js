const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function exists(p){ return fs.existsSync(path.join(root,p)); }
function assert(cond,msg){ if(!cond){ console.error('FAIL:',msg); process.exit(1); } }
const index = fs.readFileSync(path.join(root,'index.html'),'utf8');
['assets/app.v29462.css','assets/app.v29462.js','assets/confusable-major-model.v29462.js'].forEach(x=>assert(index.includes(x), 'index references '+x));
['assets/app.v29462.css','assets/app.v29462.js','assets/confusable-major-model.v29462.js'].forEach(x=>assert(exists(x), 'file exists '+x));
assert(index.includes('V2.9.4.6.2'), 'footer version');
console.log('OK V2.9.4.6.2 front-end reference validation passed');
