import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  STUDENT_VOICE_NAVIGATION_META,
  buildStudentVoiceMajorHref,
  readStudentVoiceMajorContext
} from '../shared/resources/experience/student-voice-navigation.v001.js';

const href=buildStudentVoiceMajorHref({
  majorCode:'080601',
  canonicalName:'电气工程及其自动化',
  sourceKey:'record-080601',
  context:'score',
  returnTo:'/ln-rank/?candidateScore=580#results'
});
assert.match(href,/^\/tongxue\/\?/);
const target=new URL(href,'https://example.test');
assert.equal(target.searchParams.get('scope'),'major');
assert.equal(target.searchParams.get('majorCode'),'080601');
assert.equal(target.searchParams.get('major'),'电气工程及其自动化');
assert.equal(target.searchParams.get('context'),'score');
assert.equal(target.searchParams.get('sourceKey'),'record-080601');
assert.equal(target.searchParams.get('returnTo'),'/ln-rank/?candidateScore=580#results');
assert.equal(target.searchParams.has('school'),false,'cross-school major voice navigation must not pretend to carry a school binding');
assert.equal(STUDENT_VOICE_NAVIGATION_META.scope,'major');
assert.equal(STUDENT_VOICE_NAVIGATION_META.targetPath,'/tongxue/');
assert.equal(buildStudentVoiceMajorHref({majorCode:'',canonicalName:'电气工程及其自动化'}),'');
assert.equal(buildStudentVoiceMajorHref({majorCode:'080601',canonicalName:''}),'');
const external=buildStudentVoiceMajorHref({majorCode:'080601',canonicalName:'电气工程及其自动化',returnTo:'https://evil.example/path'});
assert.equal(new URL(external,'https://example.test').searchParams.has('returnTo'),false,'returnTo must remain same-origin only');
const parsed=readStudentVoiceMajorContext({href:`https://example.test${href}`});
assert.equal(parsed.scope,'major');
assert.equal(parsed.majorCode,'080601');
assert.equal(parsed.major,'电气工程及其自动化');
assert.equal(parsed.returnTo,'/ln-rank/?candidateScore=580#results');

const read=path=>fs.readFileSync(path,'utf8');
const lnHandoff=read('ln-rank/js/workspace/major-path-handoff.v003.js');
const majorVoice=read('major-path/student-voice.v001.js');
const majorApp=read('major-path/app.v004.js');
const tongxueController=read('tongxue/app/tongxue-runtime-controller-v159.js');
const tongxueResult=read('tongxue/app/tongxue-runtime-result-view-v159.js');

assert.match(lnHandoff,/concreteMajorFromRendered/,'ln-rank must reuse its concrete-major gate');
assert.match(lnHandoff,/studentVoiceAvailability\s*=\s*'unresolved-or-class-level'/,'class/trial/unresolved labels must fail closed before Student Voice navigation');
assert.match(lnHandoff,/canonical-major-cross-school/,'resolved admissions majors must state cross-school scope');
assert.match(lnHandoff,/buildStudentVoiceMajorHref/);
assert.doesNotMatch(lnHandoff,/studentVoiceAvailability\s*=\s*'school_major'/,'ln-rank must not invent school-major Student Voice evidence');

assert.match(majorVoice,/evidenceScope:'major'/);
assert.match(majorVoice,/rankingInput:false/);
assert.match(majorVoice,/不同学校学生/);
assert.match(majorVoice,/不代表.*培养情况/);
assert.match(majorApp,/mountMajorPathStudentVoice/,'major-path must mount the additive Student Voice section from its human presentation owner');
assert.match(majorApp,/studentVoiceVersion:/);

assert.match(tongxueController,/performMajorExperienceQuery/);
assert.match(tongxueController,/scope:'major'/);
assert.match(tongxueController,/majorCode/);
assert.match(tongxueController,/state\.returnTo\s*=\s*safeReturnTo/,'Tongxue major direct mode must preserve only a safe return target');
assert.match(tongxueController,/document\.body\.dataset\.studentVoiceScope\s*=\s*'major'/);
assert.match(tongxueResult,/data-student-voice-scope="major"/);
assert.match(tongxueResult,/不能代表某一所学校的培养情况/);
assert.match(tongxueResult,/不是就业率、薪资或专业强弱的官方结论/);
assert.match(tongxueResult,/不参与推荐/);

console.log('Student Voice navigation v0.01 verified: concrete-major gate, major-only cross-page scope, safe return target, additive major-path/Tongxue presentation, no school-major fabrication.');
