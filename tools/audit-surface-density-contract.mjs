#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(process.cwd(), 'ln-rank');
const version = process.argv[3] || 'v3931';
const read = rel => fs.readFileSync(path.join(projectRoot, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(projectRoot, rel));
const results = [];
function check(name, ok, detail = '') { results.push({ name, ok: Boolean(ok), detail }); }

const render = read('js/feature/major-pool/render.js');
const selection = exists('js/selection-pool.v3931.js') ? read('js/selection-pool.v3931.js') : '';
const knowledge = read('js/knowledge/major-knowledge-contract.js');
const css = read('css/components/local-strong-chain-contract.css');
const distMain = read('css/dist/ln-rank-main.v3931.css');
const distSelection = read('css/dist/ln-rank-selection.v3931.css');

check('card uses compact renderer', /renderLocalStrongChainInline/.test(render), 'major card should use inline renderer');
check('card does not generate old full block class', !/local-chain-card-tip/.test(render), 'no .local-chain-card-tip in card renderer');
check('card renderer does not output cardTip', !/hit\.cardTip|view\.cardTip/.test(render), 'card surface must not output full cardTip');
check('card renderer does not output boundary', !/hit\.boundary|view\.boundary/.test(render), 'card surface must not output boundary');
check('selection uses compact chip', /itemLocalStrongChainChip/.test(selection), 'selection item should use compact chip');
check('selection does not generate old workspace block', !/class="workspace-local-chain"/.test(selection), 'no block-level workspace local chain');
check('selection item does not output cardTip', !/hit\.cardTip|view\.cardTip/.test(selection), 'selection item must not output full cardTip');
check('knowledge local chain opt-in', /includeLocalChain\s*=\s*options\.includeLocalChain\s*===\s*true/.test(knowledge), 'knowledge review must not inject local chain by default');
check('css has card inline contract', /\.local-chain-inline[\s\S]*display:\s*flex/.test(css), '.local-chain-inline must be flex');
check('css has selection chip contract', /\.workspace-local-chain-chip[\s\S]*display:\s*inline-flex/.test(css), '.workspace-local-chain-chip must be inline-flex');
check('source css removed old full classes', !/\.local-chain-card-tip|\.workspace-local-chain(?!-chip)/.test(css), 'old block classes not allowed in active source css');
check('main dist removed old full classes', !/\.local-chain-card-tip|\.workspace-local-chain(?!-chip)/.test(distMain), 'old block classes not allowed in active main dist');
check('selection dist removed old full classes', !/\.local-chain-card-tip|\.workspace-local-chain(?!-chip)/.test(distSelection), 'old block classes not allowed in active selection dist');

const failed = results.filter(r => !r.ok);
const report = { version, generatedAt: new Date().toISOString(), status: failed.length ? 'fail' : 'pass', checks: results };
fs.writeFileSync(path.join(projectRoot, `surface-density-audit.${version}.json`), JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exit(1);
