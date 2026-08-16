import assert from 'node:assert/strict';
import {createAiWorkspace} from '../shared/ai/ai-workspace-contract.v3992_0.js';
import {deterministicCommand,resolveAiSchoolMentionsDetailed} from '../functions/_lib/ai/command-interpreter.js';
import {normalizeMajorLanguage} from '../functions/_lib/ai/major-language-resolver.js';
import {scoreConstraintFromText} from '../functions/_lib/ai/human-query-frame.js';

const aliases=new Map([
  ['沈工大','沈阳工业大学'],['沈阳工业','沈阳工业大学'],['沈航','沈阳航空航天大学'],['辽科大','辽宁科技大学'],['辽石化','辽宁石油化工大学'],
  ['大连交通','大连交通大学'],['辽宁师范','辽宁师范大学'],['沈阳师范','沈阳师范大学'],['大连理工','大连理工大学'],['东北石油','东北石油大学']
]);
const resolver={resolve(query){const name=aliases.get(query);return name?{status:'resolved',resolvedName:name,matchType:'alias_exact'}:{status:'unresolved',candidates:[]};}};
async function command(text,workspace=createAiWorkspace()){
  const resolved=await resolveAiSchoolMentionsDetailed(text,resolver);
  return deterministicCommand(text,workspace,resolved.schoolNames,resolved.matchedAliases);
}

let assertions=0;
const contexts=[
  ['empty',createAiWorkspace()],
  ['remembered-school',createAiWorkspace({examContext:{score:580},activeView:{score:580,regionKeys:['ln'],majorKeywords:['机械'],schoolNames:['沈阳化工大学'],bottomLineMode:'all'},agentContext:{currentTask:'school_research',focus:{school:'沈阳化工大学',schools:['沈阳化工大学'],sourceText:'沈阳化工大学怎么样'}}})],
  ['remembered-major',createAiWorkspace({examContext:{score:580},activeView:{score:580,regionKeys:['ln'],majorKeywords:['测控技术与仪器'],schoolNames:[],bottomLineMode:'all'},agentContext:{currentTask:'major_region_history',focus:{major:'测控技术与仪器',majors:['测控技术与仪器'],sourceText:'省内测控都多少分'}}})]
];

// 1) 学校简称 × 全量量词 × 历史事实表达：不允许因为无空格粘连而丢掉学校实体。
const schoolScopes=['所有专业','全部专业','全校专业','各专业','各个专业','每个专业','每一专业'];
const historySuffixes=['最低分','都多少分','投档分','录取分','分数线','位次'];
for(const [alias,school] of [...aliases.entries()].slice(0,7)){
  for(const scope of schoolScopes){
    for(const suffix of historySuffixes){
      for(const compact of [true,false]){
        const prompt=compact?`${alias}${scope}${suffix}`:`${alias} ${scope} ${suffix}`;
        const cmd=await command(prompt);
        assert.equal(cmd.agentTask,'school_history',`${prompt}: all-school-major history route`);
        assert.equal(cmd.focus.school,school,`${prompt}: school alias extraction`);
        assert.equal(cmd.focus.major,'',`${prompt}: collection scope must not be fabricated as a major`);
        assertions+=3;
      }
    }
  }
}

// 2) 分数区间 × 地区 × 专业 × 全量表达 × 语序：区间是查询窗口，不是“考生500分”。
const rangeForms=['500-600','500—600','500到600','500至600','500～600','500分到600分'];
const regionForms=['省内','辽宁省内','辽宁'];
const majorAliases=['会计','电气工程及自动化','机械电子','测控','自动化','计算机'];
const scopeTemplates=[
  major=>`所有${major}专业`,
  major=>`全部${major}专业`,
  major=>`${major}专业都列出来`,
  major=>`所有学校的${major}专业`
];
const orderTemplates=[
  (range,region,scope)=>`${range} ${region} ${scope}`,
  (range,region,scope)=>`${region} ${range} ${scope}`,
  (range,region,scope)=>`${region} ${scope} ${range}`,
  (range,region,scope)=>`${scope} ${range} ${region}`
];
let rangeRouteCount=0;
for(const range of rangeForms){
  const parsed=scoreConstraintFromText(range);assert.equal(parsed.kind,'range',`${range}: parser kind`);assert.deepEqual([parsed.min,parsed.max],[500,600],`${range}: parser bounds`);
  for(const region of regionForms){
    for(const majorAlias of majorAliases){
      const canonical=normalizeMajorLanguage(majorAlias);
      for(const makeScope of scopeTemplates){
        const scope=makeScope(majorAlias);
        for(const makePrompt of orderTemplates){
          const prompt=makePrompt(range,region,scope);
          for(const [contextName,workspace] of contexts){
            const cmd=await command(prompt,workspace);
            assert.equal(cmd.agentTask,'major_region_history',`${contextName} ${prompt}: score-window major-region route`);
            assert.equal(cmd.score,null,`${contextName} ${prompt}: range must not collapse to point score`);
            assert.equal(cmd.scoreConstraint?.kind,'range',`${contextName} ${prompt}: command range kind`);
            assert.deepEqual([cmd.scoreConstraint?.min,cmd.scoreConstraint?.max],[500,600],`${contextName} ${prompt}: command range bounds`);
            assert.equal(cmd.scoreUsage,'suspended',`${contextName} ${prompt}: range is record filter, not candidate point score`);
            assert.equal(cmd.focus.major,canonical,`${contextName} ${prompt}: canonical major`);
            assert.equal(cmd.executionPolicy.commitView,true,`${contextName} ${prompt}: region/major view owner`);
            rangeRouteCount++;
            assertions+=7;
          }
        }
      }
    }
  }
}

// 3) 上下界表达也属于历史记录窗口，不应变成单点候选。
const boundCases=[
  ['550以上省内会计专业',{kind:'min',min:550,max:null}],
  ['不低于550分 辽宁 会计专业',{kind:'min',min:550,max:null}],
  ['600以下省内电气专业',{kind:'max',min:null,max:600}],
  ['不高于600分 辽宁 自动化专业',{kind:'max',min:null,max:600}]
];
for(const [prompt,expected] of boundCases){
  const cmd=await command(prompt);
  assert.equal(cmd.agentTask,'major_region_history',`${prompt}: bounded history route`);
  assert.equal(cmd.score,null,`${prompt}: bound must not become point score`);
  assert.equal(cmd.scoreConstraint?.kind,expected.kind,`${prompt}: bound kind`);
  assert.equal(cmd.scoreConstraint?.min,expected.min,`${prompt}: min`);
  assert.equal(cmd.scoreConstraint?.max,expected.max,`${prompt}: max`);
  assertions+=5;
}

// 4) 单点分数仍然是候选语义，证明 range 扩展没有吞掉原候选 owner。
for(const prompt of ['580分省内会计专业','580分 辽宁 电气专业','我580分想看省内机械电子']){
  const cmd=await command(prompt,createAiWorkspace());
  assert.equal(cmd.scoreConstraint?.kind,'point',`${prompt}: point score kind`);
  assert.equal(cmd.score,580,`${prompt}: point score value`);
  assert.ok(['candidate_discovery','candidate_refinement'].includes(cmd.agentTask),`${prompt}: point candidate route`);
  assertions+=3;
}

console.log(JSON.stringify({ok:true,version:'aiplus-routing-grid-v0.01',assertions,rangeRouteCount,dimensions:{schoolAliases:7,schoolScopes:schoolScopes.length,historySuffixes:historySuffixes.length,rangeForms:rangeForms.length,regions:regionForms.length,majorAliases:majorAliases.length,rangeScopeTemplates:scopeTemplates.length,orders:orderTemplates.length,contexts:contexts.length}},null,2));
