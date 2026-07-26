#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const write = (rel, text) => {
  const target = path.join(root, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, text, 'utf8');
};
const update = (rel, mutate) => {
  const before = read(rel);
  const after = mutate(before);
  if (after !== before) write(rel, after);
};
const replaceRequired = (source, from, to, label) => {
  if (source.includes(to)) return source;
  if (!source.includes(from)) throw new Error(`${label}: missing ${from}`);
  return source.replaceAll(from, to);
};

write(
  'ln-rank/js/shared/feishu-api-client.v3966_0.js',
  replaceRequired(
    read('ln-rank/js/shared/feishu-api-client.v3964_0.js'),
    '../../../shared/resources/reports/feishu-report-contract.v3964_0.js?v=3964_0',
    '../../../shared/resources/reports/feishu-report-contract.v3966_0.js?v=3966_0',
    'Feishu shared client contract'
  )
);
write(
  'ln-rank/js/feature/feishu/report-api.v3966_0.js',
  replaceRequired(
    replaceRequired(
      read('ln-rank/js/feature/feishu/report-api.v3964_0.js'),
      '../../../../shared/resources/reports/feishu-report-contract.v3964_0.js?v=3964_0',
      '../../../../shared/resources/reports/feishu-report-contract.v3966_0.js?v=3966_0',
      'current report API contract'
    ),
    '../../shared/feishu-api-client.v3964_0.js?v=3964_0',
    '../../shared/feishu-api-client.v3966_0.js?v=3966_0',
    'current report API client'
  )
);
write(
  'ln-rank/js/feature/selection-pool/feishu-report-api.v3966_0.js',
  replaceRequired(
    replaceRequired(
      read('ln-rank/js/feature/selection-pool/feishu-report-api.v3964_0.js'),
      '../../../../shared/resources/reports/feishu-report-contract.v3964_0.js?v=3964_0',
      '../../../../shared/resources/reports/feishu-report-contract.v3966_0.js?v=3966_0',
      'selection report API contract'
    ),
    '../../shared/feishu-api-client.v3964_0.js?v=3964_0',
    '../../shared/feishu-api-client.v3966_0.js?v=3966_0',
    'selection report API client'
  )
);
write(
  'ln-rank/js/feature/selection-pool/index.v3966_0.js',
  replaceRequired(
    read('ln-rank/js/feature/selection-pool/index.v3964_0.js'),
    './feishu-report-api.v3964_0.js?v=3964_0',
    './feishu-report-api.v3966_0.js?v=3966_0',
    'selection pool report export'
  )
);
update('ln-rank/js/feature/feishu/report-controller.v3966_0.js', source => replaceRequired(source, './report-api.v3964_0.js?v=3964_0', './report-api.v3966_0.js?v=3966_0', 'current report controller'));
update('ln-rank/js/feature/feishu/index.v3966_0.js', source => replaceRequired(source, './report-api.v3964_0.js?v=3964_0', './report-api.v3966_0.js?v=3966_0', 'current report barrel'));
update('ln-rank/js/selection-pool-runtime.v3966_0.js', source => replaceRequired(source, './feature/selection-pool/index.v3964_0.js?v=3964_0', './feature/selection-pool/index.v3966_0.js?v=3966_0', 'selection pool runtime owner'));

update('shared/resources/release/runtime-cache-contract.v3966_0.js', source => {
  if (source.includes("'/ln-rank/js/shared/feishu-api-client.v3966_0.js'")) return source;
  return source.replace(
    "    '/ln-rank/js/feature/feishu/report-controller.v3966_0.js',\n",
    "    '/ln-rank/js/feature/feishu/report-controller.v3966_0.js',\n    '/ln-rank/js/feature/feishu/report-api.v3966_0.js',\n    '/ln-rank/js/shared/feishu-api-client.v3966_0.js',\n    '/ln-rank/js/feature/selection-pool/index.v3966_0.js',\n    '/ln-rank/js/feature/selection-pool/feishu-report-api.v3966_0.js',\n"
  );
});

for (const rel of ['ln-rank/active-assets.json', 'ln-rank/release-meta.json']) {
  const data = JSON.parse(read(rel));
  const replacements = new Map([
    ['js/feature/feishu/report-api.v3964_0.js', 'js/feature/feishu/report-api.v3966_0.js'],
    ['js/feature/selection-pool/index.v3964_0.js', 'js/feature/selection-pool/index.v3966_0.js'],
    ['js/feature/selection-pool/feishu-report-api.v3964_0.js', 'js/feature/selection-pool/feishu-report-api.v3966_0.js'],
    ['js/shared/feishu-api-client.v3964_0.js', 'js/shared/feishu-api-client.v3966_0.js']
  ]);
  data.jsEntry = (data.jsEntry || []).map(value => replacements.get(value) || value);
  data.reportFrontendVersion = 'feishu-browser-v3966_0';
  data.feishuFrontendRuntimeVersion = 'feishu-browser-v3966_0';
  data.feishuOperationOwnerVersion = 'feishu-operation-owner-v3966_0';
  data.feishuTransportContract = true;
  write(rel, `${JSON.stringify(data, null, 2)}\n`);
}

update('_headers', source => {
  if (source.includes('/ln-rank/js/feature/feishu/report-api.v3966_0.js')) return source;
  return `${source}\n/ln-rank/js/feature/feishu/report-api.v3966_0.js\n  Cache-Control: public, max-age=31536000, immutable\n/ln-rank/js/shared/feishu-api-client.v3966_0.js\n  Cache-Control: public, max-age=31536000, immutable\n/ln-rank/js/feature/selection-pool/index.v3966_0.js\n  Cache-Control: public, max-age=31536000, immutable\n/ln-rank/js/feature/selection-pool/feishu-report-api.v3966_0.js\n  Cache-Control: public, max-age=31536000, immutable\n`;
});

update('tools/prepare-release-v3966.mjs', source => {
  let next = source;
  if (!next.includes("['js/feature/feishu/report-api.v3964_0.js','js/feature/feishu/report-api.v3966_0.js']")) {
    next = next.replace(
      "  ['js/feature/report/payload-builder.v3964_0.js','js/feature/report/payload-builder.v3966_0.js']\n",
      "  ['js/feature/report/payload-builder.v3964_0.js','js/feature/report/payload-builder.v3966_0.js'],\n  ['js/feature/feishu/report-api.v3964_0.js','js/feature/feishu/report-api.v3966_0.js'],\n  ['js/feature/selection-pool/index.v3964_0.js','js/feature/selection-pool/index.v3966_0.js'],\n  ['js/feature/selection-pool/feishu-report-api.v3964_0.js','js/feature/selection-pool/feishu-report-api.v3966_0.js'],\n  ['js/shared/feishu-api-client.v3964_0.js','js/shared/feishu-api-client.v3966_0.js']\n"
    );
  }
  if (!next.includes('feishuTransportContract:true')) {
    next = next.replace('   undergraduatePopulationPolicyContract:true\n', '   undergraduatePopulationPolicyContract:true,\n   feishuTransportContract:true\n');
  }
  return next;
});

update('tools/verify-card-ai-2026-v3955.mjs', source => {
  let next = source.replace(
    '/辽宁2026物理类专业最低投档分、最低投档位次和一分一段为主事实/',
    '/辽宁2026物理类专业最低投档分、同分位次区间和一分一段为主事实/'
  );
  if (!next.includes('位次冲突、仅有分数或没有同口径记录的年份不得参与趋势')) {
    next = next.replace(
      'assert.match(YEAR_CALIBER_KB.aiCopy, /2027招生计划/);',
      "assert.match(YEAR_CALIBER_KB.aiCopy, /2025、2024只作严格同口径历史对照/);\nassert.match(YEAR_CALIBER_KB.aiCopy, /位次冲突、仅有分数或没有同口径记录的年份不得参与趋势/);\nassert.match(YEAR_CALIBER_KB.aiCopy, /2027招生计划/);"
    );
  }
  return next;
});

update('tools/tongxue/verify-directory.mjs', source => {
  let next = source.replace("readFile('tongxue/app/tongxue-runtime-v159.js', 'utf8'),", "readFile('tongxue/app/tongxue-runtime-v159-r3966.js', 'utf8'),");
  next = next.replace("requireText(page, './app/tongxue-runtime-v159.js?v=159', '页面入口');", "requireText(page, './app/tongxue-runtime-v159-r3966.js?v=3966_0', '页面入口');\nforbidText(page, './app/tongxue-runtime-v159.js?v=159', '页面仍加载旧入口');");
  if (!next.includes("'v3966发布展示器'")) {
    next = next.replace("requireText(entry, \"family-shell.v3965_0.js?v=3965_0\", '共享家庭壳层');", "requireText(entry, \"release-presenter.v3966_0.js?v=3966_0\", 'v3966发布展示器');\nrequireText(entry, \"family-shell.v3965_0.js?v=3965_0\", '共享家庭壳层');");
  }
  return next;
});

update('tools/ln-2026/verify-final-release-v9.py', source => {
  let next = source;
  if (!next.includes('"feishuTransportContract",')) next = next.replace('        "undergraduatePopulationPolicyContract",\n', '        "undergraduatePopulationPolicyContract",\n        "feishuTransportContract",\n');
  if (!next.includes('"js/feature/feishu/report-api.v3966_0.js",')) next = next.replace('        "js/feature/feishu/report-controller.v3966_0.js",\n', '        "js/feature/feishu/report-controller.v3966_0.js",\n        "js/feature/feishu/report-api.v3966_0.js",\n        "js/feature/selection-pool/index.v3966_0.js",\n        "js/feature/selection-pool/feishu-report-api.v3966_0.js",\n        "js/shared/feishu-api-client.v3966_0.js",\n');
  if (!next.includes('"js/feature/feishu/report-api.v3964_0.js",')) next = next.replace('        "../tongxue/app/tongxue-runtime-v159.js",\n', '        "../tongxue/app/tongxue-runtime-v159.js",\n        "js/feature/feishu/report-api.v3964_0.js",\n        "js/feature/selection-pool/feishu-report-api.v3964_0.js",\n        "js/shared/feishu-api-client.v3964_0.js",\n');
  if (!next.includes('contains("ln-rank/js/feature/feishu/report-api.v3966_0.js"')) next = next.replace('    check("event.currentTarget" not in feishu, "Feishu retains event object across await")\n', '    check("event.currentTarget" not in feishu, "Feishu retains event object across await")\n    contains("ln-rank/js/feature/feishu/report-controller.v3966_0.js", "report-api.v3966_0.js?v=3966_0")\n    contains("ln-rank/js/feature/feishu/report-api.v3966_0.js", "feishu-report-contract.v3966_0.js?v=3966_0", "feishu-api-client.v3966_0.js?v=3966_0")\n    contains("ln-rank/js/shared/feishu-api-client.v3966_0.js", "feishu-report-contract.v3966_0.js?v=3966_0")\n    contains("ln-rank/js/feature/selection-pool/feishu-report-api.v3966_0.js", "feishu-report-contract.v3966_0.js?v=3966_0", "feishu-api-client.v3966_0.js?v=3966_0")\n');
  return next.replace('"selection-workspace-orchestration-v3965_0",', '"selection-workspace-orchestration-v3966_0",');
});

update('.github/workflows/verify-dual-search-v3963.yml', source => {
  let next = source;
  if (!next.includes("'js/feature/feishu/report-api.v3966_0.js'")) next = next.replace("'js/feature/feishu/index.v3966_0.js','js/selection-pool.v3966_0.js'", "'js/feature/feishu/index.v3966_0.js','js/feature/feishu/report-api.v3966_0.js','js/feature/selection-pool/index.v3966_0.js','js/feature/selection-pool/feishu-report-api.v3966_0.js','js/shared/feishu-api-client.v3966_0.js','js/selection-pool.v3966_0.js'");
  if (!next.includes('            /ln-rank/js/feature/feishu/report-api.v3966_0.js\n')) next = next.replace('            /ln-rank/js/feature/feishu/report-controller.v3966_0.js\n', '            /ln-rank/js/feature/feishu/report-controller.v3966_0.js\n            /ln-rank/js/feature/feishu/report-api.v3966_0.js\n            /ln-rank/js/feature/selection-pool/index.v3966_0.js\n            /ln-rank/js/feature/selection-pool/feishu-report-api.v3966_0.js\n            /ln-rank/js/shared/feishu-api-client.v3966_0.js\n');
  return next;
});

update('.github/workflows/verify-ln-2026-final.yml', source => {
  if (source.includes('            /ln-rank/js/feature/feishu/report-api.v3966_0.js\n')) return source;
  return source.replace('            /ln-rank/js/feature/feishu/index.v3966_0.js\n', '            /ln-rank/js/feature/feishu/index.v3966_0.js\n            /ln-rank/js/feature/feishu/report-api.v3966_0.js\n            /ln-rank/js/feature/selection-pool/index.v3966_0.js\n            /ln-rank/js/feature/selection-pool/feishu-report-api.v3966_0.js\n            /ln-rank/js/shared/feishu-api-client.v3966_0.js\n');
});

console.log(JSON.stringify({
  ok: true,
  version: 'v3966_0',
  reportTransport: 'single-v3966-year-caliber-client',
  currentBand: 'v3966',
  selectionPool: 'v3966'
}, null, 2));
