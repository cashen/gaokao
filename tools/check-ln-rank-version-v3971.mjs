import fs from 'node:fs';
const checks = [
  ['ln-rank/index.html', ['app.v3971.js', 'V3.9.7.1', 'keyword-preset.v3971.css']],
  ['ln-rank/selection-pool.html', ['selection-pool.v3971.js', 'V3.9.7.1']],
];
let ok = true;
for (const [file, needles] of checks) {
  const text = fs.readFileSync(file, 'utf8');
  for (const needle of needles) {
    if (!text.includes(needle)) { console.error(`${file} missing ${needle}`); ok = false; }
  }
  for (const old of ['app.v3970.js', 'selection-pool.v3970.js', 'V3.9.7.0']) {
    if (text.includes(old)) { console.error(`${file} still references ${old}`); ok = false; }
  }
}
if (!ok) process.exit(1);
console.log('ln-rank version references OK: v3971');
