import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('tongxue/index.html', 'utf8');
const controller = fs.readFileSync('tongxue/app/tongxue-runtime-controller-v159.js', 'utf8');
const searchView = fs.readFileSync('tongxue/app/tongxue-runtime-search-view-v159.js', 'utf8');
const plan = fs.readFileSync('docs/plans/tongxue-startup-status-v001.md', 'utf8');
const status = JSON.parse(fs.readFileSync('docs/status/tongxue-startup-status-v001-status.json', 'utf8'));
const source = html + '\n' + controller;

for (const copy of [
  '正在准备学校和专业目录，马上可以查询',
  '学校名单已准备好',
  '目录加载失败，请点击重新加载',
  '重新加载'
]) assert.ok(source.includes(copy), 'missing startup status copy: ' + copy);

assert.match(html, /id="indexStatus"[^>]*data-status="preparing"/);
assert.match(html, /id="indexStatusMessage"/);
assert.match(html, /id="retryIndex"[^>]*hidden/);
assert.match(html, /\.index-status\[data-status=preparing\]/);
assert.match(html, /\.index-status\[data-status=ready\]/);
assert.match(html, /\.index-status\[data-status=error\]/);
assert.match(html, /min-height:34px/);

for (const marker of [
  'catalogLoading:false',
  'catalogPromise:null',
  'pendingSubmit:null',
  'beginCatalogLoad(ui, state, searchView, resultView)',
  'state.pendingSubmit = { input, options:{ ...options, input } }',
  'setTongxueIndexStatus(ui, \'目录加载失败，请点击重新加载\', \'error\')',
  'state.catalogLoading',
  'hasLocationQuery()'
]) assert.ok(controller.includes(marker), 'missing startup controller contract: ' + marker);

assert.ok(controller.includes('SCHOOL_NAME_DATA_URL}?retry=') && controller.includes('Date.now()'), 'retry URL contract missing');

for (const marker of [
  'export function setTongxueIndexStatus',
  'container.dataset.status = tone',
  'ui.retryIndex.hidden = tone !== \'error\''
]) assert.ok(searchView.includes(marker), 'missing startup view contract: ' + marker);

for (const marker of [
  'TX-01：启动状态位',
  'TX-02：目录后台准备',
  'TX-03：提前输入与安全恢复',
  '浏览器：PC / Pad / Android',
  '断网/中断续作规则'
]) assert.ok(plan.includes(marker), 'missing plan section: ' + marker);

assert.equal(status.baseSha, '63b76acdfd7b137cd2c635d1ad78acee88d85012');
assert.equal(status.pr, null);
assert.equal(status.inProgress, 'TX-03-startup-status-ui');
assert.deepEqual(status.pending, [
  'TX-03-startup-status-ui',
  'TX-04-background-catalog-ready-queue',
  'TX-05-tests-pc-pad-android',
  'TX-06-ci-preview-ready-merge-main',
  'TX-07-production-verification'
]);

console.log(JSON.stringify({
  ok: true,
  contract: 'tongxue-startup-status-v001',
  statusStates: ['preparing', 'ready', 'error'],
  earlySubmitQueue: true,
  fixedHeightStatus: true,
  recoveryPlan: true
}));
