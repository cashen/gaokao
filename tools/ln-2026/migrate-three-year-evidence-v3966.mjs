#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const write = (rel, text) => {
  const target = path.join(root, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, text, 'utf8');
};

function exactReplace(text, from, to, label) {
  if (!text.includes(from)) throw new Error(`${label}: source marker missing`);
  return text.replace(from, to);
}
function regexReplace(text, regex, to, label) {
  if (!regex.test(text)) throw new Error(`${label}: source pattern missing`);
  return text.replace(regex, to);
}
function update(rel, mutate) {
  const before = read(rel);
  const after = mutate(before);
  if (after === before) throw new Error(`${rel}: migration produced no change`);
  write(rel, after);
}
function copy(src, dest, mutate = value => value) {
  if (fs.existsSync(path.join(root, dest))) throw new Error(`${dest}: destination already exists`);
  write(dest, mutate(read(src)));
}

copy('ln-rank/js/feature/major-pool/render.v3964_0.js', 'ln-rank/js/feature/major-pool/render.v3966_0.js', source =>
  exactReplace(source, './history-score-render.v3964_0.js?v=3964_0', './history-score-render.v3966_0.js?v=3966_0', 'major-pool history presenter'));
copy('ln-rank/js/feature/major-pool/index.v3964_0.js', 'ln-rank/js/feature/major-pool/index.v3966_0.js', source =>
  exactReplace(source, './render.v3964_0.js?v=3964_0', './render.v3966_0.js?v=3966_0', 'major-pool render owner'));

copy('ln-rank/js/feature/report/payload-builder.v3964_0.js', 'ln-rank/js/feature/report/payload-builder.v3966_0.js', source => {
  let next = exactReplace(source,
    '../../../../shared/resources/reports/feishu-report-contract.v3964_0.js?v=3964_0',
    '../../../../shared/resources/reports/feishu-report-contract.v3966_0.js?v=3966_0',
    'report payload year contract');
  next = exactReplace(next,
    '    historyCompare: record.historyCompare || null,',
    '    historyCompare: record.historyCompare || null,\n    historyEvidence: record.historyEvidence || null,',
    'report history evidence payload');
  return next;
});
copy('ln-rank/js/feature/feishu/report-controller.v3965_0.js', 'ln-rank/js/feature/feishu/report-controller.v3966_0.js', source =>
  exactReplace(source,
    '../report/payload-builder.v3964_0.js?v=3964_0',
    '../report/payload-builder.v3966_0.js?v=3966_0',
    'report controller payload owner'));
copy('ln-rank/js/feature/feishu/index.v3965_0.js', 'ln-rank/js/feature/feishu/index.v3966_0.js', source =>
  exactReplace(source,
    './report-controller.v3965_0.js?v=3965_0',
    './report-controller.v3966_0.js?v=3966_0',
    'feishu controller owner'));

copy('ln-rank/js/workspace/selection-workspace-orchestrator.v3965_0.js', 'ln-rank/js/workspace/selection-workspace-orchestrator.v3966_0.js', source => {
  let next = exactReplace(source,
    '../feature/major-pool/index.v3964_0.js?v=3964_0',
    '../feature/major-pool/index.v3966_0.js?v=3966_0',
    'workspace major-pool owner');
  next = exactReplace(next,
    '../../../shared/resources/exam/liaoning-physics.js?v=3961_0',
    '../../../shared/resources/exam/liaoning-physics.js?v=3966_0',
    'workspace exam owner');
  next = exactReplace(next,
    '../feature/feishu/index.v3965_0.js?v=3965_0',
    '../feature/feishu/index.v3966_0.js?v=3966_0',
    'workspace feishu owner');
  return next;
});

copy('ln-rank/js/feature/school-majors/school-all-mode.v3964_0.js', 'ln-rank/js/feature/school-majors/school-all-mode.v3966_0.js', source => {
  let next = exactReplace(source,
    "} from '../selection-pool/index.v3964_0.js?v=3964_0';",
    "} from '../selection-pool/index.v3964_0.js?v=3964_0';\nimport {\n  compactHistoryScoreText,\n  renderCurrentScoreRank,\n  renderThreeYearEvidenceDetail\n} from '../major-pool/history-score-render.v3966_0.js?v=3966_0';",
    'school history import');
  next = regexReplace(next,
    /function historyLine\(record\) \{[\s\S]*?\n\}/,
    "function historyLine(record) {\n  return compactHistoryScoreText(record) || '2025、2024暂无严格同口径记录';\n}",
    'school history function');
  next = exactReplace(next,
    '<div class="school-major-score"><b>${fmt(record.score2026 ?? record.score)}分</b><span>2026约第 ${fmt(record.rank2026 ?? record.rank)} 位</span></div>',
    '<div class="school-major-score">${renderCurrentScoreRank(record)}</div>',
    'school current rank display');
  next = exactReplace(next,
    '<p><b>历史对照</b><span>${escapeHtml(historyLine(record))}</span></p>',
    '${renderThreeYearEvidenceDetail(record)}',
    'school history detail');
  next = exactReplace(next, "version: 'school-all-mode-v3964_0'", "version: 'school-all-mode-v3966_0'", 'school mode version');
  return next;
});

copy('ln-rank/js/selection-pool-runtime.v3964_1.js', 'ln-rank/js/selection-pool-runtime.v3966_0.js', source => {
  let next = exactReplace(source,
    './feature/major-pool/history-score-render.v3964_0.js?v=3964_0',
    './feature/major-pool/history-score-render.v3966_0.js?v=3966_0',
    'selection history presenter');
  next = exactReplace(next,
    '../../shared/resources/reports/feishu-report-contract.v3964_0.js?v=3964_0',
    '../../shared/resources/reports/feishu-report-contract.v3966_0.js?v=3966_0',
    'selection report year contract');
  return next;
});
write('ln-rank/js/selection-pool.v3966_0.js', "import './selection-pool-runtime.v3966_0.js?v=3966_0';\n");

copy('ln-rank/js/app-runtime.v3965_0.js', 'ln-rank/js/app-runtime.v3966_0.js', source => {
  let next = exactReplace(source,
    '../../shared/resources/exam/liaoning-physics.js?v=3962_2',
    '../../shared/resources/exam/liaoning-physics.js?v=3966_0',
    'runtime exam owner');
  next = exactReplace(next,
    './workspace/selection-workspace-orchestrator.v3965_0.js?v=3965_0',
    './workspace/selection-workspace-orchestrator.v3966_0.js?v=3966_0',
    'runtime workspace owner');
  next = exactReplace(next,
    './feature/school-majors/school-all-mode.v3964_0.js?v=3964_0',
    './feature/school-majors/school-all-mode.v3966_0.js?v=3966_0',
    'runtime school owner');
  return next;
});
copy('ln-rank/js/app.v3965_0.js', 'ln-rank/js/app.v3966_0.js', source => {
  let next = exactReplace(source,
    "const RUNTIME_VERSION = 'runtime-cache-coherence-v3965_0';",
    "const RUNTIME_VERSION = 'three-year-rank-evidence-v3966_0';",
    'app runtime version');
  next = exactReplace(next,
    './app-runtime.v3965_0.js?v=3965_0',
    './app-runtime.v3966_0.js?v=3966_0',
    'app runtime entry');
  return next.replace('[ln-rank-runtime-v3965_0]', '[ln-rank-runtime-v3966_0]');
});

update('functions/_lib/feishu-report-builder.js', source => {
  let next = exactReplace(source,
    "import { FEISHU_REPORT_CONTRACT } from '../../shared/resources/reports/feishu-report-contract.js';",
    "import { FEISHU_REPORT_CONTRACT } from '../../shared/resources/reports/feishu-report-contract.js';\nimport { formatHistoricalEvidenceText } from '../../shared/resources/exam/historical-score-rank-contract.js';",
    'feishu evidence import');
  return regexReplace(next,
    /function historyText\(record\) \{[\s\S]*?\n\}/,
    "function historyText(record) {\n  return formatHistoricalEvidenceText(record, { years: [2025, 2024], prefix: false, empty: '暂无严格同口径记录' });\n}",
    'feishu history formatter');
});
update('functions/_lib/feishu-selection-pool-styled-builder.js', source => {
  let next = exactReplace(source,
    "import { buildSelectionReviewChecklist } from './kb/review-checklist-builder.js';",
    "import { buildSelectionReviewChecklist } from './kb/review-checklist-builder.js';\nimport { formatHistoricalEvidenceText } from '../../shared/resources/exam/historical-score-rank-contract.js';",
    'selection report evidence import');
  return regexReplace(next,
    /function historyScoreText\(item = \{\}\) \{[\s\S]*?\n\}/,
    "function historyScoreText(item = {}) {\n  return formatHistoricalEvidenceText(item, { years: [2025, 2024], prefix: false, empty: '历史同口径参考：暂无' });\n}",
    'selection report history formatter');
});
update('functions/_lib/ai-card-prompt.js', source => {
  let next = exactReplace(source,
    '      historyCompare: record.historyCompare || null,',
    '      historyCompare: record.historyCompare || null,\n      historyEvidence: record.historyEvidence || null,',
    'AI history evidence payload');
  return exactReplace(next,
    "      '没有2025或2024严格同口径记录时，不能自行编造历史趋势。',",
    "      '没有2025或2024严格同口径记录时，不能自行编造历史趋势。',\n      '历史趋势只能使用 historyEvidence 中 comparable=true 的年份；conflict、score-only、rank-table-unavailable 和 no-record 均不得参与趋势。',\n      '同一分数对应位次区间，不得把 rankEnd 写成考生唯一名次；可以写“同分位置约为第X—Y位”。',",
    'AI evidence rules');
});

update('ln-rank/index.html', source => {
  let next = exactReplace(source, '/ln-rank/js/app.v3965_0.js?v=3965_0', '/ln-rank/js/app.v3966_0.js?v=3966_0', 'main app entry');
  if (!next.includes('/ln-rank/css/history-evidence.v3966_0.css?v=3966_0')) {
    next = exactReplace(next, '</head>', '  <link rel="stylesheet" href="/ln-rank/css/history-evidence.v3966_0.css?v=3966_0" />\n</head>', 'main history CSS');
  }
  return next;
});
update('ln-rank/selection-pool.html', source => {
  let next = exactReplace(source, '/ln-rank/js/selection-pool.v3965_0.js?v=3965_0', '/ln-rank/js/selection-pool.v3966_0.js?v=3966_0', 'selection app entry');
  if (!next.includes('/ln-rank/css/history-evidence.v3966_0.css?v=3966_0')) {
    next = exactReplace(next, '</head>', '  <link rel="stylesheet" href="/ln-rank/css/history-evidence.v3966_0.css?v=3966_0" />\n</head>', 'selection history CSS');
  }
  return next;
});

console.log(JSON.stringify({ ok: true, version: 'v3966_0', policy: 'single-three-year-rank-provider-and-evidence-presenter' }, null, 2));
