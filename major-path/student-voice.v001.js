import {
  STUDENT_VOICE_NAVIGATION_VERSION,
  buildStudentVoiceMajorHref
} from '../shared/resources/experience/student-voice-navigation.v001.js';
import { captureCurrentReturnSnapshot } from '../shared/decision-context/return-snapshot.v001.js';

export const MAJOR_PATH_STUDENT_VOICE_VERSION = 'major-path-student-voice-v0.01';

function pageReturnTarget() {
  const url = new URL(location.href);
  if (!url.hash) url.hash = 'result';
  return `${url.pathname}${url.search}${url.hash}`;
}

function node(tag, className = '', text = '') {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text) el.textContent = text;
  return el;
}

export function mountMajorPathStudentVoice({ shell, major, anchor, sourceContext = {} } = {}) {
  if (!(shell instanceof Element) || !major?.code || !major?.name || !(anchor instanceof Element)) return null;
  const existing = shell.querySelector('[data-major-student-voice]');
  if (existing) return existing;
  const href = buildStudentVoiceMajorHref({
    majorCode:major.code,
    canonicalName:major.name,
    context: sourceContext.context || 'score',
    sourceKey: sourceContext.sourceKey || '',
    school: sourceContext.school || '',
    returnTo:pageReturnTarget(),
    decisionContext: sourceContext.decisionContext || null
  });
  if (!href) return null;

  const section = node('section', 'major-background-context major-student-voice-context');
  section.dataset.majorStudentVoice = major.code;
  const heading = node('div', 'major-background-heading');
  heading.append(node('p', 'eyebrow', '再听听真正读过的人'));
  heading.append(node('h3', '', `大学生实际读“${major.name}”时在说什么？`));
  heading.append(node('p', '', sourceContext.school
    ? `下面是不同学校学生围绕这个专业的公开体验，不代表${sourceContext.school}的培养情况。`
    : '下面是不同学校学生围绕这个专业的公开体验，用来补充“学起来是什么感觉”，不替代国家目录和学校培养方案。'));
  section.append(heading);

  const actions = node('div', 'major-background-actions');
  const link = node('a', 'major-background-link', '看大学生怎么说 →');
  link.href = href;
  link.dataset.studentVoiceMajorLink = major.code;
  link.addEventListener('click', () => {
    const contextId = sourceContext.decisionContext?.contextId;
    if (!contextId) return;
    captureCurrentReturnSnapshot({
      contextId,
      returnTo: pageReturnTarget(),
      sourceSurface: sourceContext.decisionContext?.sourceSurface || 'major-path',
      resultMode: sourceContext.decisionContext?.resultMode || '',
      anchorId: 'result',
      focusId: 'result'
    });
  }, { passive: true });
  link.title = '跨学校专业体验，不是就业率、薪资统计或专业强弱结论。';
  actions.append(link);
  section.append(actions);

  const boundary = node('p', 'major-background-boundary', '学生声音只代表个人经历；样本少时逐条看，意见不一致时保留分歧，不参与录取排序或推荐分。');
  section.append(boundary);
  anchor.insertAdjacentElement('afterend', section);
  return section;
}

export const MAJOR_PATH_STUDENT_VOICE_META = Object.freeze({
  version:MAJOR_PATH_STUDENT_VOICE_VERSION,
  navigationVersion:STUDENT_VOICE_NAVIGATION_VERSION,
  evidenceScope:'major',
  rankingInput:false
});
