import assert from 'node:assert/strict';
import fs from 'node:fs';
import { classifyTongxueDirectResult } from '../../tongxue/app/tongxue-direct-result-v156.js';

assert.equal(classifyTongxueDirectResult({ hasResult: false }), 'waiting');
assert.equal(classifyTongxueDirectResult({ hasResult: true, title: '辽宁大学' }), 'resolved-result');
assert.equal(classifyTongxueDirectResult({ hasResult: true, hasChoice: true, title: '请确认你想查询的学校' }), 'needs-confirmation');
assert.equal(classifyTongxueDirectResult({ hasResult: true, title: '还不能确定是哪所学校' }), 'needs-confirmation');
assert.equal(classifyTongxueDirectResult({ hasResult: true, title: '学校名称识别暂不可用' }), 'needs-confirmation');

const shell = fs.readFileSync('tongxue/app/tongxue-direct-result-v156.js', 'utf8');
const entry = fs.readFileSync('tongxue/app/tongxue-performance-v158.js', 'utf8');
const page = fs.readFileSync('tongxue/index.html', 'utf8');
const changelog = fs.readFileSync('tongxue/changelog.html', 'utf8');

assert.ok(shell.includes("suggestionsBox.replaceChildren()"));
assert.ok(shell.includes("hero.hidden = !visible"));
assert.ok(shell.includes("result?.querySelector('[data-choice]')"));
assert.ok(shell.includes("button.textContent = '换一所学校'"));
assert.ok(shell.includes("result.innerHTML = '<div class=\"state-card loading direct-opening\""));
assert.ok(entry.includes("installTongxueDirectResultShell"));
assert.ok(entry.includes("family-shell.v3964_1.js?v=3964_1"));
assert.ok(page.includes('data-ui-global-header-mount'));
assert.ok(page.includes('data-example="哈尔滨工业大学"'));
assert.ok(!page.includes('data-example="hgw"'));
assert.ok(entry.indexOf('installTongxueDirectResultShell') < entry.indexOf("await import('./tongxue-performance-v112.js?v=156')"));
assert.ok(entry.indexOf('await directHandoff.start()') < entry.indexOf('directResult.refresh()'));
assert.ok(page.includes('tongxue-v158-cache-recovery-20260725'));
assert.ok(page.includes('./app/tongxue-performance-v158.js?v=158'));
assert.ok(page.includes('body.tongxue-direct-result'));
assert.ok(page.includes('同学你好 v1.5.8'));
assert.ok(changelog.indexOf('v1.5.8') < changelog.indexOf('v1.5.7'));
assert.ok(changelog.includes('学校名称有歧义或未匹配时，才保留搜索和候选学校'));

console.log('TONGXUE_DIRECT_RESULT_V157_SHARED_SHELL_OK');
