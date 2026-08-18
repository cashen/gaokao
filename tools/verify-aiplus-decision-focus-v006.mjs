import assert from 'node:assert/strict';
import {createAiWorkspace,applyAiWorkspaceEvent} from '../shared/ai/ai-workspace-contract.v3992_0.js';
import {createEvidenceClaim} from '../functions/_lib/ai/claim-evidence.js';
import {AI_DECISION_FOCUS_VERSION,deriveDecisionFocus,decisionFocusGapAction} from '../shared/ai/decision-focus.v006_1.js';
import {deriveDecisionProgress} from '../shared/ai/decision-progress.v003.js';
import {buildDecisionBook} from '../shared/ai/decision-book.v003.js';
import {nextActionsForTurn} from '../functions/_lib/ai/next-action-engine.js';

let assertions=0;
function eq(actual,expected,message){assert.deepEqual(actual,expected,message);assertions+=1;}
function ok(value,message){assert.ok(value,message);assertions+=1;}
function no(value,message){assert.ok(!value,message);assertions+=1;}

const pairA={school:'沈阳工业大学',major:'电气工程及其自动化',label:'沈阳工业大学 · 电气工程及其自动化'};
const pairB={school:'大连交通大学',major:'自动化',label:'大连交通大学 · 自动化'};
const employmentA=createEvidenceClaim({subject:pairA.label,subjectType:'school_major',subjectId:`${pairA.school}|${pairA.major}`,dimension:'employment',value:'2025届电气工程及其自动化专业毕业去向由学院按当年口径发布。',year:2025,sourceScope:'school_major',source:{sourceName:'沈阳工业大学学院就业材料',sourceUrl:'https://example.edu.cn/sut-employment-2025'}});
const employmentB=createEvidenceClaim({subject:pairB.school,subjectType:'school',subjectId:pairB.school,dimension:'employment',value:'2025届学校毕业生就业工作按学校就业质量报告口径发布。',year:2025,sourceScope:'school',source:{sourceName:'大连交通大学就业质量报告',sourceUrl:'https://example.edu.cn/djtu-employment-2025'}});
ok(employmentA?.claimId&&employmentB?.claimId,'test claims must satisfy typed provenance contract');

function baseWorkspace({studyDurationTolerance='unspecified',majorExclude=false}={}){
  return createAiWorkspace({
    examContext:{score:578,rank:25000},
    decisionProfile:{explicit:{priorities:['employment','cost'],familyResourceSensitivity:'resource_sensitive',studyDurationTolerance}},
    hardConstraints:majorExclude?[{key:'majorExclude',values:['自动化'],label:'家庭明确不接受专业'}]:[],
    agentContext:{currentTask:'decision_research',semanticFrame:{version:'decision-focus-test',schools:[pairA.school,pairB.school],majors:[pairA.major,pairB.major],pairs:[pairA,pairB],comparisonPairs:[pairA,pairB],evidenceNeeds:['employment','postgraduate','cost'],currentEvidenceNeeds:['employment','postgraduate'],compositeDecision:true}},
    selectionSnapshot:{version:'test-selection',items:[
      {id:'a',...pairA,score2026:575,rank2026:26000,tuition:'5200元/年'},
      {id:'b',...pairB,score2026:572,rank2026:27500,projectLabel:'普通项目'}
    ]},
    tasks:[{id:'research',kind:'main',status:'complete',result:{decisionResearch:{claims:[employmentA,employmentB]}}}]
  });
}

let workspace=baseWorkspace();
let focus=deriveDecisionFocus(workspace);
eq(focus.version,AI_DECISION_FOCUS_VERSION,'focus capability version');
eq(focus.pairs.length,2,'two explicit school-major pairs stay aligned');
const focusA=focus.pairs.find(item=>item.school===pairA.school),focusB=focus.pairs.find(item=>item.school===pairB.school);
eq(focusA.dimensions.find(item=>item.key==='admissions').state,'verified','exact 2026 selection record satisfies admissions evidence');
eq(focusA.dimensions.find(item=>item.key==='employment').state,'verified','school-major employment claim stays direct');
eq(focusA.dimensions.find(item=>item.key==='employment').scope,'school_major','direct claim scope is retained');
eq(focusB.dimensions.find(item=>item.key==='employment').state,'reference','school-wide evidence is reference only for a school-major decision');
eq(focusB.dimensions.find(item=>item.key==='employment').scope,'school','school-wide evidence is never narrowed into school-major scope');
no(focusB.dimensions.find(item=>item.key==='employment').claimIds.includes(employmentA.claimId),'another pair claim must not leak across subjects');

// Same-school overlapping major names must not share school-major evidence through substring matching.
const pairOverlap={school:'沈阳工业大学',major:'自动化',label:'沈阳工业大学 · 自动化'};
const overlapWorkspace=createAiWorkspace({
  decisionProfile:{explicit:{priorities:['employment'],studyDurationTolerance:'prefer_short'}},
  agentContext:{semanticFrame:{version:'overlap-major-test',schools:[pairA.school],majors:[pairA.major,pairOverlap.major],pairs:[pairA,pairOverlap],comparisonPairs:[pairA,pairOverlap],currentEvidenceNeeds:['employment']}},
  tasks:[{id:'overlap',result:{decisionResearch:{claims:[employmentA]}}}]
});
const overlapFocus=deriveDecisionFocus(overlapWorkspace),overlapLong=overlapFocus.pairs.find(item=>item.major===pairA.major),overlapShort=overlapFocus.pairs.find(item=>item.major===pairOverlap.major);
eq(overlapLong.dimensions.find(item=>item.key==='employment').state,'verified','exact long-major claim remains direct for its own pair');
eq(overlapShort.dimensions.find(item=>item.key==='employment').state,'missing','short overlapping major must not inherit the long-major claim');
no(overlapShort.dimensions.find(item=>item.key==='employment').claimIds.includes(employmentA.claimId),'overlapping major name cannot reuse another pair claim ID');
eq(overlapFocus.primaryGap.pairLabel,pairOverlap.label,'the unresolved overlapping pair remains visible as the next evidence gap');

eq(focus.primaryGap.dimension,'study_duration','when postgraduate is part of the question, an unspecified study-duration tradeoff is the highest decision-changing gap');
ok(focus.primaryGap.prompt.includes('是否愿意读研')||focus.primaryGap.prompt.includes('愿意读研'),'primary gap must ask the parent for the actual tradeoff rather than invent it');
no(Object.hasOwn(workspace,'decisionFocus'),'decision focus must remain a projection, never a persisted second state machine');

workspace=baseWorkspace({studyDurationTolerance:'prefer_short'});
focus=deriveDecisionFocus(workspace);
eq(focus.primaryGap.dimension,'employment','once study duration is explicit, school-level employment evidence remains insufficient for the priority school-major comparison');
eq(focus.primaryGap.pairLabel,pairB.label,'the unresolved pair is surfaced rather than hiding behind pair A direct evidence');
ok(focus.primaryGap.reason.includes('学校级参考'),'scope-limited evidence must explain why more direct evidence is still needed');
const action=decisionFocusGapAction(focus);
eq(action.label,focus.primaryGap.label,'next-action adapter reuses the projection instead of re-guessing the gap');

// A remembered score is context, not execution evidence. A fully answered current need must not manufacture another historical-context gap.
const noAdmission=createAiWorkspace({examContext:{score:578,rank:25000},decisionProfile:{explicit:{priorities:['employment'],studyDurationTolerance:'prefer_short'}},agentContext:{semanticFrame:{version:'no-admission',pairs:[pairA],comparisonPairs:[pairA],schools:[pairA.school],majors:[pairA.major],currentEvidenceNeeds:['employment']}},tasks:[{id:'r',result:{decisionResearch:{claims:[employmentA]}}}]});
const noAdmissionFocus=deriveDecisionFocus(noAdmission);
eq(noAdmissionFocus.pairs[0].dimensions.find(item=>item.key==='admissions').state,'missing','remembered score alone cannot fabricate school-major admissions evidence');
eq(noAdmissionFocus.currentEvidenceNeeds,['employment'],'the current turn keeps authority over the focus gap set');
eq(noAdmissionFocus.primaryGap,null,'once the current employment need is directly answered, historical admissions/postgraduate context must not invent a new primary gap');

// A previously confirmed family tradeoff must reopen when a new decision-changing blocker appears.
let confirmedTradeoffWorkspace=baseWorkspace();
confirmedTradeoffWorkspace=applyAiWorkspaceEvent(confirmedTradeoffWorkspace,{type:'decision_saved',payload:{kind:'family_tradeoff',status:'keep',subject:{label:'家庭取舍'},reason:'家庭已经确认过上一轮取舍'}});
const confirmedTradeoffProgress=deriveDecisionProgress(confirmedTradeoffWorkspace),confirmedTradeoffStage=confirmedTradeoffProgress.stages.find(item=>item.key==='family_tradeoff');
ok(confirmedTradeoffStage.blockers.some(item=>item.dimension==='study_duration'),'new study-duration blocker remains visible after an earlier family-tradeoff confirmation');
eq(confirmedTradeoffStage.state,'exploring','a new decision-changing blocker must reopen a previously confirmed family-tradeoff stage');

// Hard family conflicts outrank research, but the projection never removes the option itself.
workspace=baseWorkspace({studyDurationTolerance:'prefer_short',majorExclude:true});
focus=deriveDecisionFocus(workspace);
eq(focus.primaryGap.type,'conflict','explicit family conflict outranks ordinary evidence gaps');
eq(focus.primaryGap.pairLabel,pairB.label,'the conflicting pair is named');
eq(focus.pairs.length,2,'focus projection reports conflict without mutating/removing a pair');
const progress=deriveDecisionProgress(workspace),schoolMajor=progress.stages.find(item=>item.key==='school_major'),plan=progress.stages.find(item=>item.key==='plan');
eq(schoolMajor.state,'exploring','school-major stage cannot look completed while a hard conflict remains');
ok(schoolMajor.blockers.some(item=>item.type==='conflict'),'progress exposes the actual blocker');
eq(plan.state,'exploring','an imported plan with a hard family conflict is not marked ready');

const book=buildDecisionBook(workspace);
eq(book.focus.version,AI_DECISION_FOCUS_VERSION,'Decision Book consumes the same focus projection');
ok(book.schoolMajors.items.some(item=>item.label.includes('本科就业证据学校级参考')),'existing Decision Book surface exposes pair-level evidence scope in parent language');
ok(book.unresolved.items[0].includes('家庭条件冲突')||book.unresolved.items[0].includes('先处理'),'Decision Book puts the highest decision-changing gap before generic pending notes');

// Existing task ownership remains stronger than global journey guidance.
const decisionActions=nextActionsForTurn({task:'decision_research',score:578,result:{decisionResearch:{frame:workspace.agentContext.semanticFrame,claims:[employmentA,employmentB]}},workspace});
eq(decisionActions[0].id.startsWith('decision-gap:'),true,'composite decision receives the decision-changing gap as primary CTA');
const localActions=nextActionsForTurn({task:'school_history',school:'沈阳工业大学',score:578,result:{history:{ok:true,records:[]}},workspace});
no(localActions.some(item=>item.id.startsWith('decision-gap:')),'atomic school research remains owned by its local follow-ups');
const retryActions=nextActionsForTurn({task:'candidate_refinement',score:578,result:{partial:true,candidates:{ok:true,counts:{total:8}}},workspace});
eq(retryActions[0].id,'retry-failed','partial deterministic execution still gets retry priority over global decision guidance');

// Explicit decisions reuse the canonical decision_saved event and never mutate candidate view.
const beforeView=JSON.stringify(workspace.activeView);
workspace=applyAiWorkspaceEvent(workspace,{type:'decision_saved',payload:{kind:'school_major',status:'pending',subject:{school:pairA.school,major:pairA.major,label:pairA.label},reason:'家长明确选择还要核实'}});
eq(workspace.decisions[0].status,'pending','existing decision owner stores the parent decision state');
eq(JSON.stringify(workspace.activeView),beforeView,'saving a decision does not mutate candidate filters');
focus=deriveDecisionFocus(workspace);
eq(focus.pairs.find(item=>item.school===pairA.school).dimensions.find(item=>item.key==='family_decision').state,'pending','focus reads, but does not own, the saved family decision');

// Bounded combinatorial projection: no cartesian invention, no scoring model, deterministic result.
let generated=0;
for(const priority of [['employment'],['cost'],['employment','cost']])for(const study of ['unspecified','prefer_short','long_ok']){
  const sample=createAiWorkspace({examContext:{score:578},decisionProfile:{explicit:{priorities:priority,studyDurationTolerance:study}},agentContext:{semanticFrame:{version:'matrix',comparisonPairs:[pairA,pairB],pairs:[pairA,pairB],schools:[pairA.school,pairB.school],majors:[pairA.major,pairB.major],currentEvidenceNeeds:priority}},selectionSnapshot:{items:[{...pairA,score2026:575},{...pairB,score2026:572}]}});
  const one=deriveDecisionFocus(sample),two=deriveDecisionFocus(sample);eq(one,two,'same workspace produces the same projection');eq(one.pairs.length,2,'projection preserves explicit pair geometry');ok(one.gaps.length<=12,'decision gaps remain bounded');generated+=1;
}

console.log(JSON.stringify({ok:true,version:AI_DECISION_FOCUS_VERSION,assertions,generatedCases:generated,boundary:focus.boundary},null,2));
