import assert from 'node:assert/strict';
import { selectStudentVoiceEvidence } from '../shared/resources/experience/student-voice-evidence-selector.v001.js';

const reviews = [
  { content:'大二开始专业实验课比较多，老师要求严格，但是考研氛围不错。', createdAt:'2026-01-01' },
  { content:'宿舍环境一般，但是食堂选择比较多。', createdAt:'2026-02-01' },
  { content:'就业方向比较明确，实习机会需要自己主动寻找。', createdAt:'2026-03-01' },
  { content:'挺好的。', createdAt:'2025-01-01' }
];

const evidence = selectStudentVoiceEvidence(reviews, 5);

assert.ok(evidence.length >= 3);
assert.ok(evidence.some((item) => item.category === 'course'));
assert.ok(evidence.some((item) => item.category === 'campus_life'));
assert.ok(evidence.some((item) => item.category === 'employment'));
assert.ok(evidence.every((item) => item.reason));

console.log('student voice evidence layer v002 passed');
