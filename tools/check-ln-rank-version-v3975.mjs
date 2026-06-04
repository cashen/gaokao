import fs from 'node:fs';

const checks = [
  ['ln-rank/index.html', ['app.v3975.js', 'keyword-preset.v3975.css', 'match-badge.v3975.css', 'code-trust.v3975.css', 'V3.9.7.5']],
  ['ln-rank/selection-pool.html', ['selection-pool.v3975.js', 'code-trust.v3975.css', 'V3.9.7.5']],
  ['ln-rank/js/app.v3975.js', ['keyword-chip-render.v3975.js', 'major-pool-render.v3975.js', 'selection-pool-controller.v3975.js']],
  ['ln-rank/js/shared/release-meta.v3975.js', ['v3.9.7.5', 'v3975', 'major-code-full-chain']],
  ['ln-rank/js/feature/major-pool/major-pool-render.v3975.js', ['renderMajorCode', '专业代码：', '专业类：']],
  ['ln-rank/js/selection-pool.v3975.js', ['itemCodeText', '专业代码', '专业类']],
  ['ln-rank/js/feature/selection-pool/selection-pool-store.v3949.js', ['standardMajor', 'codes']],
  ['functions/_lib/fenxi-code-normalizer.js', ['rawFenxiMajorCode', '专业代码”统一指']],
  ['functions/_lib/standard-major-mapper.js', ['mapStandardMajor']],
  ['functions/api/major-bands.js', ['record.standardMajor', 'rawFenxiMajorCode']]
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

const currentHtml = fs.readFileSync('ln-rank/index.html', 'utf8') + fs.readFileSync('ln-rank/selection-pool.html', 'utf8');
for (const old of ['app.v3974.js?v=3974', 'selection-pool.v3974.js?v=3974', 'V3.9.7.4']) {
  if (currentHtml.includes(old)) {
    console.error(`[FAIL] html still references ${old}`);
    ok = false;
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
console.log('v3975 check passed');
