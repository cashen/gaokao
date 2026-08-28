import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const root=process.cwd();
const bundle=await import(pathToFileURL(path.join(root,'shared/ai/aiplus-feedback-bundle.v004.js')).href);
const workspace={
  contractVersion:'ai-workspace-contract-v3992_1',id:'workspace:feedback-test',version:8,decisionStage:'compare',
  examContext:{score:578,rank:21420},decisionProfile:{explicit:{primaryGoal:'employment_stability',priorities:['employment'],familyResourceSensitivity:'resource_sensitive',studyDurationTolerance:'prefer_short',careerTargets:[],studentSignals:[]}},
  hardConstraints:[],softPreferences:[],decisions:[],selectionSnapshot:null,lastResult:null,
  agentContext:{currentTask:'decision_research',focus:{school:'沈阳工业大学',major:'电气工程及其自动化'},semanticFrame:{majors:['电气工程及其自动化','自动化'],comparisonPairs:[{school:'沈阳工业大学',major:'电气工程及其自动化'}]}},
  turnHistory:[{task:'decision_research',userText:'PRIVACY_SENTINEL 家庭私密问题',assistantSummary:'PRIVATE_ANSWER_SENTINEL 家庭私密回答'}]
};
const events=Array.from({length:20},(_,index)=>({at:`2026-08-17T00:${String(index).padStart(2,'0')}:00Z`,kind:'diagnostic',code:`e${index}`,message:`event ${index}`,task:'decision_research',stage:'compare'}));
const base=bundle.buildAiplusFeedbackBundle({workspace,viewport:{device:'mobile',width:390,height:844,coarse:true,touchPoints:5},release:{site:'v3.9.90.2',runtime:'v3990_2',familyDecision:'aiplus-family-decision-v0.03'},events,createdAt:'2026-08-17T00:30:00Z'});
const baseText=JSON.stringify(base);
assert.equal(base.bundleVersion,'aiplus-feedback-bundle-v0.04');
assert.ok(!baseText.includes('PRIVACY_SENTINEL'),'default bundle leaked current question');
assert.ok(!baseText.includes('PRIVATE_ANSWER_SENTINEL'),'default bundle leaked current answer');
assert.equal(base.problemNote,'');
assert.equal(base.recentEvents.length,12,'feedback bundle must keep only twelve recent diagnostics');
assert.equal(base.progress.version,'ai-decision-progress-v0.03','feedback must reuse #166 canonical Decision Progress');
assert.equal(base.progress.nextKey,'major_direction');
assert.equal(base.viewport.device,'mobile');
assert.equal(base.workspace.task,'decision_research');
const withNote=bundle.buildAiplusFeedbackBundle({workspace,problemNote:'页面在手机上突然跳了一下',events,createdAt:'2026-08-17T00:30:00Z'});
assert.equal(withNote.problemNote,'页面在手机上突然跳了一下');
const opted=bundle.buildAiplusFeedbackBundle({workspace,problemNote:'页面在手机上突然跳了一下',includeCurrentTurn:true,events,createdAt:'2026-08-17T00:30:00Z'});
assert.ok(opted.currentTurn.question.includes('PRIVACY_SENTINEL'));
assert.ok(opted.currentTurn.answer.includes('PRIVATE_ANSWER_SENTINEL'));
assert.equal(opted.problemNote,'页面在手机上突然跳了一下');

const log=fs.readFileSync(path.join(root,'aiplus/feedback-log.v004.js'),'utf8'),ui=fs.readFileSync(path.join(root,'aiplus/feedback-log-ui.v004.js'),'utf8'),html=fs.readFileSync(path.join(root,'aiplus/index.html'),'utf8');
for(const source of [log,ui]){assert.ok(!source.includes('/api/ai/turn'),'feedback must not become a turn owner');assert.ok(!source.includes('api.github.com'),'feedback must not call GitHub');assert.ok(!source.includes('fetch('),'feedback must not upload remotely');assert.ok(!source.includes('MutationObserver'),'feedback must not add observer ownership');assert.ok(!source.includes('setInterval('),'feedback must not poll');}
assert.ok(log.includes('MAX_EVENTS=40'),'local diagnostic storage must stay bounded');
assert.ok(ui.includes('problemNote:note'),'copy path must pass the explicit problem note as a first-class bundle field');
assert.ok(html.includes('data-ai-feedback-log="aiplus-feedback-log-v0.04"'));
assert.ok(html.includes('id="feedbackLogToggle"'));
assert.ok(html.includes('id="feedbackLogIncludeTurn"'));
assert.ok(html.includes('id="feedbackLogCopy" class="primary" type="button"'));
assert.ok(html.includes('默认不上传，也不附带完整家庭对话'));
assert.ok(!fs.existsSync(path.join(root,'shared/ai/aiplus-decision-workspace.v004.js')),'#168 must not restore a second Decision Progress owner');
assert.ok(!fs.existsSync(path.join(root,'aiplus/decision-workspace-ui.v004.js')),'#168 must not restore a second Decision UI owner');
console.log('AIPLuS feedback Log v0.04 verifier: PASS');
