import fs from 'node:fs';
const files = ['ln-rank/index.html', 'ln-rank/selection-pool.html'];
const expected = ['app.v3964.js', 'selection-pool.v3964.js'];
let ok = true;
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  for (const old of ['app.v3963.js', 'selection-pool.v3963.js', 'app.v3962.js', 'selection-pool.v3962.js']) {
    if (text.includes(old)) { console.error(`${file} still references ${old}`); ok = false; }
  }
}
for (const exp of expected) {
  const found = files.some(f => fs.readFileSync(f, 'utf8').includes(exp));
  if (!found) { console.error(`Missing reference: ${exp}`); ok = false; }
}
if (!ok) process.exit(1);
console.log('ln-rank version references OK: v3964');
