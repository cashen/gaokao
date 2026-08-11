import assert from 'node:assert/strict';
import { createAiWorkspace } from '../shared/ai/ai-workspace-contract.v3992_0.js';
import { deterministicCommand, resolveAiSchoolMentionsDetailed } from '../functions/_lib/ai/command-interpreter.js';

const aliases = new Map([
  ['沈阳工业', '沈阳工业大学'],
  ['沈工大', '沈阳工业大学'],
  ['辽石化', '辽宁石油化工大学'],
  ['辽科大', '辽宁科技大学'],
  ['沈航', '沈阳航空航天大学'],
  ['大连理工', '大连理工大学'],
  ['东北石油', '东北石油大学'],
  ['西北工业', '西北工业大学'],
  ['大连海事', '大连海事大学'],
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
expect(await command('沈阳工业所有专业最低分', candidate), { task: 'school_history', school: '沈阳工业大学' });
expect(await command('沈工大 自动化去年最低分', candidate), { task: 'school_major_history', school: '沈阳工业大学', major: '自动化' });
expect(await command('辽石化 化工最低分', candidate), { task: 'school_major_history', school: '辽宁石油化工大学', major: '化工' });
expect(await command('辽科大所有专业分数线', candidate), { task: 'school_history', school: '辽宁科技大学' });
expect(await command('东北石油 石油工程多少分', candidate), { task: 'school_major_history', school: '东北石油大学', major: '石油工程' });
expect(await command('西北工业 自动化多少分', candidate), { task: 'school_major_history', school: '西北工业大学', major: '自动化' });
expect(await command('大连海事 轮机工程多少分', candidate), { task: 'school_major_history', school: '大连海事大学', major: '轮机工程' });
expect(await command('辽石化 储能科学与工程多少分', candidate), { task: 'school_major_history', school: '辽宁石油化工大学', major: '储能科学与工程' });
expect(await command('沈工大 智能制造工程最低分', candidate), { task: 'school_major_history', school: '沈阳工业大学', major: '智能制造工程' });
expect(await command('沈航怎么样', candidate), { task: 'school_official_qa', school: '沈阳航空航天大学' });
expect(await command('大连理工宿舍怎么样', candidate), { task: 'school_official_qa', school: '大连理工大学' });
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
expect(await command('这个学校宿舍呢', historyFocus), { task: 'school_official_qa', school: '沈阳工业大学' });

// 中途打断/纠正：新指令必须覆盖旧焦点，旧地域/旧专业不能抢执行权。
expect(await command('算了，先别管分数，沈航宿舍怎么样', historyFocus), { task: 'school_official_qa', school: '沈阳航空航天大学', scoreUsage: 'suspended' });
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

console.log(JSON.stringify({ ok: true, version: 'aiplus-human-dialog-v3990_2', scenarios: 20 }, null, 2));
