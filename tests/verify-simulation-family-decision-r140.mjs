import fs from 'node:fs';
import assert from 'node:assert/strict';

const html=fs.readFileSync('ln-rank/simulation-report.html','utf8');
const css=fs.readFileSync('ln-rank/css/simulation-report-v017-responsive-input.css','utf8');

assert.match(html,/class="summary-strip decision-progress"/);
assert.match(html,/aria-label="家庭整理进度"/);
assert.match(html,/我的志愿/);
assert.match(html,/打印 \/ 保存这份方案/);
assert.doesNotMatch(html,/家庭方案与逐项复核/);
assert.doesNotMatch(html,/有历史记录需要核对/);
assert.doesNotMatch(html,/· 需核验/);

assert.match(css,/\.decision-progress/);
assert.match(css,/\.print-plan-action/);
assert.match(css,/max-width:760px/);
assert.match(css,/min-width:761px/);
assert.match(css,/z-index:100/);

console.log('simulation family decision r140 contract: PASS');
