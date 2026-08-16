import assert from 'node:assert/strict';
import {createAiWorkspace} from '../shared/ai/ai-workspace-contract.v3992_0.js';
import {deterministicCommand,resolveAiSchoolMentionsDetailed} from '../functions/_lib/ai/command-interpreter.js';
import {resolveCanonicalEducationEntity,resolveEducationKnowledgeQuestion,knowledgeCoverageSnapshot,EDUCATION_AUTHORITY_REGISTRY} from '../functions/_lib/ai/education-knowledge-center.js';
import {runEducationKnowledge,EDUCATION_KNOWLEDGE_RUNTIME_TESTING} from '../functions/_lib/ai/education-knowledge-runtime.js';
import {runEducationKnowledgeEvidence,OFFICIAL_WEB_EVIDENCE_TESTING} from '../functions/_lib/ai/official-web-evidence.js';

const aliases=new Map([['沈工大','沈阳工业大学'],['沈阳工业','沈阳工业大学'],['辽科大','辽宁科技大学'],['沈航','沈阳航空航天大学']]);
const resolver={resolve(query){const name=aliases.get(query);return name?{status:'resolved',resolvedName:name}:{status:'unresolved',candidates:[]};}};
async function command(text,workspace=createAiWorkspace()){const resolved=await resolveAiSchoolMentionsDetailed(text,resolver);return deterministicCommand(text,workspace,resolved.schoolNames,resolved.matchedAliases);}

const coverage=knowledgeCoverageSnapshot();
assert.ok(coverage.taxonomyCount>=18,'AEK taxonomy must cover the declared education/admissions domains');
assert.equal(coverage.undergraduateMajorCount,883,'AEK must reuse the canonical 2026 full undergraduate catalog rather than a partial duplicate');
assert.ok(coverage.undergraduateCategoryCount>=92,'undergraduate category coverage must remain full-catalog based');
assert.ok(coverage.authoritySourceCount>=8,'authority routing registry must contain multiple domain owners');
assert.ok(coverage.relationCount>=8,'common-confusion relations must be a first-class knowledge asset');
assert.equal(coverage.unknownPolicy,'unknown_is_valid_never_promote_by_llm');

const materialForming=resolveCanonicalEducationEntity('材料成型及控制工程');
assert.equal(materialForming?.entity?.type,'undergraduate_major');
assert.equal(materialForming?.entity?.officialCode,'080203');
assert.equal(materialForming?.source?.key,'moe_undergraduate_2026');
const controlDiscipline=resolveCanonicalEducationEntity('控制科学与工程');
assert.equal(controlDiscipline?.entity?.type,'graduate_first_level_discipline');
assert.equal(controlDiscipline?.entity?.officialCode,'0811');
assert.equal(controlDiscipline?.source?.key,'moe_graduate_2022');

const majorVsDiscipline=resolveEducationKnowledgeQuestion('自动化和控制科学与工程有什么区别');
assert.equal(majorVsDiscipline.ok,true,'comparison must resolve canonical entities instead of collapsing terms');
assert.equal(majorVsDiscipline.entities.length,2);
assert.equal(majorVsDiscipline.entities[0].type,'undergraduate_major');
assert.equal(majorVsDiscipline.entities[1].type,'graduate_first_level_discipline');
const educationLayers=resolveEducationKnowledgeQuestion('本科专业与一级学科有什么区别');
assert.equal(educationLayers.ok,true);
assert.ok(educationLayers.relationTexts.some(text=>text.includes('层级')),'major vs discipline relation must be explicit');
const labels=resolveEducationKnowledgeQuestion('985、211和双一流有什么区别');
assert.equal(labels.ok,true);
assert.equal(labels.entities.length,3);

const compound=resolveEducationKnowledgeQuestion('材料加工与工业控制是什么意思');
assert.equal(compound.ok,false);
assert.equal(compound.resolutionClass,'source_specific_or_compound');
assert.match(compound.message,/没有被确认成教育部2026本科专业目录中的一个完整规范专业名称/);
assert.ok(compound.nearby.some(item=>item.name==='材料加工'||item.name==='工业控制'));
const compoundRuntime=await runEducationKnowledge({env:{}},{question:'材料加工与工业控制是什么意思'});
assert.equal(compoundRuntime.ok,true,'fail-closed unknown is still a valid user-facing result');
assert.equal(compoundRuntime.answerStatus,'needs_clarification');
assert.doesNotMatch(compoundRuntime.answer,/材料加工与工业控制专业主要|该专业主要学习/);

const canonicalRuntime=await runEducationKnowledge({env:{}},{question:'材料成型及控制工程是什么'});
assert.equal(canonicalRuntime.ok,true);
assert.equal(canonicalRuntime.answerStatus,'answered');
assert.equal(canonicalRuntime.canonical?.officialCode,'080203');
assert.match(canonicalRuntime.answer,/2026年|规范本科专业|专业代码/);

const schoolContext=createAiWorkspace({
  examContext:{score:580},
  activeView:{score:580,regionKeys:['ln'],majorKeywords:['机械'],schoolNames:['沈阳工业大学'],bottomLineMode:'all'},
  agentContext:{currentTask:'school_research',focus:{school:'沈阳工业大学',sourceText:'沈阳工业大学怎么样'}}
});
const policyAfterSchool=await command('辽宁省高校专项计划 给我介绍下是什么意思',schoolContext);
assert.equal(policyAfterSchool.agentTask,'knowledge_explain','new knowledge object must preempt remembered school focus');
assert.equal(policyAfterSchool.executionPolicy.commitView,false);
assert.equal(policyAfterSchool.scoreUsage,'remembered','remembered score must not silently become an eligibility filter');
assert.deepEqual(policyAfterSchool.schoolNames,[],'remembered school is not an explicit current-turn school entity');

const knowledgeContext=createAiWorkspace({
  examContext:{score:580},
  activeView:{score:580,regionKeys:['ln'],majorKeywords:['机械'],schoolNames:[],bottomLineMode:'all'},
  agentContext:{currentTask:'knowledge_explain',focus:{school:'',major:'',schools:[],majors:[],sourceText:'辽宁省高校专项计划是什么意思'}}
});
const locationFollowup=await command('我家在岫岩，这个能报吗',knowledgeContext);
assert.equal(locationFollowup.agentTask,'knowledge_explain','concept follow-up must retain knowledge task without inventing a new state owner');
assert.equal(locationFollowup.executionPolicy.commitView,false);
const scoreFollowup=await command('我580分符合这个条件吗',knowledgeContext);
assert.equal(scoreFollowup.agentTask,'knowledge_explain');
assert.equal(scoreFollowup.scoreUsage,'active','an explicitly restated score may reconnect to a knowledge eligibility question');
const schoolFollowup=await command('沈工大有这个专项吗',knowledgeContext);
assert.equal(schoolFollowup.agentTask,'knowledge_explain');
assert.deepEqual(schoolFollowup.schoolNames,['沈阳工业大学'],'explicit school reconnect must be preserved without becoming school_research');
assert.equal(schoolFollowup.executionPolicy.commitView,false);

const liaoningSource=EDUCATION_AUTHORITY_REGISTRY.liaoning_special_2026;
assert.equal(new URL(liaoningSource.sourceUrl).hostname,'jyt.ln.gov.cn');
assert.equal(liaoningSource.effectiveYear,2026);
assert.equal(liaoningSource.temperature,'T2');
assert.equal(OFFICIAL_WEB_EVIDENCE_TESTING.allowedUrl(liaoningSource.sourceUrl),liaoningSource.sourceUrl);
assert.equal(OFFICIAL_WEB_EVIDENCE_TESTING.allowedUrl('https://baike.baidu.com/item/test'),'','third-party encyclopedia cannot become AEK policy authority');

const fixture=`Title: 2026年我省继续实施高校招生专项计划\n\nURL Source: ${liaoningSource.sourceUrl}\n\nMarkdown Content:\n2026年我省继续实施高校招生专项计划\n我省2026年继续组织实施教育部高校专项计划和辽宁省高校专项计划。实施区域为：岫岩县、新宾县、清原县、宽甸县、桓仁县。辽宁省高校专项计划，安排在普通类本科批次录取。教育部高校专项计划，要求考生高考成绩总分不低于我省特殊类型招生录取控制分数线。自2026年起，教育部高校专项计划不再由高校组织报名、资格审核和校测。考生具有上述户籍地区范围内连续3年以上户籍，考生具有户籍所在县（市）高中连续3年学籍并实际就读。有报考专项计划意愿的考生，须于2026年4月20日—26日完成专项计划报考资格申请。`;
const fakeFetch=async url=>({ok:true,status:200,headers:new Headers(),text:async()=>String(url).startsWith('https://r.jina.ai/')?fixture:''});
const live=await runEducationKnowledgeEvidence({}, {canonicalName:'辽宁省高校专项计划',query:'辽宁省高校专项计划是什么意思',sourceUrl:liaoningSource.sourceUrl,sourceTitle:liaoningSource.title,issuer:liaoningSource.issuer,cycle:'2026',jurisdiction:'辽宁'},fakeFetch);
assert.equal(live.ok,true);
assert.equal(live.searched,false,'registered exact authority page should be read directly before search');
assert.equal(live.searchResultIsSource,false);
assert.equal(live.sources[0].sourceUrl,liaoningSource.sourceUrl);
const facts=EDUCATION_KNOWLEDGE_RUNTIME_TESTING.liaoningSpecialFacts(live.evidenceText,['special:辽宁省高校专项']);
assert.ok(facts.some(text=>text.includes('两个计划')));
assert.ok(facts.some(text=>text.includes('岫岩县')));
assert.ok(facts.some(text=>text.includes('4月20日至26日')));
assert.equal(OFFICIAL_WEB_EVIDENCE_TESTING.knowledgePageRelevant(fixture,'','辽宁省高校专项计划',['沈阳工业大学']),false,'school-specific evidence must contain the explicit school entity');
assert.equal(EDUCATION_KNOWLEDGE_RUNTIME_TESTING.currentClaimRequested('今年辽宁高校专项有什么要求','current_rule'),true);
assert.equal(EDUCATION_KNOWLEDGE_RUNTIME_TESTING.currentClaimRequested('高校专项是什么','definition'),false);

const policyDefinition=resolveEducationKnowledgeQuestion('辽宁省高校专项计划是什么意思');
assert.equal(policyDefinition.ok,true);
assert.equal(policyDefinition.entities[0].id,'special:辽宁省高校专项');
assert.equal(policyDefinition.entities[0].temperature,'T2');
assert.ok(policyDefinition.entities[0].confusions.includes('高校专项计划'));

console.log(JSON.stringify({ok:true,version:'aiplus-aek-verifier-v0.01',coverage,checks:{contextFirewall:true,followups:true,canonicalMajor:true,graduateDiscipline:true,compoundFailClosed:true,authorityRouting:true,liveEvidenceGate:true}},null,2));
