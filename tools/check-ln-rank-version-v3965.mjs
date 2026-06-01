import fs from 'node:fs';
const checks = [
  ['ln-rank/index.html', 'app.v3965.js'],
  ['ln-rank/selection-pool.html', 'selection-pool.v3965.js'],
  ['ln-rank/index.html', 'search-workbench.v3965.css'],
  ['ln-rank/js/shared/release-meta.v3965.js', 'v3.9.6.5']
];
let ok = true;
for (const [file, text] of checks) {
  const body = fs.readFileSync(file, 'utf8');
  if (!body.includes(text)) {
    console.error(`FAIL ${file}: missing ${text}`);
    ok = false;
  }
}
if (!ok) process.exit(1);
console.log('v3965 version checks passed');
