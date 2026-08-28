import assert from 'node:assert/strict';
import fs from 'node:fs';
import {deterministicAgentTask,taskExecutionPolicy} from '../functions/_lib/ai/agent-task-kernel.js';
import {runStudentVoice} from '../functions/_lib/ai/tool-registry.js';
import {
  EXPERIENCE_TOPICS,EXPERIENCE_TOPIC_KEYWORDS,normalizeExperienceTopic,experienceTopicFromText
} from '../shared/ai/aiplus-product-contract.v002.js';
import {
  STUDENT_VOICE_SCHOOL_TOPICS,STUDENT_VOICE_TOPIC_KEYWORDS,STUDENT_VOICE_BOUNDARY
} from '../shared/resources/experience/student-voice-contract.v001.js';

const major='电气工程及其自动化';
const school='沈阳工业大学';
const request=new Request('https://example.test/api/ai/turn');
const baseContext={request,aiDeterministicToolResults:{}};

function task(text,{schools=[],majors=[],workspace={}}={}){
  return deterministicAgentTask({text,schools,majors,workspace,regionKeys:[],score:null,candidateIntent:false,compareIntent:false,rankIntent:false,bottomLineMode:'',entityTurn:{}});
}

assert.equal(task('辽宁石油化工大学宿舍怎么样',{schools:['辽宁石油化工大学']}),'school_experience');
assert.equal(task(`${major}学生怎么说`,{majors:[major]}),'student_voice');
assert.equal(task(`沈工大电气学生怎么说`,{schools:[school],majors:[major]}),'student_voice');
assert.notEqual(task(`沈工大电气就业率多少`,{schools:[school],majors:[major]}),'student_voice');
assert.equal(task(`沈工大电气学生觉得就业怎么样`,{schools:[school],majors:[major]}),'student_voice');
assert.equal(task(`${major}学生怎么说`,{majors:[major],workspace:{agentContext:{currentTask:'school_research',focus:{school:'大连交通大学'}}}}),'student_voice','remembered school must not hijack an explicit major voice question');
assert.equal(taskExecutionPolicy('student_voice').commitView,false);

assert.deepEqual(EXPERIENCE_TOPICS,STUDENT_VOICE_SCHOOL_TOPICS,'AIPLuS compatibility surface must share the Student Voice school-topic owner');
assert.equal(EXPERIENCE_TOPIC_KEYWORDS,STUDENT_VOICE_TOPIC_KEYWORDS);
assert.equal(normalizeExperienceTopic('dormitory'),'dormitory');
assert.equal(experienceTopicFromText('宿舍怎么样'),'living','AIPLuS v0.02 must preserve its combined living topic while Student Voice direct mode keeps dormitory');
assert.equal(experienceTopicFromText('食堂怎么样'),'living','AIPLuS v0.02 must preserve its combined living topic while Student Voice direct mode keeps cafeteria');
assert.equal(STUDENT_VOICE_BOUNDARY.rankingInput,false);
assert.equal(STUDENT_VOICE_BOUNDARY.admissionsProbabilityInput,false);
assert.equal(STUDENT_VOICE_BOUNDARY.recommendationScoreInput,false);

async function required(options){
  const first=await runStudentVoice(baseContext,options);
  assert.equal(first.code,'client_tool_required');
  assert.equal(first.toolRequest.kind,'school_experience','Student Voice must reuse the existing deterministic browser bridge kind');
  assert.match(first.toolRequest.url,/^\/api\/tongxue-summary\?/);
  return first.toolRequest;
}
function contextWith(tool,payload,status=200){
  return {request,aiDeterministicToolResults:{[tool.key]:{kind:'school_experience',key:tool.key,url:tool.url,status,payload}}};
}

const majorTool=await required({scope:'major',major,question:`${major}学生觉得就业怎么样`});
assert.match(majorTool.url,/scope=major/);
assert.match(majorTool.url,/topic=employment_perception/);
assert.match(decodeURIComponent(majorTool.url),new RegExp(major));
const majorVoice=await runStudentVoice(contextWith(majorTool,{
  ok:true,mode:'topic_reviews',scope:'major',topic:'employment_perception',major:{code:'080601',name:major},
  reviews:[
    {id:'m1',content:'有同学觉得去电网方向比较稳定，但也看学校和个人准备。',createdAt:'2026-08-20T10:00:00Z',authorLabel:'同学A'},
    {id:'m2',content:'也有人更想去制造业自动化岗位。',createdAt:'2026-08-19T10:00:00Z',authorLabel:'匿名同学'}
  ],
  evidence:{matchCount:2,scannedCount:10,scannedPages:1,exhaustive:true,sampleLevel:'two_voices'},
  source:{name:'神人高校网',url:'https://eo.srgaoxiao.cn/specialty/test'},fetchedAt:'2026-08-21T02:00:00Z',transport:'专业公开评论'
}),{scope:'major',major,question:`${major}学生觉得就业怎么样`});
assert.equal(majorVoice.ok,true);
assert.equal(majorVoice.scope,'major');
assert.equal(majorVoice.topic,'employment_perception');
assert.equal(majorVoice.major.code,'080601');
assert.equal(majorVoice.sampleCount,2);
assert.equal(majorVoice.sampleLevel,'two_voices');
assert.equal(majorVoice.reviews.length,2);
assert.match(majorVoice.boundary,/用户生成内容/);
assert.match(majorVoice.boundary,/不是学校官方事实/);
assert.match(majorVoice.boundary,/不能代表所有学生/);

const schoolTool=await required({scope:'school',school:'辽宁石油化工大学',topic:'dormitory',question:'辽宁石油化工大学宿舍怎么样'});
assert.match(schoolTool.url,/scope=school/);
assert.match(schoolTool.url,/topic=dormitory/);
const schoolVoice=await runStudentVoice(contextWith(schoolTool,{
  ok:true,mode:'topic_reviews',scope:'school',topic:'dormitory',school:'辽宁石油化工大学',
  reviews:[{id:'s1',content:'宿舍冬天暖气挺足。',createdAt:'2026-08-18T10:00:00Z',authorLabel:'匿名同学'}],
  evidence:{matchCount:1,scannedCount:12,scannedPages:2,exhaustive:true,sampleLevel:'single_voice'},
  source:{name:'神人高校网',url:'https://eo.srgaoxiao.cn/school/test'},fetchedAt:'2026-08-21T02:00:00Z',transport:'话题公开评论'
}),{scope:'school',school:'辽宁石油化工大学',topic:'dormitory'});
assert.equal(schoolVoice.ok,true);
assert.equal(schoolVoice.mode,'topic_reviews','AIPLuS unified school voice path must consume gateway topic recall directly instead of page-1 post-filtering');
assert.equal(schoolVoice.reviews.length,1);
assert.match(schoolVoice.boundary,/用户生成内容/);
assert.match(schoolVoice.boundary,/不能代表所有学生/);

const schoolMajorTool=await required({scope:'school_major',school,major,question:`${school}${major}学生觉得就业怎么样`});
assert.match(schoolMajorTool.url,/scope=school_major/);
const unsupportedPayload={
  ok:false,error:'school_major_source_binding_unavailable',message:'当前来源的专业评论没有学校身份字段，本站不会把跨学校专业评论冒充某所学校的专业体验。',
  scope:'school_major',topic:'employment_perception',major:{code:'080601',name:major},source:{name:'神人高校网',url:'https://eo.srgaoxiao.cn'}
};
const schoolMajorVoice=await runStudentVoice(contextWith(schoolMajorTool,unsupportedPayload,422),{scope:'school_major',school,major,question:`${school}${major}学生觉得就业怎么样`});
assert.equal(schoolMajorVoice.ok,false);
assert.equal(schoolMajorVoice.scope,'school_major');
assert.equal(schoolMajorVoice.code,'school_major_source_binding_unavailable');
assert.match(schoolMajorVoice.message,/不会把跨学校专业评论冒充/);
assert.match(schoolMajorVoice.boundary,/用户生成内容/);
assert.match(schoolMajorVoice.boundary,/不能代表所有学生/);

const kernelText=fs.readFileSync('functions/_lib/ai/agent-task-kernel.js','utf8');
const orchestratorText=fs.readFileSync('functions/_lib/ai/turn-orchestrator.js','utf8');
const browserText=fs.readFileSync('aiplus/app.v3990_1.js','utf8');
const toolRegistryText=fs.readFileSync('functions/_lib/ai/tool-registry.js','utf8');
assert.match(kernelText,/student_voice/);
assert.match(kernelText,/looksOfficialOutcomeMetric/);
assert.match(orchestratorText,/voiceSchool=\(command\.schoolNames\|\|\[\]\)\[0\]/,'scope must be based on the current command school, not remembered focus');
assert.match(toolRegistryText,/runUnifiedStudentVoice/,'legacy school experience must delegate to the unified Student Voice adapter');
assert.match(toolRegistryText,/legacy_school_experience/,'legacy compatibility must be explicitly keyed to the legacy call surface');
assert.doesNotMatch(orchestratorText,/runSchoolExperience\(/,'orchestrator must not use the legacy post-filter path');
assert.match(browserText,/tool\.kind==='school_experience'.*大学生声音/,'browser must keep the single existing deterministic bridge kind');
assert.doesNotMatch(`${kernelText}\n${orchestratorText}\n${browserText}`,/student_voice.{0,120}(recommendationScore|admissionsProbability|platformScore)/i);

console.log('AIPLuS Student Voice v0.01 verified: explicit scope firewall, major voice, unified school topic recall, school-major fail-closed, human-readable UGC boundary, one browser bridge, isolated legacy compatibility, no UGC scoring.');
