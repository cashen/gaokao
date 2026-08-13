import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=file=>fs.readFileSync(file,'utf8');
const html=read('aiplus/index.html'),app=read('aiplus/app.v3990_1.js'),render=read('aiplus/render.v3992_0.js'),product=read('aiplus/product.v002.css'),workspace=read('aiplus/workspace.v3990_1.css'),agent=read('aiplus/agent.v3992_0.css'),presentation=read('functions/_lib/ai/advisor-presentation.js'),orchestrator=read('functions/_lib/ai/turn-orchestrator.js'),profileSource=read('functions/_lib/ai/school-profile-supplement-source.js'),workflow=read('.github/workflows/verify-ai-workspace-v3990_1.yml');

assert.match(html,/data-ai-plus="family-advisor"/);
assert.match(html,/data-ai-plus-assets="aiplus-assets-v002_1"/);
assert.match(html,/AIPLuS 产品版 · v0\.02/);
assert.match(html,/width=device-width, initial-scale=1\.0, viewport-fit=cover/);
const entryAssets=[...html.matchAll(/(?:href|src)="([^"]+\?v=[^"]+)"/g)].map(match=>match[1]);
assert.ok(entryAssets.length>=4,'active AIPLuS assets were not found');
assert.ok(entryAssets.every(value=>value.endsWith('?v=002_1')),`mixed entry cache transaction: ${entryAssets.join(', ')}`);
const moduleAssets=[...app.matchAll(/from '([^']+\?v=[^']+)'/g)].map(match=>match[1]);
assert.ok(moduleAssets.length>=5,'AIPLuS module graph is unexpectedly small');
assert.ok(moduleAssets.every(value=>value.endsWith('?v=002_1')),`mixed module cache transaction: ${moduleAssets.join(', ')}`);

assert.match(product,/\.answer-surface\{[^}]*overflow:hidden/);
assert.match(product,/\.answer-surface \.result-card\.fact,[^{]+\{border-left:0\}/);
assert.match(product,/writing-mode:horizontal-tb/);
assert.match(product,/@media\(max-width:760px\)/);
assert.match(product,/grid-template-columns:minmax\(0,1fr\)/);
assert.match(product,/\.new-answer-notice\{position:fixed/);
assert.match(product,/:focus-visible/);
assert.doesNotMatch(`${agent}\n${product}`,/processing-card::before/);
assert.doesNotMatch(render,/node\([^\n]+processing-dot/);

assert.match(render,/initial=records\.slice\(0,10\),remaining=records\.slice\(10\)/);
assert.match(render,/details\.addEventListener\('toggle'/);
assert.match(render,/const DEFAULT_TURN_WINDOW=12/);
assert.match(render,/existing=new Map/);
assert.match(render,/current\|\|renderTurn\(turn,onPrompt\)/);
assert.doesNotMatch(render,/container\.replaceChildren\([^)]*renderTurn/);
assert.match(render,/lead\.dataset\.answerStatus/);
assert.match(render,/query-status-row/);
assert.match(render,/你是不是在找/);
assert.match(render,/node\('div','turn-understanding'\)/);
assert.doesNotMatch(render,/node\('details','turn-understanding'\)/);
assert.match(product,/\.answer-surface \.turn-understanding\{margin:0;padding:11px 20px/);

assert.match(app,/runBoundedBatch\(tools,[^\n]+concurrency:deterministicToolBatchConcurrency\(tools,DETERMINISTIC_BATCH_CONCURRENCY\)/);
assert.match(app,/DETERMINISTIC_BATCH_CONCURRENCY=3,MAX_ORCHESTRATION_ROUNDS=4/);
assert.match(app,/function beginViewportTransaction/);
assert.match(app,/function restoreViewportTransaction/);
assert.match(app,/updateNewAnswerNotice/);
assert.match(app,/pendingConfirmation\)\{clearProcessingTimer\(\);render\(\);restoreViewportTransaction\(viewport\)/);
assert.match(app,/error-inline[^\n]+restoreViewportTransaction\(viewport\);updateNewAnswerNotice\(\)/);
assert.doesNotMatch(app,/behavior:'smooth'/);
assert.doesNotMatch(app,/scrollIntoView/);
assert.match(workspace,/\.result-card \.history-list \.history-item\{display:block/);
assert.match(workspace,/width:min\(340px,calc\(100vw - 20px\)\)!important/);
assert.match(profileSource,/mode:'moe_directory_baseline'/);
assert.match(profileSource,/resolveSchoolProfile/);
assert.match(orchestrator,/async function isolatedResult/);
assert.match(orchestrator,/steps:\['official_profile','moe_directory_baseline','school_background','admission_history'\]/);
assert.match(presentation,/supportingText=value=>/);
assert.match(workflow,/data-ai-workspace="ai-workspace-v3992_1"/);
assert.match(workflow,/data-ai-plus="family-advisor"/);
assert.match(workflow,/"apiVersion":"ai-health-api-v0\.02"/);
assert.match(workflow,/"semanticMode":"intent-task-spec-v0\.02"/);
assert.match(workflow,/echo "preview_base=\$immutable_preview"/);
assert.match(workflow,/require_text immutable-health/);
assert.doesNotMatch(workflow,/data-ai-plus="school-official-qa"|"apiVersion":"ai-health-api-v3990_1"|"semanticMode":"command-active-view-history-v3990_1"/);

console.log(JSON.stringify({ok:true,version:'aiplus-v0.02-ui-audit',checks:['single-resource-transaction','viewport-meta','product-footer','single-answer-surface','visible-scope-causality','no-colored-processing-bar','horizontal-mobile-cards','lazy-history-records','keyed-turn-dom','twelve-turn-window','bounded-browser-batch','single-viewport-owner','new-answer-notice','drawer-viewport-boundary','keyboard-focus','school-directory-baseline','school-research-branch-isolation','nonduplicated-primary-answer','preview-production-contract-sync']},null,2));
