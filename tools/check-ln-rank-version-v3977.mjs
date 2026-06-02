import fs from 'node:fs';

const checks = [
  ['ln-rank/index.html', ['app.v3977.js', 'keyword-preset.v3977.css', 'match-badge.v3977.css', 'code-trust.v3977.css', 'parent-copy.v3977.css', 'V3.9.7.7', '辽宁物理类专业初选参考工具', '主要参考']],
  ['ln-rank/selection-pool.html', ['selection-pool.v3977.js', 'code-trust.v3977.css', 'parent-copy.v3977.css', 'V3.9.7.7', '我的自选专业', '检查这套方案']],
  ['ln-rank/js/app.v3977.js', ['keyword-chip-render.v3977.js', 'major-pool-render.v3977.js', 'selection-pool-controller.v3977.js']],
  ['ln-rank/js/shared/release-meta.v3977.js', ['v3.9.7.7', 'v3977', 'parent-copy-and-diagnosis-cleanup']],
  ['ln-rank/js/feature/major-pool/major-pool-render.v3977.js', ['加入自选专业', '单条解读', 'match-copy-help']],
  ['ln-rank/js/selection-pool.v3977.js', ['检查这套方案', '生成家庭讨论报告', '生成带解读的报告', '自选专业']],
  ['functions/_lib/diagnosis-copy-normalizer.js', ['normalizeDiagnosisCopy', '自选专业', '后段是否够稳']],
  ['functions/_lib/parent-copy-policy.js', ['PARENT_COPY_POLICY', '主要参考', '自选专业']],
  ['functions/api/path-analysis.js', ['normalizeDiagnosisCopy', '检查这套方案', '自选专业']],
  ['functions/_lib/feishu-selection-pool-report-builder.js', ['自选专业', '家庭讨论', '专业代码']],
  ['ln-rank/css/parent-copy.v3977.css', ['parent-copy-note', 'match-copy-help']]
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
for (const old of ['app.v3976.js?v=3976', 'selection-pool.v3976.js?v=3976', 'V3.9.7.6']) {
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
console.log('v3977 check passed');
