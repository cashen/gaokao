import fs from 'node:fs';

const checks = [
  ['ln-rank/index.html', 'app.v3966.js'],
  ['ln-rank/index.html', 'search-workbench.v3966.css'],
  ['ln-rank/index.html', 'floating-pool-entry.v3966.css'],
  ['ln-rank/selection-pool.html', 'selection-pool.v3966.js'],
  ['ln-rank/selection-pool.html', 'layout-shell.v3966.css'],
  ['ln-rank/js/shared/release-meta.v3966.js', 'v3.9.6.6']
];

for (const [file, needle] of checks) {
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes(needle)) {
    throw new Error(`${file} missing ${needle}`);
  }
}

const index = fs.readFileSync('ln-rank/index.html', 'utf8');
if (/app\.v3965\.js/.test(index) || /search-workbench\.v3965\.css/.test(index)) {
  throw new Error('index.html still references v3965');
}
const pool = fs.readFileSync('ln-rank/selection-pool.html', 'utf8');
if (/selection-pool\.v3965\.js/.test(pool)) {
  throw new Error('selection-pool.html still references v3965');
}

console.log('ln-rank v3966 version check passed');
