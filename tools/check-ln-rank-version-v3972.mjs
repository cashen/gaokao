import fs from 'node:fs';

const checks = [
  ['ln-rank/index.html', ['app.v3972.js', 'keyword-preset.v3972.css', 'V3.9.7.2']],
  ['ln-rank/selection-pool.html', ['selection-pool.v3972.js', 'V3.9.7.2']],
  ['ln-rank/js/app.v3972.js', ['keyword-chip-render.v3972.js', 'major-pool-render.v3972.js']],
  ['ln-rank/js/shared/release-meta.v3972.js', ['v3.9.7.2', 'v3972']],
  ['ln-rank/css/keyword-preset.v3972.css', ['tone-project', 'keyword-chip-badge']]
];

let ok = true;
for (const [file, patterns] of checks) {
  const text = fs.readFileSync(file, 'utf8');
  for (const pattern of patterns) {
    if (!text.includes(pattern)) {
      console.error(`[FAIL] ${file} missing ${pattern}`);
      ok = false;
    }
  }
}

const forbiddenPaths = ['fenxi/', 'functions/fenxi/', 'functions/_middleware.js'];
for (const p of forbiddenPaths) {
  if (fs.existsSync(p)) {
    console.error(`[FAIL] forbidden path exists: ${p}`);
    ok = false;
  }
}

if (!ok) process.exit(1);
console.log('v3972 check passed');
