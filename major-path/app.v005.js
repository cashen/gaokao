import { MAJOR_CATALOG_2026 } from '../ln-rank/kb/major-understanding/major-catalog-2026.generated.js?v=3949_0';
import { mountMajorPathBackgroundContext, MAJOR_PATH_BACKGROUND_CONTEXT_VERSION } from './background-context.v001.js';
import { buildDecisionActions } from '../shared/decision-context/decision-actions.v001.js';
import { summarizeDecisionContext, withDecisionContext } from '../shared/decision-context/decision-context.v001.js';
import { buildStudentVoiceMajorHref } from '../shared/resources/experience/student-voice-navigation.v001.js';
import { mountMajorPathStudentVoice, MAJOR_PATH_STUDENT_VOICE_VERSION } from './student-voice.v001.js';
import {
  MAJOR_PATH_NAVIGATION_META,
  readMajorPathSourceContext
} from '../shared/resources/majors/major-path-navigation.v003.js?v=003_0';

export const MAJOR_PATH_HUMAN_VERSION = 'major-path-human-v0.05';
export const MAJOR_PATH_VIEWPORT_VERSION = 'major-path-viewport-v0.05';

const sourceContext = readMajorPathSourceContext(location);
const els = {
  form: document.getElementById('searchForm'),
  input: document.getElementById('majorInput'),
  result: document.getElementById('result'),
  hero: document.querySelector('.hero'),
  topbar: document.querySelector('.topbar'),
  back: document.querySelector('.back-home')
};
const renderState = {
  token: 0,
  directBoot: Boolean((sourceContext.fromLnRank || sourceContext.fromTongxue) && sourceContext.majorCode)
};
const bootState = {
  coreReady: false,
  queuedAction: null,
  holdResultUntilHumanized: true
};

document.body.dataset.majorPathCoreReady = '0';
if (renderState.directBoot) document.body.classList.add('major-path-direct');
if (els.result && bootState.holdResultUntilHumanized) els.result.hidden = true;

function findMajorByCode(code) {
  const key = String(code || '').trim().toUpperCase();
  return MAJOR_CATALOG_2026.find(item => item.code === key) || null;
}

function removeQueryKeys(keys = []) {
  const url = new URL(location.href);
  for (const key of keys) url.searchParams.delete(key);
  history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`);
}

function stableFrames(callback) {
  requestAnimationFrame(() => requestAnimationFrame(callback));
}

function landingOffset() {
  const topbarHeight = els.topbar?.getBoundingClientRect().height || 0;
  return Math.max(12, Math.round(topbarHeight + 10));
}

function landOn(target) {
  if (!(target instanceof Element)) return;
  const top = Math.max(0, window.scrollY + target.getBoundingClientRect().top - landingOffset());
  window.scrollTo({ top, left: 0, behavior: 'auto' });
}

function finishPresentation(token, {
  landing = 'result',
  ownViewport = false
} = {}) {
  queueMicrotask(() => {
    if (!els.result || token !== renderState.token) return;
    stableFrames(() => {
      if (!els.result || token !== renderState.token) return;
      humanizeResult();
      if (bootState.holdResultUntilHumanized) els.result.hidden = false;
      delete document.body.dataset.majorPathRendering;
      stableFrames(() => {
        if (!els.result || token !== renderState.token) return;
        if (ownViewport) {
          const target = landing === 'pathway'
            ? els.result.querySelector('[data-major-pathway-focus]')
            : els.result.querySelector('.result-head, [data-result-major], .disambiguation-shell, .class-result');
          landOn(target || els.result);
        }
        document.body.dataset.majorPathLanding = landing;
      });
    });
  });
}

function beginPresentation({ landing = 'result', ownViewport = false } = {}) {
  if (!els.result) return 0;
  renderState.token += 1;
  const token = renderState.token;
  els.result.hidden = true;
  document.body.dataset.majorPathRendering = '1';
  finishPresentation(token, { landing, ownViewport });
  return token;
}

function beginStableResultPresentation() {
  beginPresentation({ landing: 'result', ownViewport: true });
}

els.form?.addEventListener('submit', event => {
  if (!bootState.coreReady) {
    event.preventDefault();
    bootState.queuedAction = { type: 'submit' };
    return;
  }
  if (renderState.directBoot) {
    beginPresentation({ landing: 'pathway', ownViewport: true });
    return;
  }
  beginStableResultPresentation();
}, true);

els.input?.addEventListener('keydown', event => {
  if (event.key !== 'Enter') return;
  if (!bootState.coreReady) {
    event.preventDefault();
    bootState.queuedAction = { type: 'submit' };
    return;
  }
  if (!renderState.directBoot) beginStableResultPresentation();
}, true);

document.addEventListener('click', event => {
  const target = event.target instanceof Element
    ? event.target.closest('[data-major-code], [data-major-example], [data-expand-disambiguation]')
    : null;
  if (!target || target.closest('[data-graph-mode]')) return;
  if (!bootState.coreReady) {
    if (target.matches('[data-major-example]')) {
      event.preventDefault();
      bootState.queuedAction = { type: 'example', value: target.dataset.majorExample || '' };
    }
    return;
  }
  if (els.result?.contains(target)) return;
  beginStableResultPresentation();
}, true);

document.addEventListener('keydown', event => {
  if (!['Enter', ' '].includes(event.key)) return;
  const target = event.target instanceof Element ? event.target.closest('[data-major-code]') : null;
  if (!target || els.result?.contains(target)) return;
  beginStableResultPresentation();
}, true);

await import('./app-core.v005.js?v=005_0');
bootState.coreReady = true;
document.body.dataset.majorPathCoreReady = '1';
const queuedAction = bootState.queuedAction;
bootState.queuedAction = null;
if (queuedAction?.type === 'example') {
  const button = [...document.querySelectorAll('[data-major-example]')]
    .find(item => item.dataset.majorExample === queuedAction.value);
  button?.click();
} else if (queuedAction?.type === 'submit') {
  els.form?.requestSubmit();
}

function textReplace(root, selector, mapping) {
  for (const node of root.querySelectorAll(selector)) {
    const current = String(node.textContent || '').trim();
    if (Object.prototype.hasOwnProperty.call(mapping, current)) node.textContent = mapping[current];
  }
}

function simplifyGraphLanguage(root) {
  textReplace(root, '.graph-legend span', {
    '本科目录硬关系': '本科属于哪里',
    '研究生升学导航': '读研可以先看',
    '跨专业类升学交叉': '跨专业也可能衔接'
  });
  textReplace(root, '.graph-group-title', {
    '共享的读研导航': '读研方向有重合',
    '跨专业类升学交叉': '跨专业也可能衔接'
  });
  textReplace(root, '.graph-empty', {
    '国家目录层面暂无可直接展示的方向': '国家目录没有规定固定去向',
    '暂无证据足够强的跨类节点': '暂时没有适合直接比较的跨类专业'
  });
  textReplace(root, '.relationship-fallback h4', {
    '跨专业类的升学交叉': '读研方向有重合的其他专业'
  });
}

function humanizeDegreeCards(graduateSection) {
  if (!graduateSection) return;
  for (const card of graduateSection.querySelectorAll('.degree-card')) {
    const heading = card.querySelector('h4');
    const description = card.querySelector(':scope > p');
    const label = String(heading?.textContent || '').trim();
    if (label === '学术学位') {
      heading.textContent = '学硕方向';
      if (description) description.textContent = '先看国家目录里的一级学科；具体学校招不招、考什么，再看当年的招生目录。';
    }
    if (label === '专业学位') {
      heading.textContent = '专硕方向';
      if (description) description.textContent = '先看国家目录里的专业学位类别；具体培养方向和报考要求，以目标学校当年的招生目录为准。';
    }
  }
  for (const meta of graduateSection.querySelectorAll('.degree-meta')) {
    meta.textContent = String(meta.textContent || '')
      .replace(/^研究生目录\s*·\s*一级学科/, '国家目录：一级学科')
      .replace(/^研究生目录\s*·\s*专业学位类别/, '国家目录：专业学位类别');
  }
  const fieldTitle = graduateSection.querySelector('.field-title');
  if (fieldTitle) fieldTitle.textContent = '有些专硕还会细分方向';
}

function conciseSourceContext(context, major) {
  const sourceMajor = String(context.sourceMajor || '').trim();
  if (context.sourceSurface === 'academic-background') {
    return {
      title: context.school ? `来自刚才的${context.school}专业背景依据` : '来自刚才的专业背景依据',
      body: '这里继续看专业本身和本科到读研路径；学校背景证据仍回刚才页面核验。'
    };
  }
  if (context.context === 'school') {
    if (sourceMajor && sourceMajor !== major.name) {
      return {
        title: `刚才看到：${sourceMajor}`,
        body: `这里先了解“${major.name}”专业本身；学费、校区和合作项目回原招生记录确认。`
      };
    }
    return {
      title: context.school ? `来自刚才的${context.school}专业列表` : '来自刚才的学校专业列表',
      body: '这里先看专业本身；这所学校具体怎么培养，仍以学校材料为准。'
    };
  }
  if (sourceMajor && sourceMajor !== major.name) {
    return {
      title: `刚才看到：${sourceMajor}`,
      body: `这里先了解“${major.name}”专业本身；原来的学校、项目和分数信息回招生结果继续看。`
    };
  }
  return {
    title: '来自刚才的辽宁招生结果',
    body: '分数和学校信息留在原结果里，这里先把本科到读研的路线看清楚。'
  };
}

function directContextForMajor(major) {
  const originalCode = String(sourceContext.majorCode || '').trim().toUpperCase();
  if (major.code === originalCode) {
    const summary = summarizeDecisionContext(sourceContext.decisionContext);
    const base = conciseSourceContext(sourceContext, major);
    if (summary.lines.length) {
      return {
        title: base.title,
        body: `${base.body} 当前只读条件：${summary.lines.join(' · ')}。不会自动修改家庭方案；${sourceContext.returnTo ? '返回可恢复原查询。' : '可从返回按钮回到原入口。'}`
      };
    }
    return base;
  }
  return {
    title: '从刚才的专业继续看',
    body: '这是从相关专业里继续展开的内容；返回仍会回到最初的招生结果。'
  };
}

function installReturnAction(context) {
  const action = els.back;
  if (!(action instanceof HTMLAnchorElement)) return;
  action.href = context.returnTo || '/ln-rank/';
  action.textContent = context.sourceSurface === 'academic-background'
    ? '← 返回背景依据'
    : context.sourceSurface === 'tongxue'
      ? '← 返回同学你好'
      : context.context === 'school' && context.school
        ? `← 返回${context.school}的专业`
        : '← 返回刚才的专业列表';
  action.dataset.majorPathReturn = 'ln-rank';
  if (action.dataset.majorPathReturnBound === '1') return;
  action.dataset.majorPathReturnBound = '1';
  action.addEventListener('click', event => {
    if (!document.referrer) return;
    try {
      const referrer = new URL(document.referrer);
      if (referrer.origin !== location.origin || !referrer.pathname.startsWith('/ln-rank/')) return;
      event.preventDefault();
      history.back();
    } catch {}
  });
}

function installDecisionActions(focus, major) {
  const context = sourceContext.decisionContext;
  if (!context || !focus || focus.querySelector('[data-decision-actions]')) return;
  const studentVoiceHref = buildStudentVoiceMajorHref({
    majorCode: major.code,
    canonicalName: major.name,
    context: sourceContext.context || 'score',
    sourceKey: sourceContext.sourceKey,
    returnTo: sourceContext.returnTo || '/major-path/',
    decisionContext: context
  });
  const aiplusHref = withDecisionContext('/aiplus/', context);
  const actions = buildDecisionActions(context, {
    studentVoiceHref,
    aiplusHref,
    returnHref: sourceContext.returnTo
  });
  if (!actions.length) return;
  const wrap = document.createElement('div');
  wrap.className = 'decision-actions';
  wrap.dataset.decisionActions = 'readonly';
  for (const action of actions) {
    const link = document.createElement('a');
    link.className = 'decision-action';
    link.href = action.href;
    link.dataset.decisionAction = action.id;
    link.textContent = action.label;
    wrap.append(link);
  }
  focus.append(wrap);
}

function makePathwayFocus(shell, major, undergradSection, graduateSection) {
  if (!undergradSection || !graduateSection) return null;
  const existing = shell.querySelector('[data-major-pathway-focus]');
  if (existing) return existing;

  for (const section of [undergradSection, graduateSection]) {
    if (section.previousElementSibling?.classList.contains('divider')) section.previousElementSibling.remove();
  }
  const answer = shell.querySelector('.answer-first');
  if (answer?.nextElementSibling?.classList.contains('divider')) answer.nextElementSibling.remove();

  const focus = document.createElement('section');
  focus.className = 'major-pathway-focus';
  focus.dataset.majorPathwayFocus = major.code;
  focus.innerHTML = `<div class="pathway-focus-head"><p class="eyebrow">本科到读研，先看这条线</p><h3>${major.name}以后怎么继续学</h3><p>先看本科在国家目录里的位置，再看读研时可以优先了解的学硕、专硕方向。</p></div>`;

  if (renderState.directBoot) {
    const source = directContextForMajor(major);
    const note = document.createElement('div');
    note.className = 'direct-context-line';
    note.dataset.majorPathSourceBoundary = major.code === String(sourceContext.majorCode || '').trim().toUpperCase()
      ? (sourceContext.context || 'score')
      : 'continuation';
    note.innerHTML = `<strong>${source.title}</strong><span>${source.body}</span>`;
    focus.append(note);
  }

  const undergradHeading = undergradSection.querySelector('.section-heading');
  if (undergradHeading) undergradHeading.textContent = '本科先看：它属于哪里';
  const undergradNote = undergradSection.querySelector('.relation-note');
  if (undergradNote) undergradNote.innerHTML = '<strong>目录说明：</strong>这个专业在2026本科目录中直接列在“交叉学科”门类下，专业类未单列。';

  const graduateHeading = graduateSection.querySelector('.section-heading');
  if (graduateHeading) graduateHeading.textContent = '如果以后读研，可以先看这些方向';
  humanizeDegreeCards(graduateSection);

  focus.append(undergradSection, graduateSection);
  installDecisionActions(focus, major);
  if (answer) answer.insertAdjacentElement('afterend', focus);
  else shell.prepend(focus);
  return focus;
}

function wrapRelationship(shell, relationship, focus, anchor = focus) {
  if (!relationship || !focus) return null;
  const existing = shell.querySelector('[data-major-explore-details]');
  if (existing) return existing;

  const eyebrow = relationship.querySelector('.relationship-head .eyebrow');
  const heading = relationship.querySelector('.relationship-head h3');
  const warmTitle = relationship.querySelector('.relationship-warm strong');
  const mobileHint = relationship.querySelector('.graph-mobile-hint');
  const truthChip = relationship.querySelector('.graph-truth-chip');
  if (eyebrow) eyebrow.textContent = '想多比较一步';
  if (heading) heading.textContent = '和它相关的专业';
  if (warmTitle) warmTitle.textContent = '家长可以这样看';
  if (mobileHint) mobileHint.textContent = '点专业可以继续看；手机上可左右滑动。';
  if (truthChip) truthChip.hidden = true;
  textReplace(relationship, '.graph-tabs [data-graph-mode]', {
    '按本科目录看': '看本科“亲缘”',
    '看相邻选择与读研交叉': '看读研方向有重合'
  });
  simplifyGraphLanguage(relationship);

  if (relationship.previousElementSibling?.classList.contains('divider')) relationship.previousElementSibling.remove();
  const details = document.createElement('details');
  details.className = 'human-explore-details';
  details.dataset.majorExploreDetails = '1';
  const summary = document.createElement('summary');
  summary.innerHTML = '<strong>还想看看和它相关的专业？</strong><span>展开同类专业、读研方向有重合的专业和关系图</span>';
  relationship.replaceWith(details);
  details.append(summary, relationship);
  anchor?.insertAdjacentElement('afterend', details);
  return details;
}

function buildEvidenceDetails(shell, relationship, graduateSection, sourceSection, afterNode) {
  const existing = shell.querySelector('[data-major-evidence-details]');
  if (existing) return existing;
  const details = document.createElement('details');
  details.className = 'human-evidence-details';
  details.dataset.majorEvidenceDetails = '1';
  const summary = document.createElement('summary');
  summary.innerHTML = '<strong>为什么这里只写“可以先看”，不是固定对应？</strong><span>展开看国家目录边界和官方依据</span>';
  details.append(summary);

  const intro = document.createElement('p');
  intro.className = 'evidence-intro';
  intro.textContent = '本科专业和研究生方向不是国家规定的一一对应关系；真正到某所学校，还要看它当年的硕士招生目录和培养方案。';
  details.append(intro);

  const secondLevel = graduateSection?.querySelector('.second-level-note');
  if (secondLevel) {
    const title = secondLevel.querySelector('strong');
    const body = secondLevel.querySelector('p');
    if (title) title.textContent = '为什么没有列到每所学校的二级方向？';
    if (body) body.textContent = '国家研究生目录统一到一级学科和专业学位类别；更细的二级学科、专业领域和研究方向由学校按规定设置，所以要继续看目标学校当年的招生目录。';
    details.append(secondLevel);
  }

  const routeBoundary = graduateSection?.querySelector('.relation-note');
  if (routeBoundary) {
    const strong = routeBoundary.querySelector('strong');
    if (strong) strong.textContent = '需要注意：';
    details.append(routeBoundary);
  }
  const graphBoundary = relationship?.querySelector('.graph-boundary');
  if (graphBoundary) {
    const strong = graphBoundary.querySelector('strong');
    if (strong) strong.textContent = '相近不等于一样。';
    details.append(graphBoundary);
  }
  if (sourceSection) {
    if (sourceSection.previousElementSibling?.classList.contains('divider')) sourceSection.previousElementSibling.remove();
    const heading = sourceSection.querySelector('.section-heading');
    if (heading) heading.textContent = '官方依据';
    details.append(sourceSection);
  }
  afterNode?.insertAdjacentElement('afterend', details);
  return details;
}

function installChangeMajorAction(focus) {
  if (!renderState.directBoot || !focus || focus.querySelector('[data-major-path-change-major]')) return;
  const actions = document.createElement('div');
  actions.className = 'pathway-actions';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'direct-change-major';
  button.dataset.majorPathChangeMajor = '1';
  button.textContent = '换个专业';
  button.addEventListener('click', () => {
    renderState.directBoot = false;
    document.body.classList.remove('major-path-direct');
    removeQueryKeys(['majorCode', 'major', 'from', 'context', 'sourceKey', 'sourceMajor', 'sourceSurface', 'school', 'returnTo']);
    if (els.input) els.input.value = '';
    els.hero?.removeAttribute('hidden');
    els.input?.focus();
    stableFrames(() => landOn(els.hero));
  });
  actions.append(button);
  focus.append(actions);
}

function humanizeMajorResult(shell) {
  const code = shell.dataset.resultMajor || '';
  const major = findMajorByCode(code);
  if (!major) return;
  const sections = [...shell.children].filter(node => node.tagName === 'SECTION');
  const undergrad = sections.find(section => section.querySelector('.section-heading')?.textContent.includes('本科目录里的位置'));
  const graduate = sections.find(section => section.querySelector('.section-heading')?.textContent.includes('继续读研'));
  const source = sections.find(section => section.querySelector('.section-heading')?.textContent.includes('权威依据'));
  const relationship = shell.querySelector('.relationship-section');
  const focus = makePathwayFocus(shell, major, undergrad, graduate);
  const background = mountMajorPathBackgroundContext({ shell, major, focus, sourceContext, direct: renderState.directBoot });
  const studentVoice = mountMajorPathStudentVoice({ shell, major, anchor: background || focus, sourceContext });
  const explore = wrapRelationship(shell, relationship, focus, studentVoice || background || focus);
  buildEvidenceDetails(shell, relationship, graduate, source, explore || studentVoice || background || focus);
  installChangeMajorAction(focus);
  simplifyGraphLanguage(shell);
}

function humanizeResult() {
  if (!els.result) return;
  const shell = els.result.querySelector('[data-result-major]');
  if (shell) humanizeMajorResult(shell);
  else simplifyGraphLanguage(els.result);
}

function currentResultNeedsPresentation() {
  const shell = els.result?.querySelector('[data-result-major]');
  return Boolean(shell && !shell.querySelector('[data-major-pathway-focus]'));
}

els.result?.addEventListener('click', () => {
  const needsPresentation = currentResultNeedsPresentation();
  humanizeResult();
  if (needsPresentation) beginStableResultPresentation();
});

els.result?.addEventListener('keydown', event => {
  if (!['Enter', ' '].includes(event.key)) return;
  const needsPresentation = currentResultNeedsPresentation();
  humanizeResult();
  if (needsPresentation) beginStableResultPresentation();
});

document.addEventListener('click', event => {
  const mode = event.target instanceof Element ? event.target.closest('[data-graph-mode]') : null;
  if (!mode) return;
  stableFrames(() => {
    const relationship = mode.closest('.relationship-section');
    if (relationship) simplifyGraphLanguage(relationship);
  });
});

function directBoot(context) {
  if (!(context.fromLnRank || context.fromTongxue) || !context.majorCode) return false;
  const major = findMajorByCode(context.majorCode);
  if (!major || !(els.input instanceof HTMLInputElement) || !(els.form instanceof HTMLFormElement)) {
    renderState.directBoot = false;
    document.body.classList.remove('major-path-direct');
    return false;
  }
  installReturnAction(context);
  els.input.value = major.name;
  els.form.requestSubmit();
  document.body.dataset.majorPathDirect = MAJOR_PATH_HUMAN_VERSION;
  document.title = `${major.name}：本科到读研怎么走 - 专业升学地图`;
  return true;
}

if (!directBoot(sourceContext)) {
  if (!queuedAction && els.result?.textContent.trim()) beginStableResultPresentation();
  else if (!queuedAction) {
    humanizeResult();
    if (els.result && bootState.holdResultUntilHumanized) els.result.hidden = false;
  }
}

document.body.dataset.majorPathHumanVersion = MAJOR_PATH_HUMAN_VERSION;
window.__MAJOR_PATH_HUMAN_META__ = Object.freeze({
  version: MAJOR_PATH_HUMAN_VERSION,
  viewportVersion: MAJOR_PATH_VIEWPORT_VERSION,
  coreVersion: window.__MAJOR_PATH_META__?.version || 'major-path-core-v0.05',
  navigationVersion: MAJOR_PATH_NAVIGATION_META.version,
  backgroundVersion: MAJOR_PATH_BACKGROUND_CONTEXT_VERSION,
  studentVoiceVersion: MAJOR_PATH_STUDENT_VOICE_VERSION,
  direct: renderState.directBoot,
  context: sourceContext.context || ''
});
