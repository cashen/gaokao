import assert from 'node:assert/strict';
import { createAiWorkspace } from '../shared/ai/ai-workspace-contract.v3992_0.js';
import { deterministicCommand, resolveAiSchoolMentionsDetailed } from '../functions/_lib/ai/command-interpreter.js';
import { RESEARCH_RELATION_LABELS, researchRelationActions } from '../functions/_lib/ai/research-relations.js';
import { AI_FACT_BRIDGE_CONTRACT_VERSION, AI_FACT_RECORD_FIELDS } from '../shared/ai/ai-workspace-contract.v3992_0.js';

const aliases = new Map([
  ['沈阳工业', '沈阳工业大学'],
  ['沈工大', '沈阳工业大学'],
  ['辽石化', '辽宁石油化工大学'],
  ['辽科大', '辽宁科技大学'],
  ['沈航', '沈阳航空航天大学'],
  ['辽宁师范', '辽宁师范大学'],
  ['沈阳师范', '沈阳师范大学'],
  ['大连理工', '大连理工大学'],
  ['大连交通', '大连交通大学'],
  ['东北石油', '东北石油大学'],
  ['西北工业', '西北工业大学'],
  ['大连海事', '大连海事大学'],
  ['辽宁交专', '辽宁省交通高等专科学校'],
]);

const resolver = {
  resolve(query) {
    const name = aliases.get(query);
    return name
      ? { status: 'resolved', resolvedName: name }
      : { status: 'unresolved', candidates: [] };
  },
};

async function command(text, workspace = createAiWorkspace()) {
  const resolved = await resolveAiSchoolMentionsDetailed(text, resolver);
  return deterministicCommand(text, workspace, resolved.schoolNames, resolved.matchedAliases);
}

function expect(commandResult, { task, school, major, commit = false, scoreUsage }) {
  assert.equal(commandResult.agentTask, task, `${commandResult.rawText}: task`);
  if (school) assert.equal(commandResult.focus.school, school, `${commandResult.rawText}: school`);
  if (major) assert.equal(commandResult.focus.major, major, `${commandResult.rawText}: major`);
  assert.equal(commandResult.executionPolicy.commitView, commit, `${commandResult.rawText}: commitView`);
  if (scoreUsage) assert.equal(commandResult.scoreUsage, scoreUsage, `${commandResult.rawText}: scoreUsage`);
}

const candidate = createAiWorkspace({
  examContext: { score: 580 },
  activeView: { score: 580, regionKeys: ['shenyang'], majorKeywords: [] },
});

// 常见首次提问：学校简称、任意专业、所有专业、官方信息。
expect(await command('沈阳工业 测控多少分', candidate), { task: 'school_major_history', school: '沈阳工业大学', major: '测控技术与仪器' });
const multiMajor=await command('沈航 机械多少分 电气多少分 测控多少分', candidate);
expect(multiMajor, { task: 'school_major_history', school: '沈阳航空航天大学' });
assert.deepEqual(multiMajor.majorKeywords, ['机械', '电气', '测控技术与仪器'], 'multi-major spoken query must preserve each major');
const compactMultiMajor=await command('沈阳航空航天大学机械测控与材料多少分', candidate);
expect(compactMultiMajor, { task: 'school_major_history', school: '沈阳航空航天大学' });
assert.deepEqual(compactMultiMajor.majorKeywords, ['机械', '测控技术与仪器', '材料'], 'compact multi-major query must segment major aliases');
const schoolPriority=await command('辽宁石油化工大学化工多少分', candidate);
expect(schoolPriority, { task: 'school_major_history', school: '辽宁石油化工大学', major: '化工' });
const catalogCoverage=await command('沈航计算机电子信息自动化材料多少分', candidate);
expect(catalogCoverage, { task: 'school_major_history', school: '沈阳航空航天大学' });
assert.deepEqual(catalogCoverage.majorKeywords, ['计算机', '电子信息', '自动化', '材料'], 'catalog compact majors must remain ordered and canonical');
expect(await command('沈阳工业所有专业最低分', candidate), { task: 'school_history', school: '沈阳工业大学' });
expect(await command('大连交通 都多少分', candidate), { task: 'school_history', school: '大连交通大学' });
expect(await command('大连交通学校怎么样', candidate), { task: 'school_research', school: '大连交通大学' });
expect(await command('大连交通学校怎么样 给我介绍下', candidate), { task: 'school_research', school: '大连交通大学' });
expect(await command('沈阳师范学校怎么样', candidate), { task: 'school_research', school: '沈阳师范大学' });
expect(await command('我问你大连交通大概都多少分', candidate), { task: 'school_history', school: '大连交通大学' });
expect(await command('大连交通专业都多少分', candidate), { task: 'school_history', school: '大连交通大学' });
expect(await command('大连交通分都多少', candidate), { task: 'school_history', school: '大连交通大学' });
expect(await command('大连交通 自动化都多少分', candidate), { task: 'school_major_history', school: '大连交通大学', major: '自动化' });
expect(await command('沈工大 自动化去年最低分', candidate), { task: 'school_major_history', school: '沈阳工业大学', major: '自动化' });
expect(await command('辽石化 化工最低分', candidate), { task: 'school_major_history', school: '辽宁石油化工大学', major: '化工' });
expect(await command('辽科大所有专业分数线', candidate), { task: 'school_history', school: '辽宁科技大学' });
expect(await command('东北石油 石油工程多少分', candidate), { task: 'school_major_history', school: '东北石油大学', major: '石油工程' });
expect(await command('西北工业 自动化多少分', candidate), { task: 'school_major_history', school: '西北工业大学', major: '自动化' });
expect(await command('大连海事 轮机工程多少分', candidate), { task: 'school_major_history', school: '大连海事大学', major: '轮机工程' });
expect(await command('辽石化 储能科学与工程多少分', candidate), { task: 'school_major_history', school: '辽宁石油化工大学', major: '储能科学与工程' });
expect(await command('沈工大 智能制造工程最低分', candidate), { task: 'school_major_history', school: '沈阳工业大学', major: '智能制造工程' });
expect(await command('介绍下辽宁科技大学', candidate), { task: 'school_research', school: '辽宁科技大学' });
expect(await command('介绍一下辽宁科技大学', candidate), { task: 'school_research', school: '辽宁科技大学' });
expect(await command('讲讲辽科大', candidate), { task: 'school_research', school: '辽宁科技大学' });
expect(await command('说说辽科大', candidate), { task: 'school_research', school: '辽宁科技大学' });
expect(await command('了解一下辽科大', candidate), { task: 'school_research', school: '辽宁科技大学' });
expect(await command('沈航怎么样', candidate), { task: 'school_research', school: '沈阳航空航天大学' });
expect(await command('介绍下沈阳师范', candidate), { task: 'school_research', school: '沈阳师范大学' });
expect(await command('介绍下辽宁交专', candidate), { task: 'school_research', school: '辽宁省交通高等专科学校' });
expect(await command('辽宁省交通高等专科学校怎么样', candidate), { task: 'school_research', school: '辽宁省交通高等专科学校' });
expect(await command('介绍下辽宁师范的学校环境', candidate), { task: 'school_experience', school: '辽宁师范大学' });
expect(await command('辽宁科技大学哪些专业更有底子', candidate), { task: 'school_background', school: '辽宁科技大学' });
expect(await command('辽宁科技大学哪个专业最好', candidate), { task: 'school_background', school: '辽宁科技大学' });
assert.equal(RESEARCH_RELATION_LABELS.schoolMajorBackground, '看哪些专业更有积累');
assert.deepEqual(researchRelationActions({ task: 'school_history', school: '辽宁科技大学' }).map(item => item.label), ['看哪些专业更有积累', '回到学校整体介绍', '看校园环境与同学体验']);
assert.deepEqual(researchRelationActions({ task: 'school_background', school: '辽宁科技大学', major: '电气工程及其自动化' }).map(item => item.label), ['看这个专业分数', '看校园环境与同学体验', '看证据依据']);
assert.deepEqual(researchRelationActions({ task: 'major_background', major: '电气工程及其自动化' }).map(item => item.label), ['看这个专业分数', '看辽宁其他学校'], '没有具体结果学校时不得生成无法执行的占位按钮');
assert.deepEqual(researchRelationActions({ task: 'major_background', major: '电气工程及其自动化', result: { background: { items: [{ schools: [{ school: '沈阳工业大学' }] }] } } }).map(item => item.label), ['看这个专业分数', '看辽宁其他学校', '继续看沈阳工业大学']);
expect(await command('省内机械电子所有学校分数从高到低', candidate), { task: 'major_region_history', major: '机械电子工程', commit: true, scoreUsage: 'suspended' });
expect(await command('省内电气工程及自动化专业所有的分数', candidate), { task: 'major_region_history', major: '电气工程及其自动化', commit: true, scoreUsage: 'suspended' });
const regionalMultiMajor = await command('省内机械电气测控都多少分', candidate);
expect(regionalMultiMajor, { task: 'major_region_history', major: '机械', commit: true, scoreUsage: 'suspended' });
assert.deepEqual(regionalMultiMajor.majorKeywords, ['机械', '电气', '测控技术与仪器'], 'regional spoken batch must preserve every requested major');
const majorHistoryFollowup = createAiWorkspace({
  activeView: { score: null, regionKeys: ['ln'], majorKeywords: ['机械电子工程'], schoolNames: [], bottomLineMode: 'all' },
  agentContext: { currentTask: 'major_region_history', focus: { major: '机械电子工程' } },
});
const excludeSino = await command('去掉中外', majorHistoryFollowup);
expect(excludeSino, { task: 'major_region_history', major: '机械电子工程', commit: true, scoreUsage: 'suspended' });
assert.equal(excludeSino.bottomLineMode, 'exclude_sino', '取消中外 should only exclude Sino/high-fee projects');
const schoolHistoryScope = createAiWorkspace({
  activeView: { score: null, regionKeys: ['ln'], majorKeywords: [], schoolNames: ['沈阳航空航天大学'], bottomLineMode: 'all' },
  agentContext: { currentTask: 'school_history', focus: { school: '沈阳航空航天大学' } },
  lastResult: { history: { school: '沈阳航空航天大学', majorKeywords: [] } },
});
const schoolExcludeSino = await command('去掉中外', schoolHistoryScope);
expect(schoolExcludeSino, { task: 'school_history', school: '沈阳航空航天大学' });
assert.equal(schoolExcludeSino.bottomLineMode, 'exclude_sino', 'school history scope correction must retain the school task');
const schoolExperienceContinuation = createAiWorkspace({
  examContext: { score: 580 },
  activeView: { score: 580, regionKeys: ['ln'], majorKeywords: [], schoolNames: ['辽宁师范大学'] },
  agentContext: { currentTask: 'school_experience', focus: { school: '辽宁师范大学' } },
});
expect(await command('沈阳师范', schoolExperienceContinuation), { task: 'school_research', school: '沈阳师范大学' });
expect(await command('沈航学校环境怎么样', candidate), { task: 'school_experience', school: '沈阳航空航天大学' });
expect(await command('辽宁科技大学人文关怀怎么样', candidate), { task: 'school_experience', school: '辽宁科技大学' });
expect(await command('大连理工宿舍怎么样', candidate), { task: 'school_experience', school: '大连理工大学' });
expect(await command('大连理工官方食宿条件', candidate), { task: 'school_official_qa', school: '大连理工大学' });
for (const prompt of ['只看辽宁科技大学','筛选辽宁科技大学','保留辽宁科技大学','换成辽宁科技大学','改成辽宁科技大学','收窄到辽宁科技大学']) {
  const explicitSchoolFilter=await command(prompt, candidate);
  assert.ok(['candidate_discovery','candidate_refinement'].includes(explicitSchoolFilter.agentTask), prompt);
  assert.equal(explicitSchoolFilter.executionPolicy.commitView,true,prompt);
  assert.deepEqual(explicitSchoolFilter.schoolNames,['辽宁科技大学'],prompt);
  assert.deepEqual(explicitSchoolFilter.changeSet.school,{op:'set',values:['辽宁科技大学']},prompt);
}
expect(await command('东北大学材料最低分', candidate), { task: 'school_major_history', school: '东北大学', major: '材料' });

// 真正的地域候选问题仍必须是候选搜索，不能被学校简称规则反噬。
const regional = await command('580分沈阳能报什么', createAiWorkspace());
assert.ok(['candidate_discovery', 'candidate_refinement'].includes(regional.agentTask));
assert.deepEqual(regional.regionKeys, ['shenyang']);
assert.equal(regional.schoolNames.length, 0);

// 连续追问：默认沿用当前学校，但允许切专业、看全校、切官方信息。
const historyFocus = createAiWorkspace({
  examContext: { score: 580 },
  activeView: { score: 580, regionKeys: ['shenyang'], majorKeywords: [] },
  agentContext: {
    currentTask: 'school_major_history',
    focus: { school: '沈阳工业大学', major: '测控技术与仪器', majors: ['测控技术与仪器'] },
  },
});
expect(await command('自动化呢', historyFocus), { task: 'school_major_history', school: '沈阳工业大学', major: '自动化' });
expect(await command('所有专业呢', historyFocus), { task: 'school_history', school: '沈阳工业大学' });
expect(await command('这个学校宿舍呢', historyFocus), { task: 'school_experience', school: '沈阳工业大学' });
expect(await command('学校环境呢', historyFocus), { task: 'school_experience', school: '沈阳工业大学' });

// 中途打断/纠正：新指令必须覆盖旧焦点，旧地域/旧专业不能抢执行权。
expect(await command('算了，先别管分数，沈航宿舍怎么样', historyFocus), { task: 'school_experience', school: '沈阳航空航天大学', scoreUsage: 'suspended' });
expect(await command('等下，换辽石化，化工最低分', historyFocus), { task: 'school_major_history', school: '辽宁石油化工大学', major: '化工' });
const fitFocus = createAiWorkspace({
  examContext: { score: 580 },
  activeView: { score: 580, regionKeys: ['all'], majorKeywords: [] },
  agentContext: { currentTask: 'fit_assessment', focus: { school: '沈阳工业大学' } },
});
expect(await command('我不是问能不能上，我问去年最低分', fitFocus), { task: 'school_history', school: '沈阳工业大学', scoreUsage: 'remembered' });
expect(await command('不看测控了，所有专业最低分', historyFocus), { task: 'school_history', school: '沈阳工业大学' });
const interrupted = await command('先不问学校了，580分沈阳能报什么', historyFocus);
assert.ok(['candidate_discovery', 'candidate_refinement'].includes(interrupted.agentTask));
assert.deepEqual(interrupted.regionKeys, ['shenyang']);

assert.equal(AI_FACT_BRIDGE_CONTRACT_VERSION, 'ai-fact-bridge-v3992_10');
for (const field of ['queryMajor','queryIndex','queryStatus','queryErrorCode','queryErrorMessage']) assert.ok(AI_FACT_RECORD_FIELDS.includes(field), `fact bridge field missing: ${field}`);
console.log(JSON.stringify({ ok: true, version: 'aiplus-human-dialog-v3992_9', scenarios: 48 }, null, 2));
