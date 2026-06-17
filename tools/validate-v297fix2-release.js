const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const fenxi = path.join(root, 'fenxi');
const required = [
  'index.html',
  'diagnostics.html',
  'assets/app.v297fix2.css',
  'assets/app.v297fix2.js',
  'assets/theme-tokens.v297fix2.js',
  'assets/qualification-gate-ui.v297fix2.js'
];
const missing = required.filter(p => !fs.existsSync(path.join(fenxi, p)));
if (missing.length) {
  console.error('Missing files:', missing);
  process.exit(1);
}
const index = fs.readFileSync(path.join(fenxi, 'index.html'), 'utf8');
if (!index.includes('V2.9.7.fix2')) {
  console.error('index.html version marker missing');
  process.exit(1);
}
if (!index.includes('app.v297fix2.css')) {
  console.error('index.html css reference not upgraded');
  process.exit(1);
}
console.log('V2.9.7.fix2 validation passed');
