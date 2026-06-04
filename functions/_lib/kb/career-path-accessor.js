import { CAREER_PATH_MEDICAL_KB } from './career-path-medical-kb.generated.js';
import { CAREER_PATH_LAW_KB } from './career-path-law-kb.generated.js';
import { CAREER_PATH_TEACHER_KB } from './career-path-teacher-kb.generated.js';
import { PHYSICAL_EXAM_KB } from './physical-exam-kb.generated.js';

export function buildCareerPathReviewPoints(text = '') {
  const s = String(text || '');
  const out = [];
  if (/临床|口腔|中医|中西医/.test(s) && !/护理|药学|检验|影像技术|康复/.test(s)) out.push(CAREER_PATH_MEDICAL_KB?.medicalCore?.aiCopy || '医学核心方向培养周期较长，需要核验规培、执业资格和家庭承受能力。');
  if (/法学/.test(s)) out.push(CAREER_PATH_LAW_KB?.law?.aiCopy || '法学要关注法考、院校平台、城市实习资源和考公竞争。');
  if (/师范|教育/.test(s)) out.push(CAREER_PATH_TEACHER_KB?.teacher?.aiCopy || '师范方向要关注教师资格、编制机会、地区需求和是否接受异地就业。');
  if (/医学|药学|生物|食品|农学|园艺|动物医学|交通运输|油气储运/.test(s)) out.push(PHYSICAL_EXAM_KB?.colorWeakness?.aiCopy || '如孩子存在色弱、色盲等体检限制，相关专业需要重点核验招生章程和体检指导意见。');
  return [...new Set(out.filter(Boolean))];
}
