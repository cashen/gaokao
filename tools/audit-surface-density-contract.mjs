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
const knowledge = read('js/knowledge/major-knowledge-contract.js');
const css = read('css/components/local-strong-chain-contract.css');
const distMain = read('css/dist/ln-rank-main.v3933.css');
const distSelection = read('css/dist/ln-rank-selection.v3933.css');

check('card uses compact local context renderer', /renderLocalContextInline/.test(render), 'major card should use compact context renderer');
check('card does not generate old full block class', !/local-chain-card-tip|local-context-summary-card/.test(render), 'no full block in card renderer');
check('card renderer does not output full tips', !/cardTip|reportTip|boundary|reviewPoints\.join/.test(render), 'card surface must not output full tips');
check('selection uses compact local context chip', /itemLocalContextChip/.test(selection), 'selection item should use compact chip');
check('selection does not generate old workspace block', !/class="workspace-local-chain"|class="local-chain-summary-card"/.test(selection), 'no block-level local chain');
check('selection item does not output full tips', !/view\.cardTip|view\.reportTip|hit\.cardTip|hit\.boundary/.test(selection), 'selection item must not output full tips');
check('knowledge local chain opt-in', /includeLocalChain\s*=\s*options\.includeLocalChain\s*===\s*true/.test(knowledge), 'knowledge review must not inject local chain by default');
check('css has card inline contract', /\.local-context-inline[\s\S]*display:\s*flex/.test(css), '.local-context-inline must be flex');
check('css has selection chip contract', /\.workspace-local-context-chip[\s\S]*display:\s*inline-flex/.test(css), '.workspace-local-context-chip must be inline-flex');
check('source css removed old full classes', !/\.local-chain-card-tip|\.workspace-local-chain(?!-chip)/.test(css), 'old block classes not allowed in active source css');
check('main dist removed old full classes', !/\.local-chain-card-tip|\.workspace-local-chain(?!-chip)/.test(distMain), 'old block classes not allowed in active main dist');
check('selection dist removed old full classes', !/\.local-chain-card-tip|\.workspace-local-chain(?!-chip)/.test(distSelection), 'old block classes not allowed in active selection dist');
check('frontend copy is human-readable', !/辽宁属地强链|辽宁本地强链|强链：|强链复核/.test(render + selection + css + distMain + distSelection), 'front surfaces should use 院校专业背景/本校主干方向/方向提醒');

const failed = checks.filter(r => !r.ok);
const report = { version, generatedAt: new Date().toISOString(), status: failed.length ? 'fail' : 'pass', checks };
fs.writeFileSync(path.join(projectRoot, `surface-density-audit.${version}.json`), JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exit(1);
