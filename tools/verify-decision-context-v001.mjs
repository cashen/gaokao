import assert from 'node:assert/strict';
import {
  DECISION_CONTEXT_VERSION,
  DECISION_CONTEXT_QUERY_KEY,
  createDecisionContext,
  decodeDecisionContext,
  encodeDecisionContext,
  sanitizeDecisionReturnTarget,
  decisionContextFromLocation,
  withDecisionContext,
  summarizeDecisionContext
} from '../shared/decision-context/decision-context.v001.js';
import { buildDecisionActions } from '../shared/decision-context/decision-actions.v001.js';
import {
  buildMajorPathHref,
  readMajorPathSourceContext
} from '../shared/resources/majors/major-path-navigation.v003.js';
import {
  buildStudentVoiceMajorHref,
  readStudentVoiceMajorContext
} from '../shared/resources/experience/student-voice-navigation.v001.js';

const context = createDecisionContext({
  sourceSurface:'ln-rank',
  sourceAction:'view_major_path',
  returnTo:'/ln-rank/?mode=major-all&region=%E6%B2%88%E9%98%B3',
  province:'辽宁',
  admissionYear:2026,
  track:'物理类',
  score:580,
  rank:undefined,
  regionKeys:['沈阳'],
  regionLabel:'沈阳',
  school:'测试大学',
  major:'机械工程',
  majorCode:'080201',
  majorKeywords:['机械'],
  projectMode:'all',
  candidateIds:['record-1'],
  pendingQuestions:['要不要再核对校区？'],
  evidenceRefs:[{kind:'history',label:'专业历史',ref:'record-1'}]
});
assert.equal(DECISION_CONTEXT_VERSION,'decision-context-v0.01');
assert.equal(context.score,580);
assert.equal(context.rank,null,'score and rank must not be inferred');
assert.equal(context.majorCode,'080201');
assert.equal(context.returnTo,'/ln-rank/?mode=major-all&region=%E6%B2%88%E9%98%B3');
const encoded=encodeDecisionContext(context);
assert.ok(encoded.length>0 && !encoded.includes('='),'context uses bounded url-safe encoding');
const decoded=decodeDecisionContext(encoded);
assert.deepEqual(decoded,context);
assert.equal(decodeDecisionContext(encoded.slice(0,-1)+'!'),null);
assert.equal(sanitizeDecisionReturnTarget('https://evil.example/steal'),'/ln-rank/');
assert.equal(sanitizeDecisionReturnTarget('/aiplus/?x=1'),'/aiplus/?x=1');
assert.equal(decisionContextFromLocation({href:`https://gaokao.powers.org.cn/aiplus/?${DECISION_CONTEXT_QUERY_KEY}=${encoded}`})?.contextId,context.contextId);
const aiplus=withDecisionContext('/aiplus/',context);
assert.match(aiplus,/^\/aiplus\/\?dc=/);
assert.equal(summarizeDecisionContext(context).lines.join(' · '),'辽宁 · 2026 · 物理类 · 沈阳 · 测试大学 · 机械工程 · 580分 · 普通项目/含中外合作项目');

const pathHref=buildMajorPathHref({
  majorCode:'080201',
  canonicalName:'机械工程',
  context:'score',
  sourceKey:'record-1',
  sourceMajor:'机械',
  school:'测试大学',
  returnTo:context.returnTo,
  decisionContext:context
});
const pathSource=readMajorPathSourceContext({href:`https://gaokao.powers.org.cn${pathHref}`});
assert.equal(pathSource.majorCode,'080201');
assert.equal(pathSource.decisionContext.contextId,context.contextId);
const voiceHref=buildStudentVoiceMajorHref({
  majorCode:'080201',
  canonicalName:'机械工程',
  context:'score',
  sourceKey:'record-1',
  returnTo:context.returnTo,
  decisionContext:{...context,sourceAction:'view_student_voice'}
});
const voiceSource=readStudentVoiceMajorContext({href:`https://gaokao.powers.org.cn${voiceHref}`});
assert.equal(voiceSource.decisionContext.majorCode,'080201');

const bounded=buildDecisionActions(context,{
  majorPathHref:pathHref,
  studentVoiceHref:voiceHref,
  aiplusHref:aiplus,
  returnHref:context.returnTo
});
assert.ok(bounded.length<=4);
assert.deepEqual(bounded.map(item=>item.id),['view_major_path','view_student_voice','ask_family_advisor','return_to_source']);
const withRecord=buildDecisionActions({...context,selectionSnapshot:[{id:'record-1',schoolCode:'S1',score:580}]},{
  majorPathHref:pathHref,studentVoiceHref:voiceHref,aiplusHref:aiplus,returnHref:context.returnTo
});
assert.ok(withRecord.some(item=>item.id==='add_to_family_plan'));
const noMajor=buildDecisionActions({...context,major:'',majorCode:''},{
  aiplusHref:aiplus,returnHref:context.returnTo
});
assert.deepEqual(noMajor.map(item=>item.id),['ask_family_advisor','return_to_source']);

const huge=encodeDecisionContext({...context,evidenceRefs:Array.from({length:8},()=>({kind:'reference',label:'x'.repeat(180),ref:'y'.repeat(180)}))});
assert.equal(huge,'','oversized context must fail closed');
console.log('Decision context v0.01 verified: readonly, bounded, same-origin, non-inferred score/rank, navigation carry, and deterministic actions.');
