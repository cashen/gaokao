const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(p){ return fs.readFileSync(path.join(root,p),'utf8'); }
function exists(p){ return fs.existsSync(path.join(root,p)); }
function assert(cond,msg){ if(!cond){ console.error('FAIL:',msg); process.exitCode=1; } }
const idx = read('fenxi/v3/index.html');
const idx2 = read('fenxi/v3/index.htm');
const dbg = read('fenxi/v3/debug.html');
const ver = read('fenxi/v3/assets/js/version.v3.js');
const self = read('fenxi/v3/assets/js/debug/debug-selftest.v3.js');
const report = read('fenxi/v3/assets/js/adapters/report-export-adapter.v3.js');
const stepExport = read('fenxi/v3/assets/js/steps/step-export.v3.js');
const css = read('fenxi/v3/assets/css/steps.v3.css');
const versionTxt = read('fenxi/v3/VERSION.txt');
assert(idx.includes('v300beta8-20260512'), 'index cache stamp beta8');
assert(idx2.includes('v300beta8-20260512'), 'index.htm cache stamp beta8');
assert(dbg.includes('v300beta8-20260512'), 'debug cache stamp beta8');
assert(ver.includes('V3.0.0.beta8｜导出报告增强与精简完整版版'), 'version name beta8');
assert(ver.includes("stamp: 'v300beta8-20260512'"), 'version stamp beta8');
assert(ver.includes("bodyClass: 'ln-v3-beta8'"), 'body class beta8');
assert(report.includes('beta8-report-export-enhance'), 'report beta8 static plan');
assert(report.includes('compactMarkdown') && report.includes('fullMarkdown'), 'report supports compact and full markdown');
assert(report.includes('buildCompact') && report.includes('buildFull'), 'report has compact/full builders');
assert(report.includes('reviewTaskCount'), 'report includes review task count');
assert(stepExport.includes('data-export-mode="compact"') && stepExport.includes('data-export-mode="full"'), 'export page mode buttons');
assert(stepExport.includes('export-mode-switch'), 'export mode switch rendered');
assert(css.includes('beta8 report export modes') && css.includes('export-mode-switch'), 'beta8 css exists');
assert(self.includes('V3.0.0.beta8'), 'debug selftest expects beta8');
assert(self.includes('导出报告精简/完整版策略存在'), 'debug checks report strategy');
assert(self.includes('Step7 报告支持精简版和完整版'), 'mainflow checks compact/full');
assert(self.includes('Step7 报告包含复核任务清单'), 'mainflow checks review tasks in report');
assert(versionTxt.includes('V3.0.0.beta8'), 'VERSION.txt beta8');
assert(exists('fenxi/v3/docs/V3_beta8_导出报告增强与精简完整版说明.md'), 'beta8 docs exist');
if (process.exitCode) process.exit(process.exitCode);
console.log('All V3.0.0.beta8 checks passed.');
