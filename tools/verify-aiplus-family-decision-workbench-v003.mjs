import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createAiWorkspace,applyAiWorkspaceEvent,compactAiWorkspaceForServer} from '../shared/ai/ai-workspace-contract.v3992_0.js';
import {deriveDecisionProgress} from '../shared/ai/decision-progress.v003.js';
import {buildDecisionBook} from '../shared/ai/decision-book.v003.js';
import {deterministicMentorProfile} from '../functions/_lib/ai/mentor-profile.js';
import {reflectDecisionTurn} from '../functions/_lib/ai/decision-reflection.js';
import {nextActionsForTurn} from '../functions/_lib/ai/next-action-engine.js';
import {runSelectionReview} from '../functions/_lib/ai/selection-review.js';

let assertions=0;
function eq(actual,expected,message){assert.deepEqual(actual,expected,message);assertions+=1;}
function ok(value,message){assert.ok(value,message);assertions+=1;}
function no(value,message){assert.ok(!value,message);assertions+=1;}

function commitExplicit(workspace,text){const mentorProfile=deterministicMentorProfile(text);return applyAiWorkspaceEvent(workspace,{type:'command_committed',payload:{command:{agentTask:'general_advice',rawText:text,mentorProfile},taskAction:'none',resolvedView:workspace.activeView,commitView:false,decisionStage:'start'}});}

// FDW-01: legacy state must migrate without losing ordinary workspace data.
const legacy=createAiWorkspace({
  id:'legacy-workspace',
  examContext:{score:578,rank:24567},
  decisionProfile:{explicit:{primaryGoal:'employment_stability',priorities:['employment'],familyResourceSensitivity:'resource_sensitive',studyDurationTolerance:'prefer_short'}},
  decisions:[{id:'old-decision',text:'电气先保留',createdAt:'2026-08-01T00:00:00.000Z'}],
  selectionSnapshot:{version:'legacy-selection',items:[{id:'x1',school:'沈阳工业大学',major:'电气工程及其自动化'}]},
  turnHistory:[{id:'t1',userText:'旧讨论',task:'general_advice'}]
});
eq(legacy.id,'legacy-workspace','workspace id must survive migration');
eq(legacy.examContext.score,578,'score must survive migration');
eq(legacy.selectionSnapshot.items.length,1,'selection must survive migration');
eq(legacy.turnHistory.length,1,'turn history must survive migration');
eq(legacy.decisions[0].status,'pending','legacy text-only decisions migrate fail-safe to pending');
eq(legacy.decisions[0].kind,'note','legacy decision must not become a fabricated typed decision');

// Explicit family signals reuse the canonical semantic owner and persist only explicit language.
let workspace=createAiWorkspace({examContext:{score:578,rank:24567}});
workspace=commitExplicit(workspace,'普通家庭，本科就业优先，不太想考研');
eq(workspace.decisionProfile.explicit.primaryGoal,'undecided','generic employment preference must not fabricate a primary goal unless canonical mentor rules say so');
ok(workspace.decisionProfile.explicit.priorities.includes('employment'),'explicit employment priority should persist');
eq(workspace.decisionProfile.explicit.familyResourceSensitivity,'resource_sensitive','ordinary-family constraint should persist');
eq(workspace.decisionProfile.explicit.studyDurationTolerance,'prefer_short','explicit short study-duration preference should persist');
workspace=commitExplicit(workspace,'不接受倒班');
ok(workspace.decisionProfile.explicit.studentSignals.some(item=>item.dimension==='shift_work'&&item.value==='avoid'),'explicit shift-work rejection should persist');
workspace=commitExplicit(workspace,'编程可以接受');
ok(workspace.decisionProfile.explicit.studentSignals.some(item=>item.dimension==='programming_affinity'&&item.value==='accept'),'explicit programming acceptance should persist');
ok(workspace.decisionProfile.explicit.studentSignals.some(item=>item.dimension==='shift_work'&&item.value==='avoid'),'later explicit signal must not erase unrelated explicit signal');

// Typed decisions require an explicit save event and do not mutate candidate view.
const beforeView=JSON.stringify(workspace.activeView);
workspace=applyAiWorkspaceEvent(workspace,{type:'decision_saved',payload:{kind:'major_direction',status:'keep',subject:{label:'电气工程及其自动化'},reason:'用户明确选择先保留'}});
eq(workspace.decisions[0].kind,'major_direction','typed decision kind must persist');
eq(workspace.decisions[0].status,'keep','typed decision status must persist');
eq(JSON.stringify(workspace.activeView),beforeView,'saving a decision must not mutate candidate view');

// FDW-02: progress is a deterministic projection, not a stored state machine.
let progress=deriveDecisionProgress(workspace);
eq(progress.stages.length,6,'progress must expose exactly six parent-facing stages');
eq(progress.stages[0].key,'score_position','score position is first parent stage');
eq(progress.stages[0].state,'ready','score+rank make position ready');
eq(progress.stages[1].state,'confirmed','explicit kept major confirms major-direction stage');
no(Object.hasOwn(workspace,'decisionProgress'),'workspace must not persist a second decision-progress state');
const progressAgain=deriveDecisionProgress(workspace);
eq(progressAgain,progress,'projection must be deterministic for the same workspace');

// Concrete school-major pair should advance school-major exploration without pretending plan completion.
workspace={...workspace,agentContext:{...workspace.agentContext,semanticFrame:{version:'test',schools:['沈阳工业大学','大连交通大学'],majors:['电气工程及其自动化','自动化'],comparisonPairs:[{school:'沈阳工业大学',major:'电气工程及其自动化',label:'沈阳工业大学 · 电气工程及其自动化'},{school:'大连交通大学',major:'自动化',label:'大连交通大学 · 自动化'}],pairs:[],careerTargets:[],preferenceSignals:[],studentSignals:[],constraints:[],evidenceNeeds:[],currentEvidenceNeeds:[]}}};
progress=deriveDecisionProgress(workspace);
eq(progress.stages.find(item=>item.key==='school_major').state,'exploring','explicit pairs should move school-major stage to exploring');
eq(progress.stages.find(item=>item.key==='plan').state,'not_started','research pairs must not fabricate a plan');

// FDW-03: Decision Book is pure and summarizes workspace state without network/report truth.
const book=buildDecisionBook(workspace);
eq(book.position.summary,'578分 · 约24,567位','book should use deterministic exam context');
ok(book.profile.items.includes('普通家庭 / 预算资源敏感'),'book should expose parent-facing family reality');
ok(book.profile.items.includes('更偏本科就业'),'book should expose study-duration preference');
ok(book.profile.items.includes('不接受倒班'),'book should expose explicit work-environment signal');
ok(book.schoolMajors.items.some(item=>item.school==='沈阳工业大学'),'book should project concrete school-major research');
eq(book.progress.version,progress.version,'book must reuse progress projection');
no(Object.hasOwn(workspace,'decisionBook'),'workspace must not persist a second report truth');

// FDW-04: reflection is bounded and non-mutating.
const reflectionInput=JSON.stringify(workspace);
const reflection=reflectDecisionTurn({workspace,command:{agentTask:'decision_research'},result:{decisionResearch:{ok:true},pendingChecks:[{text:'就业证据还要核实'}]}});
eq(reflection.bounded,true,'reflection must be bounded');
eq(reflection.mutatesWorkspace,false,'reflection must be non-mutating');
eq(reflection.autoExecutesTools,false,'reflection must never start an autonomous tool loop');
ok(reflection.evidenceGaps.includes('就业证据还要核实'),'reflection should surface evidence gaps');
eq(JSON.stringify(workspace),reflectionInput,'reflection must not mutate workspace');

// Hard constraint conflicts must be surfaced rather than silently deleting candidates.
const conflicted=createAiWorkspace({examContext:{score:578,rank:24567},hardConstraints:[{key:'regionExclude',values:['province:辽宁'],label:'排除辽宁'}],activeView:{score:578,regionKeys:['province:辽宁'],majorKeywords:['电气工程及其自动化']}});
const conflictReflection=reflectDecisionTurn({workspace:conflicted,command:{agentTask:'candidate_refinement'},result:{candidates:{ok:true,counts:{total:10}}}});
ok(conflictReflection.conflicts.length>0,'hard/view conflict should be explicit');
eq(conflicted.activeView.regionKeys,['province:辽宁'],'reflection must not repair conflict by mutating the view');

// FDW-05: existing next-action owner yields one primary action and at most two alternatives.
const actions=nextActionsForTurn({task:'decision_research',score:578,result:{decisionReflection:reflection},workspace});
ok(actions.length>=1&&actions.length<=3,'next action count must remain bounded');
eq(actions.filter(item=>item.primary===true).length,1,'exactly one strong primary next action is required');

// Global decision progress must not hijack an explicitly scoped atomic research node.
const localSchoolActions=nextActionsForTurn({task:'school_history',school:'沈阳工业大学',score:580,result:{history:{ok:true,records:[]}},workspace:createAiWorkspace({examContext:{score:580}})});
eq(localSchoolActions.map(item=>item.label),['看哪些专业更有积累','回到学校整体介绍','看校园环境与同学体验'],'school-history followups remain owned by the local research task');
no(localSchoolActions.some(item=>String(item.id||'').startsWith('progress-')),'global progress must not displace local school research');

// A partial non-composite query must repair the current evidence gap before advancing the journey.
const partialActions=nextActionsForTurn({task:'candidate_refinement',score:578,result:{partial:true,candidates:{ok:true,counts:{total:8}}},workspace:createAiWorkspace({examContext:{score:578}})});
eq(partialActions[0]?.id,'retry-failed','partial result must make retry the primary next action');
eq(partialActions[0]?.primary,true,'partial retry must be the one strong CTA');
no(partialActions.some(item=>String(item.id||'').startsWith('progress-')),'partial evidence cannot be skipped by a global progress CTA');

// Current matching rank evidence can advance the pure progress projection before the browser commits it; stale rank evidence cannot.
const matchingRankProgress=deriveDecisionProgress(createAiWorkspace({examContext:{score:600},lastResult:{rank:{ok:true,score:600,rankEnd:14235}}}));
eq(matchingRankProgress.stages[0].state,'ready','matching current rank evidence should satisfy score-position projection');
const staleRankProgress=deriveDecisionProgress(createAiWorkspace({examContext:{score:600},lastResult:{rank:{ok:true,score:599,rankEnd:15000}}}));
eq(staleRankProgress.stages[0].state,'exploring','rank evidence for another score must never be reused');


// topic_started preserves family truth/decisions but clears current topical school/major focus.
const topicSource=createAiWorkspace({...workspace,mainTaskId:'task-current',activeView:{...workspace.activeView,score:578,regionKeys:['province:辽宁'],majorKeywords:['电气工程及其自动化'],schoolNames:['沈阳工业大学']},agentContext:{currentTask:'school_research',focus:{school:'沈阳工业大学',major:'电气工程及其自动化'}}});
const topicNext=applyAiWorkspaceEvent(topicSource,{type:'topic_started',payload:{}});
eq(topicNext.examContext.score,578,'new topic keeps child score');
eq(topicNext.decisionProfile.explicit.studentSignals,topicSource.decisionProfile.explicit.studentSignals,'new topic keeps explicit family signals');
eq(topicNext.decisions,topicSource.decisions,'new topic keeps confirmed decisions');
eq(topicNext.activeView.majorKeywords,[],'new topic clears temporary major focus');
eq(topicNext.activeView.schoolNames,[],'new topic clears temporary school focus');
eq(topicNext.activeView.regionKeys,['all'],'new topic clears temporary region view');
eq(topicNext.activeView.bottomLineMode,'all','new topic clears temporary project-scope view');
eq(topicNext.agentContext.focus.school,'','new topic clears current school focus');
eq(topicNext.mainTaskId,'','new topic starts a fresh task thread inside the same family');

// Server compaction must preserve the new explicit family fields and typed decisions.
const compact=compactAiWorkspaceForServer(workspace,{input:'继续比较'});
ok(compact.decisionProfile.explicit.studentSignals.some(item=>item.dimension==='shift_work'),'server bridge must retain explicit student signals');
ok(compact.decisions.some(item=>item.kind==='major_direction'&&item.status==='keep'),'server bridge must retain typed confirmed decisions');

// FDW-10: the existing selection-review owner audits structure plus explicit family conflicts.
const planItems=[
  {id:'p1',school:'沈阳工业大学',major:'电气工程及其自动化',bandKey:'near',rank2026:24500,displayLocation:'辽宁 · 沈阳',tuition:'5200'},
  {id:'p2',school:'沈阳工业大学',major:'电气工程及其自动化',bandKey:'near',rank2026:24500,displayLocation:'辽宁 · 沈阳',tuition:'5200'},
  {id:'p3',school:'大连交通大学',major:'自动化',bandKey:'steady',rank2026:27000,displayLocation:'辽宁 · 大连',tuition:'5200'}
];
const auditWorkspace=createAiWorkspace({hardConstraints:[{key:'majorExclude',values:['自动化'],label:'明确排除自动化'}],decisions:[{kind:'school_major',status:'reject',subject:{school:'沈阳工业大学',major:'电气工程及其自动化'},reason:'用户明确排除'}]});
const planAudit=runSelectionReview({version:'fdw-test',items:planItems},auditWorkspace);
eq(planAudit.ok,true,'plan review must remain deterministic and usable');
ok(planAudit.findings.some(item=>item.key==='duplicate-school-major'),'plan review must detect duplicate school-major rows');
ok(planAudit.findings.some(item=>item.key==='family-major-exclude-conflict'&&item.blocking===true),'plan review must surface explicit family major conflicts');
ok(planAudit.findings.some(item=>item.key==='rejected-school-major-conflict'&&item.blocking===true),'plan review must surface explicitly rejected school-major conflicts');
ok(planAudit.blockingCount>=2,'blocking plan conflicts must be counted for Decision Progress');
no(String(planAudit.boundary).includes('录取概率'),'plan audit boundary must not claim an admission probability');

// FDW-06/07/08/09 source-level UI contracts.
const html=fs.readFileSync(new URL('../aiplus/index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../aiplus/app.v3990_3.js',import.meta.url),'utf8');
const render=fs.readFileSync(new URL('../aiplus/render.v3992_0.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../aiplus/workspace.v3990_3.css',import.meta.url),'utf8');
ok(html.includes('把孩子的选择一步一步定下来'),'hero must describe the family decision job');
ok(html.includes('id="decisionProgressList"'),'PC/drawer UI must expose decision progress');
ok(html.includes('id="decisionBookContent"'),'Decision Book must be rendered from the canonical workspace');
ok(html.includes('id="mobileDecisionStrip"'),'mobile must expose the same decision state through a compact entry');
ok(html.includes('data-ai-family-decision="aiplus-family-decision-v0.03"'),'FDW capability identity must be visible');
ok(html.includes('fdw=003_0'),'FDW entry assets must carry the cache subtransaction');
ok(html.includes('新建另一份家庭档案'),'UI must distinguish another family profile from a new topic');
no(html.includes('id="probeModel"'),'ordinary parent UI must not expose model probing');
no(html.includes('id="healthBar"'),'ordinary parent UI must not expose healthy-system engineering status');
no(html.includes('读取语义模型配置'),'ordinary parent UI must not expose model configuration language');
no(html.includes('测试语义模型'),'ordinary parent UI must not expose model test controls');
no(app.includes('/api/ai/model-probe'),'browser runtime must not keep a parent-visible model probe call');
ok(app.includes("type:'topic_started'"),'new topic must reuse the same family workspace');
ok(app.includes('startNewFamilyProfile'),'separate-family creation must remain explicit');
no(app.includes("scoreValue=els.starterScore?.value||workspace?.examContext?.score"),'DOM starter input must never own the default score for a new family profile');
ok(app.includes("sourceValue=explicitInput?scoreValue:workspace?.examContext?.score"),'starter default score must come from the canonical workspace unless the user explicitly applies an input');
ok(app.includes("else if(!explicitInput)els.starterScore.value=''"),'a new scoreless family profile must clear any stale score input from the previous family');
ok(render.includes('next-primary'),'renderer must distinguish the primary next action');
ok(render.includes('next-alternative'),'renderer must weaken alternatives rather than render three equal CTAs');
ok(css.includes('@media(max-width:1100px)'),'1024px Pad must use the shared decision drawer contract');
ok(css.includes('@media(max-width:719px)'),'mobile disclosure must be explicit');
no(css.includes('scrollIntoView'),'workbench UI must not introduce a second scroll owner');

console.log(`AIPLuS family decision workbench verifier passed: ${assertions} assertions.`);
