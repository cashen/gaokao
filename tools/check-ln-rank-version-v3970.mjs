import fs from 'node:fs';

const files = [
  ['ln-rank/index.html', ['app.v3970.js', 'V3.9.7.0']],
  ['ln-rank/selection-pool.html', ['selection-pool.v3970.js', 'V3.9.7.0']],
  ['ln-rank/js/shared/release-meta.v3970.js', ['v3.9.7.0', 'v3970']],
  ['ln-rank/ai-diagnostics.html', ['AI 双接口诊断自检', '/api/card-diagnose', '/api/path-analysis']]
];

let ok = true;
for (const [file, needles] of files) {
  const text = fs.readFileSync(file, 'utf8');
  for (const needle of needles) {
    if (!text.includes(needle)) {
      console.error(`[FAIL] ${file} missing ${needle}`);
      ok = false;
    }
  }
}

const forbidden = [
  ['ln-rank/index.html', 'v3969.js?v=3969'],
  ['ln-rank/selection-pool.html', 'v3969.js?v=3969']
];
for (const [file, needle] of forbidden) {
  const text = fs.readFileSync(file, 'utf8');
  if (text.includes(needle)) {
    console.error(`[FAIL] ${file} still contains ${needle}`);
    ok = false;
  }
}

if (!ok) process.exit(1);
console.log('ln-rank v3970 version check passed');
