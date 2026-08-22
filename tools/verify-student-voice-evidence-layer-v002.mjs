import assert from 'node:assert/strict';
import {
  STUDENT_VOICE_EVIDENCE_SELECTOR_VERSION,
  selectStudentVoiceEvidence
} from '../shared/resources/experience/student-voice-evidence-selector.v001.js';

assert.equal(STUDENT_VOICE_EVIDENCE_SELECTOR_VERSION, 'student-voice-evidence-selector-v0.02.2');

const reviews = [
  { id:1, content:'大二开始专业实验课比较多，课程设计和项目很多，老师要求严格。', createdAt:'2026-01-01', authorLabel:'甲同学', sourceUrl:'https://example.test/review/1', evidenceScope:'school', schoolSourceId:27032 },
  { id:2, content:'宿舍环境一般，但是食堂选择比较多，生活上还算方便。', createdAt:'2026-02-01', authorLabel:'乙同学', sourceUrl:'https://example.test/review/2', evidenceScope:'school', schoolSourceId:27032 },
  { id:3, content:'就业方向比较明确，实习机会需要自己主动寻找，校招岗位也要提前准备。', createdAt:'2026-03-01', authorLabel:'丙同学', likes:12, replies:2, sourceUrl:'https://example.test/review/3', evidenceScope:'school', schoolSourceId:27032 },
  { id:4, content:'考研氛围不错，图书馆里准备读研的人不少，老师也会给一些方向建议。', createdAt:'2026-04-01', authorLabel:'丁同学', sourceUrl:'https://example.test/review/4', evidenceScope:'school', schoolSourceId:27032 },
  { id:5, content:'专业课课多作业也多，大三那段时间学习强度比较明显。', createdAt:'2026-05-01', authorLabel:'戊同学', sourceUrl:'https://example.test/review/5', evidenceScope:'school', schoolSourceId:27032 },
  { id:6, content:'专业课课多作业也多，大三那段时间学习强度比较明显。', createdAt:'2026-05-02', authorLabel:'重复同学', sourceUrl:'https://example.test/review/6', evidenceScope:'school', schoolSourceId:27032 },
  { id:7, content:'挺好的。', createdAt:'2026-06-01' }
];

const evidence = selectStudentVoiceEvidence(reviews, 5);

assert.equal(evidence.length, 5);
assert.equal(new Set(evidence.map((item) => item.content)).size, evidence.length, 'evidence must be deduplicated');
assert.ok(evidence.some((item) => item.category === 'workload'));
assert.ok(evidence.some((item) => item.category === 'campus_life'));
assert.ok(evidence.some((item) => item.category === 'employment'));
assert.ok(evidence.some((item) => item.category === 'postgraduate'));
assert.ok(evidence.every((item) => item.reason && item.categoryLabel));
assert.ok(evidence.every((item) => item.evidenceScope === 'school'));
assert.ok(evidence.every((item) => item.schoolSourceId === 27032));
assert.ok(evidence.every((item) => item.sourceUrl), 'source provenance must survive selection');
assert.ok(!evidence.some((item) => item.content === '挺好的。'), 'low-value feedback must be excluded');
assert.ok(evidence.find((item) => item.id === 3)?.likes === 12, 'social/source fields must be preserved');
assert.deepEqual(selectStudentVoiceEvidence(reviews, 0), []);
assert.deepEqual(selectStudentVoiceEvidence(null, 5), []);

console.log(JSON.stringify({
  ok:true,
  version:STUDENT_VOICE_EVIDENCE_SELECTOR_VERSION,
  selected:evidence.map(({ id, category, categoryLabel }) => ({ id, category, categoryLabel }))
}, null, 2));
