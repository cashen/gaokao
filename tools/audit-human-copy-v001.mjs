import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = file => fs.readFileSync(file, 'utf8');
const collectProductSources = (dir, extensions = new Set(['.js', '.html'])) => {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes:true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectProductSources(full, extensions));
    else if (extensions.has(path.extname(entry.name))) out.push([full, read(full)]);
  }
  return out;
};

const agents = read('AGENTS.md');
const startHere = read('docs/architecture/START-HERE.md');
const skill = read('docs/skills/human-copy/SKILL.md');
const action = read('shared/ui/contracts/action-contract.v3970_0.js');
const copy = read('shared/ui/contracts/copy-contract.v3970_0.js');
const schoolMode = read('ln-rank/js/feature/school-majors/school-all-mode.v3969_0.js');
const rootHtml = read('index.html');
const lnHtml = read('ln-rank/index.html');
const tongxueHtml = read('tongxue/index.html');
const tongxueView = read('tongxue/app/tongxue-runtime-result-view-v159.js');

assert.match(agents, /docs\/skills\/human-copy\/SKILL\.md/, 'Human Copy must be registered in AGENTS.md');
assert.match(startHere, /docs\/skills\/human-copy\/SKILL\.md/, 'Human Copy must be visible in the maintainer startup map');
assert.match(skill, /b050eefa88af3709ec24fc0b353740ccb151f563/, 'Human Copy must pin the reviewed upstream reference');
assert.match(skill, /not a vendored copy|not.*vendored|independent product-specific adaptation/i, 'Human Copy must document the upstream-license boundary');
assert.match(skill, /tools\/audit-ai-human-copy-contract\.mjs/, 'Human Copy must preserve the existing AIPLuS copy-safety owner');
assert.match(startHere, /tools\/audit-ai-human-copy-contract\.mjs/, 'architecture handoff must name the existing AIPLuS human-copy audit');
assert.match(startHere, /remains the existing AIPLuS\/diagnosis copy-safety audit/, 'architecture handoff must preserve the existing AIPLuS human-copy owner semantics');
assert.match(startHere, /not a new AIPLuS answer owner/, 'architecture handoff must reject a second AIPLuS answer owner');

for (const [name, source] of [['action-contract', action], ['copy-contract', copy]]) {
  assert.match(source, /大学生怎么说/, `${name} must use plain student-opinion wording`);
  assert.doesNotMatch(source, /publicReviews[^\n]*['"]公开评论['"]/, `${name} must not expose 公开评论 as the current student-opinion CTA`);
}

assert.match(schoolMode, /action-contract\.v3970_0\.js\?v=3970_0-hc001/, 'active school mode must use the current human-copy action contract');
assert.match(schoolMode, /大学生怎么说/, 'active school mode must have a human-readable fallback');
assert.doesNotMatch(schoolMode, /reviews:[^\n]*公开评论/, 'active school mode must not fall back to 公开评论');
assert.match(lnHtml, /school-all-mode\.v3969_0\.js\?v=3969_0-hc001/, 'ln-rank must cache-bust the active school-mode copy transaction');
assert.doesNotMatch(lnHtml, /系统会换算为辽宁2026物理类历史位次/, 'ln-rank score help must not narrate the system');

for (const phrase of ['AI总结', '为什么这么判断？', 'provenance', '暂无足够反馈生成总结', '公开评论服务']) {
  assert.doesNotMatch(tongxueView, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `Tongxue public copy still exposes implementation language: ${phrase}`);
}
for (const phrase of ['先看这两件事', '这些概括从哪来？', '几条有代表性的学生留言', '学生留言']) {
  assert.ok(tongxueView.includes(phrase), `Tongxue human copy marker missing: ${phrase}`);
}
assert.match(tongxueHtml, /tongxue-runtime-result-view-v159\.js\?v=159-flow004/, 'Tongxue result view must use the new immutable copy identity');
assert.match(tongxueHtml, /整理学生公开留言，帮你了解学习、生活和就业体验/, 'Tongxue landing copy must describe the user benefit, not the implementation');

const hardAssistantPhrases = [
  '作为AI', '作为 AI', '截至我的知识', '希望这能帮助你', '接下来我们将', '下面我们来看', '让我们先', '敲黑板', '划重点'
];
const productSources = [
  ['index.html', rootHtml],
  ['ln-rank/index.html', lnHtml],
  ['tongxue/index.html', tongxueHtml],
  ['tongxue/result-view', tongxueView],
  ...collectProductSources('aiplus').map(([file, source]) => [file.replaceAll('\\', '/'), source]),
  ...collectProductSources('major-path').map(([file, source]) => [file.replaceAll('\\', '/'), source])
];
for (const [name, source] of productSources) {
  for (const phrase of hardAssistantPhrases) {
    assert.ok(!source.includes(phrase), `${name} contains assistant-style phrase: ${phrase}`);
  }
}

console.log(JSON.stringify({
  ok: true,
  contract: 'human-copy-foundation-v0.01',
  foundations: ['eastern-philosophy', 'human-copy'],
  aiplusCopyOwnerPreserved: true,
  lnRankStudentVoiceLabel: '大学生怎么说',
  tongxueSummaryHeading: '先看这两件事',
  publicSourcesChecked: productSources.length,
  checkedHardAssistantPhrases: hardAssistantPhrases.length
}, null, 2));
