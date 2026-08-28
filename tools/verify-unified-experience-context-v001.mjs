import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  STUDENT_VOICE_BOUNDARY,STUDENT_VOICE_CONTRACT_VERSION,STUDENT_VOICE_SCOPES,normalizeStudentVoiceScope,
  studentVoiceSampleLevel,studentVoiceTextMatchesTopic,studentVoiceTopicFromText
} from '../shared/resources/experience/student-voice-contract.v001.js';
import {
  STUDENT_VOICE_SOURCE,STUDENT_VOICE_SOURCE_REGISTRY_VERSION,studentVoicePublishedMirrors,studentVoiceSourceHosts
} from '../shared/resources/experience/student-voice-source-registry.v001.js';
import {onRequest as studentVoiceOnRequest,STUDENT_VOICE_SOURCE_GATEWAY_VERSION} from '../functions/_lib/student-voice-source.js';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(ROOT,relative),'utf8');
const json=data=>new Response(JSON.stringify(data),{status:200,headers:{'content-type':'application/json'}});

assert.equal(STUDENT_VOICE_CONTRACT_VERSION,'student-voice-contract-v0.01');
assert.equal(STUDENT_VOICE_SOURCE_REGISTRY_VERSION,'student-voice-source-registry-v0.01');
assert.equal(STUDENT_VOICE_SOURCE_GATEWAY_VERSION,'student-voice-source-gateway-v0.02');
assert.deepEqual(STUDENT_VOICE_SCOPES,['school','major','school_major']);
assert.equal(normalizeStudentVoiceScope('school_major'),'school_major');
assert.equal(STUDENT_VOICE_BOUNDARY.officialFact,false);
assert.equal(STUDENT_VOICE_BOUNDARY.rankingInput,false);
assert.equal(STUDENT_VOICE_BOUNDARY.admissionsProbabilityInput,false);
assert.equal(STUDENT_VOICE_BOUNDARY.recommendationScoreInput,false);
assert.equal(STUDENT_VOICE_BOUNDARY.scopeFallbackPolicy,'explicit_only');
assert.equal(studentVoiceTopicFromText('宿舍六人间有空调吗',{scope:'school'}),'dormitory');
assert.equal(studentVoiceTopicFromText('这个专业学生觉得就业怎么样',{scope:'major'}),'employment_perception');
assert.equal(studentVoiceTopicFromText('这个专业考研的人多吗',{scope:'major'}),'postgraduate');
assert.equal(studentVoiceTextMatchesTopic('四大天书确实很难，挂科压力不小','difficulty',{scope:'major'}),true);
assert.equal(studentVoiceSampleLevel(1),'single_voice');
assert.equal(studentVoiceSampleLevel(2),'two_voices');
assert.equal(studentVoiceSampleLevel(4),'recent_themes_no_consensus');
assert.equal(studentVoiceSampleLevel(5),'themes_with_visible_sample');

assert.equal(STUDENT_VOICE_SOURCE.capabilities.school,true);
assert.equal(STUDENT_VOICE_SOURCE.capabilities.major,true);
assert.equal(STUDENT_VOICE_SOURCE.capabilities.schoolMajor,false);
assert.equal(STUDENT_VOICE_SOURCE.capabilities.majorReviewSchoolBinding,false);
assert.deepEqual(studentVoicePublishedMirrors(),[
  'https://eo.srgaoxiao.cn','https://eo.srgaoxiao.com','https://srgaoxiao.cn','https://srgaoxiao.com'
]);
assert.deepEqual(studentVoiceSourceHosts(),[
  'https://eo.srgaoxiao.cn','https://eo.srgaoxiao.com','https://srgaoxiao.cn'
]);
assert.match(STUDENT_VOICE_SOURCE.observedBoundary,/edge 403/);

const realFetch=globalThis.fetch;
try{
  let forbiddenCalls=0;
  globalThis.fetch=async()=>{forbiddenCalls+=1;throw new Error('school_major must fail before external fetch');};
  const unsupported=await studentVoiceOnRequest({request:new Request('https://example.test/api/tongxue-summary?scope=school_major&school=%E6%B5%8B%E8%AF%95%E5%A4%A7%E5%AD%A6&major=%E7%94%B5%E6%B0%94%E5%B7%A5%E7%A8%8B%E5%8F%8A%E5%85%B6%E8%87%AA%E5%8A%A8%E5%8C%96&majorCode=080601')});
  assert.equal(unsupported.status,422);const blocked=await unsupported.json();
  assert.equal(blocked.error,'school_major_source_binding_unavailable');
  assert.equal(blocked.scope,'school_major');
  assert.equal(forbiddenCalls,0);

  const schoolCalls=[];
  globalThis.fetch=async input=>{
    const url=new URL(String(input));schoolCalls.push(url.toString());
    if(url.pathname.match(/^\/api\/schools\/[^/]+\/ai-summary$/))return json({summary:'学校整体学习氛围不错，社团活动也比较丰富。'});
    if(url.pathname.startsWith('/api/schools/'))return json({id:123,name:'测试大学',slug:'测试大学',province:'辽宁省',city:'沈阳市'});
    if(url.pathname==='/api/reviews/school/123'){
      const page=Number(url.searchParams.get('page')||1);
      if(page===1)return json({data:Array.from({length:6},(_,i)=>({id:`school-p1-${i}`,content:`校园活动体验 ${i}`,created_at:`2026-08-${20-i} 10:00:00`})),page:1,pageSize:6,total:12,totalPages:2});
      return json({data:[{id:'school-p2-1',content:'宿舍六人间，冬天暖气挺足。',created_at:'2026-08-10 10:00:00'},{id:'school-p2-2',content:'食堂晚饭选择不少。',created_at:'2026-08-09 10:00:00'}],page:2,pageSize:6,total:12,totalPages:2});
    }
    return new Response('{}',{status:404,headers:{'content-type':'application/json'}});
  };
  const school=await studentVoiceOnRequest({request:new Request('https://example.test/api/tongxue-summary?scope=school&school=%E6%B5%8B%E8%AF%95%E5%A4%A7%E5%AD%A6&topic=dormitory&page=1')});
  assert.equal(school.status,200);const schoolPayload=await school.json();
  assert.equal(schoolPayload.ok,true);
  assert.equal(schoolPayload.mode,'topic_reviews');
  assert.equal(schoolPayload.reviews.length,1);
  assert.match(schoolPayload.reviews[0].content,/宿舍/);
  assert.equal(schoolPayload.evidence.scannedPages,2);
  assert.equal(schoolPayload.evidence.exhaustive,true);
  assert.ok(schoolCalls.some(url=>url.includes('page=2')),'topic-aware retrieval must continue beyond page 1');

  const majorCalls=[];
  globalThis.fetch=async input=>{
    const url=new URL(String(input));majorCalls.push(url.toString());
    if(url.pathname==='/api/specialties')return json({data:[{id:2142,slug:'电气工程及其自动化',name:'电气工程及其自动化',code:'080601',category1:'工学',category2:'电气类',review_count:4}],page:1,pageSize:20,total:1});
    if(url.pathname==='/api/specialties/2142/reviews'){
      const page=Number(url.searchParams.get('page')||1);
      if(page===1)return json({data:[{id:1,specialty_id:2142,content:'高数和电路比较难，课程很多。',created_at:'2026-08-20 10:00:00',is_anonymous:1,is_verified:0},{id:2,specialty_id:2142,content:'实验课不少。',created_at:'2026-08-19 10:00:00',is_anonymous:1,is_verified:1}],page:1,pageSize:2,total:4,totalPages:2});
      return json({data:[{id:3,specialty_id:2142,content:'准备考研，专业课要早点复习。',created_at:'2026-08-18 10:00:00',is_anonymous:0,is_verified:1,nickname:'同学A'},{id:4,specialty_id:2142,content:'保研名额和具体学校有关。',created_at:'2026-08-17 10:00:00',is_anonymous:1,is_verified:0}],page:2,pageSize:2,total:4,totalPages:2});
    }
    return new Response('{}',{status:404,headers:{'content-type':'application/json'}});
  };
  const major=await studentVoiceOnRequest({request:new Request('https://example.test/api/tongxue-summary?scope=major&major=%E7%94%B5%E6%B0%94%E5%B7%A5%E7%A8%8B%E5%8F%8A%E5%85%B6%E8%87%AA%E5%8A%A8%E5%8C%96&majorCode=080601&topic=postgraduate&page=1')});
  assert.equal(major.status,200);const majorPayload=await major.json();
  assert.equal(majorPayload.ok,true);
  assert.equal(majorPayload.major.code,'080601');
  assert.equal(majorPayload.mode,'topic_reviews');
  assert.equal(majorPayload.reviews.length,2);
  assert.ok(majorPayload.reviews.every(item=>item.evidenceScope==='major'));
  assert.ok(majorPayload.reviews.every(item=>item.verificationWeight==='none'));
  assert.equal(majorPayload.evidence.sampleLevel,'two_voices');
  assert.equal(majorPayload.evidence.exhaustive,true);
  assert.ok(majorCalls.some(url=>url.includes('/api/specialties?')));
  assert.ok(majorCalls.some(url=>url.includes('/api/specialties/2142/reviews')&&url.includes('page=2')));

  let fuzzyFetch=0;globalThis.fetch=async()=>{fuzzyFetch+=1;throw new Error('ambiguous major must fail before source lookup');};
  const classLevel=await studentVoiceOnRequest({request:new Request('https://example.test/api/tongxue-summary?scope=major&major=%E8%AE%A1%E7%AE%97%E6%9C%BA%E7%B1%BB&topic=general')});
  assert.equal(classLevel.status,400);const classPayload=await classLevel.json();assert.equal(classPayload.error,'major_not_canonical');assert.equal(fuzzyFetch,0);
  const trial=await studentVoiceOnRequest({request:new Request('https://example.test/api/tongxue-summary?scope=major&major=%E5%B7%A5%E7%A7%91%E8%AF%95%E9%AA%8C%E7%8F%AD&topic=general')});
  assert.equal(trial.status,400);assert.equal(fuzzyFetch,0);
}finally{globalThis.fetch=realFetch;}

const sourceText=read('functions/_lib/student-voice-source.js');
const contractText=read('shared/resources/experience/student-voice-contract.v001.js');
assert.match(sourceText,/MAX_TOPIC_SCAN_PAGES = 3/);
assert.match(sourceText,/topic_not_found_within_budget/);
assert.match(sourceText,/mapStandardMajor/);
assert.match(sourceText,/verificationWeight:'none'/);
assert.doesNotMatch(sourceText,/school_major.{0,120}(infer|guess|推断)/i);
assert.doesNotMatch(`${sourceText}\n${contractText}`,/recommendationScore\s*[:=]\s*[1-9]|admissionsProbability\s*[:=]\s*[1-9]/);
assert.equal(fs.existsSync(path.join(ROOT,'.github/workflows/tmp-uec-source-probe.yml')),false,'temporary UEC source probe must not remain in formal candidate');

console.log('UEC v0.01 source contract verified: strict scopes, canonical major gate, bounded topic recall, sample semantics, no school-major fabrication.');