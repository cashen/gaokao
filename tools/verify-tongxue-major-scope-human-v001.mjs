import fs from 'node:fs';
import assert from 'node:assert/strict';
import { STUDENT_VOICE_NAVIGATION_META, STUDENT_VOICE_NAVIGATION_VERSION, buildStudentVoiceMajorHref, readStudentVoiceMajorContext } from '../shared/resources/experience/student-voice-navigation.v001.js';
import { summarizeDecisionContext } from '../shared/decision-context/decision-context.v001.js';

const read = file => fs.readFileSync(file, 'utf8');
const href = buildStudentVoiceMajorHref({
  majorCode:'080902', canonicalName:'软件工程', sourceSurface:'ln-rank-major',
  returnTo:'/ln-rank/?mode=major-all#majorAllResultsPanel', decisionContext:{
    sourceSurface:'ln-rank', sourceAction:'view_student_voice', resultMode:'major-all',
    majorCode:'080902', major:'软件工程', returnTo:'/ln-rank/?mode=major-all#majorAllResultsPanel'
  }
});
const parsed = readStudentVoiceMajorContext(new URL(href, 'https://gaokao.powers.org.cn'));
const oversizedContext = {
  sourceSurface:'ln-rank', sourceAction:'view_student_voice', resultMode:'school-all',
  majorCode:'080902', major:'软件工程', returnTo:`/ln-rank/?x=${'x'.repeat(800)}`,
  candidateIds:Array(8).fill('candidate-abcdefghijklmnopqrstu'),
  pendingQuestions:Array(8).fill('请继续核对这个专业的课程、城市和就业方向是否适合我')
};
const partialHref = buildStudentVoiceMajorHref({
  majorCode:'080902', canonicalName:'软件工程', sourceSurface:'ln-rank-major',
  returnTo:oversizedContext.returnTo, decisionContext:oversizedContext
});
const partialParsed = readStudentVoiceMajorContext(new URL(partialHref, 'https://gaokao.powers.org.cn'));
assert.equal(STUDENT_VOICE_NAVIGATION_VERSION, 'student-voice-navigation-v0.02');
assert.ok(STUDENT_VOICE_NAVIGATION_META.contextStates.includes('partial'));
assert.equal(parsed.sourceSurface, 'ln-rank-major');
assert.equal(parsed.contextState, 'available');
assert.equal(partialParsed.contextState, 'partial');
assert.equal(partialParsed.decisionContext, null);
assert.equal(summarizeDecisionContext({sourceSurface:'ln-rank', sourceAction:'view_student_voice', resultMode:'school-all', school:'辽宁大学', schoolCode:'s1', returnTo:'/ln-rank/'}, {surface:'tongxue'}).note, '同学你好：这里看的是学生对整所学校的个人体验');

const page = read('tongxue/index.html');
const controller = read('tongxue/app/tongxue-runtime-controller-v159.js');
const result = read('tongxue/app/tongxue-runtime-result-view-v159.js');
const voice = read('major-path/student-voice.v001.js');
const handoff = read('ln-rank/js/workspace/major-path-handoff.v003.js');
const majorAll = read('ln-rank/js/feature/major-all/major-all-mode.v001.js');
const release = read('shared/resources/release/current-release.js');
assert.match(page, /学生谈这所学校/);
assert.match(page, /跨校同专业留言/);
assert.match(page, /r051-major-scope-clarity/);
assert.match(controller, /contextState/);
assert.match(controller, /sourceSurface/);
assert.match(controller, /查看跨校专业留言/);
assert.match(result, /部分筛选条件没有随链接带入/);
assert.match(result, /跨校同专业留言/);
assert.match(result, /data-retry-major/);
assert.match(voice, /不同学校的学生怎么说/);
assert.match(voice, /查看跨校同专业留言/);
assert.match(handoff, /major-path-navigation\.v004/);
assert.match(handoff, /跨校学生留言/);
assert.match(majorAll, /学生谈这所学校/);
assert.match(release, /r051-major-scope-clarity/);
assert.match(read('docs/plans/tongxue-major-scope-human-journey-v001.md'), /school × major/);

console.log(JSON.stringify({
  ok:true,
  version:'tongxue-major-scope-human-v001',
  navigation:'source-surface-and-partial-context',
  scopeLabels:['学生谈这所学校','跨校同专业留言'],
  majorRetry:true,
  majorAllSchoolEntry:true
}, null, 2));
