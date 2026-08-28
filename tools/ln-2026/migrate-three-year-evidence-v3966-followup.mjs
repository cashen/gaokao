#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const file = rel => path.join(root, rel);
const read = rel => fs.readFileSync(file(rel), 'utf8');
const write = (rel, text) => { fs.mkdirSync(path.dirname(file(rel)), { recursive: true }); fs.writeFileSync(file(rel), text, 'utf8'); };

function replace(text, from, to, label) {
  if (text.includes(to)) return text;
  if (!text.includes(from)) throw new Error(`${label}: source marker missing`);
  return text.replace(from, to);
}
function replaceRegex(text, regex, to, label) {
  if (text.includes(to)) return text;
  if (!regex.test(text)) throw new Error(`${label}: source pattern missing`);
  return text.replace(regex, to);
}
function update(rel, mutate) { const before = read(rel); const after = mutate(before); if (after !== before) write(rel, after); }
function derive(src, dest, mutate = value => value) { write(dest, mutate(read(src))); }

// Rebuild every v3966 immutable browser file from its last verified predecessor.
derive('ln-rank/js/feature/major-pool/render.v3964_0.js', 'ln-rank/js/feature/major-pool/render.v3966_0.js', source =>
  replace(source, './history-score-render.v3964_0.js?v=3964_0', './history-score-render.v3966_0.js?v=3966_0', 'major-pool presenter'));
derive('ln-rank/js/feature/major-pool/index.v3964_0.js', 'ln-rank/js/feature/major-pool/index.v3966_0.js', source =>
  replace(source, './render.v3964_0.js?v=3964_0', './render.v3966_0.js?v=3966_0', 'major-pool render'));

derive('ln-rank/js/feature/report/payload-builder.v3964_0.js', 'ln-rank/js/feature/report/payload-builder.v3966_0.js', source => {
  let next = replace(source,
    '../../../../shared/resources/reports/feishu-report-contract.v3964_0.js?v=3964_0',
    '../../../../shared/resources/reports/feishu-report-contract.v3966_0.js?v=3966_0',
    'report year contract');
  return replace(next,
    '    historyCompare: record.historyCompare || null,',
    '    historyCompare: record.historyCompare || null,\n    historyEvidence: record.historyEvidence || null,',
    'report evidence payload');
});
derive('ln-rank/js/feature/feishu/report-controller.v3965_0.js', 'ln-rank/js/feature/feishu/report-controller.v3966_0.js', source =>
  replace(source, '../report/payload-builder.v3964_0.js?v=3964_0', '../report/payload-builder.v3966_0.js?v=3966_0', 'report payload owner'));
derive('ln-rank/js/feature/feishu/index.v3965_0.js', 'ln-rank/js/feature/feishu/index.v3966_0.js', source =>
  replace(source, './report-controller.v3965_0.js?v=3965_0', './report-controller.v3966_0.js?v=3966_0', 'report controller owner'));

derive('ln-rank/js/workspace/selection-workspace-orchestrator.v3965_0.js', 'ln-rank/js/workspace/selection-workspace-orchestrator.v3966_0.js', source => {
  let next = replace(source, '../feature/major-pool/index.v3964_0.js?v=3964_0', '../feature/major-pool/index.v3966_0.js?v=3966_0', 'workspace major-pool');
  next = replace(next, '../../../shared/resources/exam/liaoning-physics.js?v=3961_0', '../../../shared/resources/exam/liaoning-physics.js?v=3966_0', 'workspace exam');
  return replace(next, '../feature/feishu/index.v3965_0.js?v=3965_0', '../feature/feishu/index.v3966_0.js?v=3966_0', 'workspace report');
});

derive('ln-rank/js/feature/school-majors/school-all-mode.v3964_0.js', 'ln-rank/js/feature/school-majors/school-all-mode.v3966_0.js', source => {
  let next = replace(source,
    "} from '../selection-pool/index.v3964_0.js?v=3964_0';",
    "} from '../selection-pool/index.v3964_0.js?v=3964_0';\nimport { compactHistoryScoreText, renderCurrentScoreRank, renderThreeYearEvidenceDetail } from '../major-pool/history-score-render.v3966_0.js?v=3966_0';",
    'school presenter import');
  next = replaceRegex(next, /function historyLine\(record\) \{[\s\S]*?\n\}/,
    "function historyLine(record) {\n  return compactHistoryScoreText(record) || '2025、2024暂无严格同口径记录';\n}", 'school history function');
  next = replace(next,
    '<div class="school-major-score"><b>${fmt(record.score2026 ?? record.score)}分</b><span>2026约第 ${fmt(record.rank2026 ?? record.rank)} 位</span></div>',
    '<div class="school-major-score">${renderCurrentScoreRank(record)}</div>', 'school current range');
  next = replace(next,
    '<p><b>历史对照</b><span>${escapeHtml(historyLine(record))}</span></p>',
    '${renderThreeYearEvidenceDetail(record)}', 'school evidence detail');
  return replace(next, "version: 'school-all-mode-v3964_0'", "version: 'school-all-mode-v3966_0'", 'school version');
});

derive('ln-rank/js/selection-pool-runtime.v3964_1.js', 'ln-rank/js/selection-pool-runtime.v3966_0.js', source => {
  let next = replace(source, './feature/major-pool/history-score-render.v3964_0.js?v=3964_0', './feature/major-pool/history-score-render.v3966_0.js?v=3966_0', 'selection presenter');
  return replace(next, '../../shared/resources/reports/feishu-report-contract.v3964_0.js?v=3964_0', '../../shared/resources/reports/feishu-report-contract.v3966_0.js?v=3966_0', 'selection report contract');
});
write('ln-rank/js/selection-pool.v3966_0.js', "import './selection-pool-runtime.v3966_0.js?v=3966_0';\n");

derive('ln-rank/js/app-runtime.v3965_0.js', 'ln-rank/js/app-runtime.v3966_0.js', source => {
  let next = replace(source, '../../shared/resources/exam/liaoning-physics.js?v=3962_2', '../../shared/resources/exam/liaoning-physics.js?v=3966_0', 'runtime exam');
  next = replace(next, './workspace/selection-workspace-orchestrator.v3965_0.js?v=3965_0', './workspace/selection-workspace-orchestrator.v3966_0.js?v=3966_0', 'runtime workspace');
  return replace(next, './feature/school-majors/school-all-mode.v3964_0.js?v=3964_0', './feature/school-majors/school-all-mode.v3966_0.js?v=3966_0', 'runtime school');
});
derive('ln-rank/js/app.v3965_0.js', 'ln-rank/js/app.v3966_0.js', source => {
  let next = replace(source, "const RUNTIME_VERSION = 'runtime-cache-coherence-v3965_0';", "const RUNTIME_VERSION = 'three-year-rank-evidence-v3966_0';", 'app version');
  next = replace(next, './app-runtime.v3965_0.js?v=3965_0', './app-runtime.v3966_0.js?v=3966_0', 'app entry');
  return next.replace('[ln-rank-runtime-v3965_0]', '[ln-rank-runtime-v3966_0]');
});

update('functions/_lib/feishu-report-builder.js', source => {
  let next = replace(source,
    "import { FEISHU_REPORT_CONTRACT } from '../../shared/resources/reports/feishu-report-contract.js';",
    "import { FEISHU_REPORT_CONTRACT } from '../../shared/resources/reports/feishu-report-contract.js';\nimport { formatHistoricalEvidenceText } from '../../shared/resources/exam/historical-score-rank-contract.js';", 'feishu formatter import');
  return replaceRegex(next, /function historyText\(record\) \{[\s\S]*?\n\}/,
    "function historyText(record) {\n  return formatHistoricalEvidenceText(record, { years: [2025, 2024], prefix: false, empty: '暂无严格同口径记录' });\n}", 'feishu formatter');
});
update('functions/_lib/feishu-selection-pool-styled-builder.js', source => {
  let next = replace(source,
    "import { buildSelectionReviewChecklist } from './kb/review-checklist-builder.js';",
    "import { buildSelectionReviewChecklist } from './kb/review-checklist-builder.js';\nimport { formatHistoricalEvidenceText } from '../../shared/resources/exam/historical-score-rank-contract.js';", 'selection formatter import');
  return replaceRegex(next, /function historyScoreText\(item = \{\}\) \{[\s\S]*?\n\}/,
    "function historyScoreText(item = {}) {\n  return formatHistoricalEvidenceText(item, { years: [2025, 2024], prefix: false, empty: '历史同口径参考：暂无' });\n}", 'selection formatter');
});
update('functions/_lib/ai-card-prompt.js', source => {
  let next = replace(source, '      historyCompare: record.historyCompare || null,', '      historyCompare: record.historyCompare || null,\n      historyEvidence: record.historyEvidence || null,', 'AI evidence');
  return replace(next,
    "      '没有2025或2024严格同口径记录时，不能自行编造历史趋势。',",
    "      '没有2025或2024严格同口径记录时，不能自行编造历史趋势。',\n      '历史趋势只能使用 historyEvidence 中 comparable=true 的年份；conflict、score-only、rank-table-unavailable 和 no-record 均不得参与趋势。',\n      '同一分数对应位次区间，不得把 rankEnd 写成考生唯一名次；可以写“同分位置约为第X—Y位”。',", 'AI rules');
});

update('ln-rank/index.html', source => {
  let next = replace(source, '/ln-rank/js/app.v3965_0.js?v=3965_0', '/ln-rank/js/app.v3966_0.js?v=3966_0', 'main entry');
  return next.includes('/ln-rank/css/history-evidence.v3966_0.css?v=3966_0') ? next : next.replace('</head>', '  <link rel="stylesheet" href="/ln-rank/css/history-evidence.v3966_0.css?v=3966_0" />\n</head>');
});
update('ln-rank/selection-pool.html', source => {
  let next = replace(source, '/ln-rank/js/selection-pool.v3965_0.js?v=3965_0', '/ln-rank/js/selection-pool.v3966_0.js?v=3966_0', 'selection entry');
  return next.includes('/ln-rank/css/history-evidence.v3966_0.css?v=3966_0') ? next : next.replace('</head>', '  <link rel="stylesheet" href="/ln-rank/css/history-evidence.v3966_0.css?v=3966_0" />\n</head>');
});

console.log(JSON.stringify({ ok: true, version: 'v3966_0', idempotent: true }, null, 2));
