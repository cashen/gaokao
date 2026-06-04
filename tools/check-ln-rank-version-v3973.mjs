import fs from 'node:fs';

const checks = [
  ['ln-rank/index.html', ['app.v3973.js', 'keyword-preset.v3973.css', 'match-badge.v3973.css', 'V3.9.7.3']],
  ['ln-rank/selection-pool.html', ['selection-pool.v3973.js', 'V3.9.7.3']],
  ['ln-rank/js/app.v3973.js', ['keyword-chip-render.v3973.js', 'major-pool-render.v3973.js']],
  ['ln-rank/js/shared/release-meta.v3973.js', ['v3.9.7.3', 'v3973', 'keyword-match-trust-policy']],
  ['ln-rank/css/keyword-preset.v3973.css', ['tone-project', 'keyword-chip-badge']],
  ['ln-rank/css/match-badge.v3973.css', ['match-trust-badge', 'match-reason']],
  ['functions/_lib/keyword-match-policy.js', ['电力', '精准匹配', '相关方向', '行业关联', '项目属性']],
  ['functions/_lib/keyword-match-scorer.js', ['evaluateKeywordMatch']],
  ['functions/api/major-bands.js', ['matchSummary', 'matchLevel', 'matchReason']]
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
console.log('v3973 check passed');
