#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(process.cwd(), 'ln-rank');
const version = process.argv[3] || 'v3933';
const read = rel => fs.readFileSync(path.join(projectRoot, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(projectRoot, rel));
const checks = [];
function check(name, ok, detail = '') { checks.push({ name, ok: Boolean(ok), detail }); }

const render = read('js/feature/major-pool/render.js');
const selection = exists('js/selection-pool.v3933.js') ? read('js/selection-pool.v3933.js') : '';
const resolver = read('js/knowledge/local-context-resolver.js');
const trajectory = read('js/knowledge/liaoning-major-trajectory-chain.js');
const css = read('css/components/local-strong-chain-contract.css');
const distMain = exists('css/dist/ln-rank-main.v3933.css') ? read('css/dist/ln-rank-main.v3933.css') : '';
const distSelection = exists('css/dist/ln-rank-selection.v3933.css') ? read('css/dist/ln-rank-selection.v3933.css') : '';

check('card uses local context resolver', /getLocalContextPresentation\(record, 'card'\)/.test(render), 'major card should use unified context resolver');
check('card only uses local-context classes', /local-context-inline/.test(render) && /local-context-chip/.test(render), 'card should render compact local-context chip');
check('card does not output full tips', !/cardTip|reportTip|reviewPoints\.join|boundary/.test(render), 'card surface must not output full explanation');
check('selection uses compact local context chip', /itemLocalContextChip/.test(selection) && /workspace-local-context-chip/.test(selection), 'selection item should use one compact chip');
check('selection item does not output full tips', !/workspace-local-chain|local-chain-summary-card|view\.cardTip|view\.reportTip|hit\.cardTip|hit\.boundary/.test(selection), 'selection item must not output full explanation');
check('summary title is human readable', /院校专业背景复核/.test(selection), 'summary should use human-readable title');
check('front copy does not expose strong-chain wording', !/辽宁属地强链|辽宁本地强链|强链：|强链复核/.test(render + selection + css + distMain + distSelection), 'frontend should not show internal strong-chain wording');
check('resolver supports trajectory', /matchLiaoningMajorTrajectory/.test(resolver) && /方向提醒/.test(resolver), 'trajectory must be integrated into resolver');
check('trajectory rules exist', /沈阳农业大学/.test(trajectory) && /农机与智能农业装备/.test(trajectory), 'first batch trajectory rules must exist');
check('same-context merge exists', /sameContext/.test(resolver) && /merged/.test(resolver), 'strong background and trajectory duplicate should merge');
check('css has local context compact card', /\.local-context-inline[\s\S]*display:\s*flex/.test(css), 'card chip CSS must be compact');
check('css has local context selection chip', /\.workspace-local-context-chip[\s\S]*display:\s*inline-flex/.test(css), 'selection chip CSS must be inline');
check('css avoids high saturation red/orange', !/(#f00|red|orangered|#ff0000|#ff4500)/i.test(css), 'local context should use restrained colors');
check('main dist includes context css', /\.local-context-inline/.test(distMain), 'main dist should include local context css');
check('selection dist includes context css', /\.workspace-local-context-chip/.test(distSelection), 'selection dist should include local context css');

const failed = checks.filter(x => !x.ok);
const report = { version, generatedAt: new Date().toISOString(), status: failed.length ? 'fail' : 'pass', checks };
fs.writeFileSync(path.join(projectRoot, `local-context-density-audit.${version}.json`), JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exit(1);
