import {
  ACADEMIC_BACKGROUND_CONTEXT_RESOURCE,
  listMajorBackgroundSchools,
  resolveSchoolMajorBackgroundContext,
  validateAcademicBackgroundContextSnapshot
} from '../shared/resources/background/academic-background-context.v001.js';
import { buildAcademicBackgroundHref } from '../shared/resources/background/academic-background-navigation.v002.js?v=002_0&r=r028-android-links';

export const MAJOR_PATH_BACKGROUND_CONTEXT_VERSION = 'major-path-background-context-v0.01';
let snapshotPromise = null;

function loadSnapshot() {
  if (!snapshotPromise) {
    snapshotPromise = fetch(ACADEMIC_BACKGROUND_CONTEXT_RESOURCE, { headers: { accept: 'application/json' }, cache: 'force-cache' })
      .then(async response => {
        if (!response.ok) throw new Error(`背景上下文读取失败（${response.status}）`);
        const payload = await response.json();
        if (!validateAcademicBackgroundContextSnapshot(payload)) throw new Error('背景上下文版本不匹配');
        return payload;
      });
  }
  return snapshotPromise;
}

function node(tag, className = '', text = '') {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text) el.textContent = text;
  return el;
}

function scopeLabel(scope) {
  return scope === '211' ? '211专业背景' : '省内专业背景';
}

function pageReturnTarget() {
  return `${location.pathname}${location.search}${location.hash}`;
}

function addScopeLink(actions, { scope, major, school = '', label = '' }) {
  const href = buildAcademicBackgroundHref({
    scope,
    majorCode: major.code,
    canonicalName: major.name,
    school,
    from: 'major-path',
    returnTo: pageReturnTarget()
  });
  if (!href) return;
  const link = node('a', 'major-background-link', label || (scope === '211' ? '看211院校背景 →' : '看辽宁省内背景 →'));
  link.href = href;
  link.dataset.majorBackgroundScopeLink = scope;
  actions.append(link);
}

function renderMatch(section, context, major, school) {
  const content = section.querySelector('[data-major-background-content]');
  if (!content) return;
  content.replaceChildren();
  if (!context.matched) {
    const empty = node('div', 'major-background-empty');
    empty.append(node('strong', '', '当前没有达到展示门禁的学校×专业背景证据'));
    empty.append(node('p', '', '未显示不代表这个专业在这所学校是弱项。这里不会因为学校是211/985，或因为模型“觉得不错”，就补成具体专业优势。'));
    content.append(empty);
    const actions = node('div', 'major-background-actions');
    addScopeLink(actions, { scope: 'liaoning', major, label: '换个视角：看辽宁哪些学校有背景 →' });
    addScopeLink(actions, { scope: '211', major, label: '换个视角：看211院校哪些有背景 →' });
    content.append(actions);
    return;
  }

  const grid = node('div', 'major-background-evidence-grid');
  for (const match of context.matches) {
    const item = node('article', 'major-background-evidence-item');
    const head = node('div', 'major-background-evidence-head');
    head.append(node('span', 'major-background-scope', scopeLabel(match.scope)));
    head.append(node('b', '', (match.directions || []).join(' / ') || major.name));
    item.append(head);
    if (match.note) item.append(node('p', '', match.note));
    const source = (match.sources || [])[0];
    if (source) item.append(node('small', '', [source.title, source.year ? `${source.year}年证据` : ''].filter(Boolean).join(' · ')));
    grid.append(item);
  }
  content.append(grid);
  if (context.scopesMatched.length > 1) {
    content.append(node('p', 'major-background-boundary', '同一学校可能同时有省内背景和211背景；这是两个证据视角，不叠加成“更强”，同一来源也不会重复计分。'));
  }
  const actions = node('div', 'major-background-actions');
  for (const scope of context.scopesMatched) addScopeLink(actions, { scope, major, school, label: scope === '211' ? '查看211背景依据 →' : '查看省内背景依据 →' });
  content.append(actions);
}

function renderIndependent(section, major) {
  const content = section.querySelector('[data-major-background-content]');
  if (!content) return;
  content.replaceChildren();
  const summary = node('p', 'major-background-independent-note', '如果想把专业放进具体学校里比较，可以继续看已经通过来源门禁的学校×专业背景。这里不按“强弱”给学校排榜。');
  const actions = node('div', 'major-background-actions');
  addScopeLink(actions, { scope: 'liaoning', major, label: '看辽宁哪些学校有这个专业背景 →' });
  addScopeLink(actions, { scope: '211', major, label: '看211院校哪些有这个专业背景 →' });
  content.append(summary, actions);
}

export function mountMajorPathBackgroundContext({ shell, major, focus, sourceContext = {}, direct = false } = {}) {
  if (!(shell instanceof Element) || !major?.code || !focus) return null;
  const existing = shell.querySelector('[data-major-background-context]');
  if (existing) return existing;
  const section = node('section', 'major-background-context');
  section.dataset.majorBackgroundContext = major.code;
  const heading = node('div', 'major-background-heading');
  heading.append(node('p', 'eyebrow', sourceContext.school ? '把专业放回具体学校' : '想再往学校里看一步'));
  heading.append(node('h3', '', sourceContext.school ? `放到${sourceContext.school}里再看一眼` : '哪些学校在这个专业方向有可核验证据？'));
  heading.append(node('p', '', sourceContext.school
    ? '学校平台和专业背景不是一回事。这里只看这所学校×这个具体本科专业已经通过门禁的背景证据。'
    : '先选证据范围，再去具体学校核验；没有证据的学校不会被写成“弱项”。'));
  section.append(heading);
  const content = node('div', 'major-background-content');
  content.dataset.majorBackgroundContent = '1';
  content.append(node('p', 'major-background-loading', sourceContext.school ? '正在读取这所学校和这个专业的统一背景证据…' : '')); 
  section.append(content);
  focus.insertAdjacentElement('afterend', section);

  if (!sourceContext.school) {
    renderIndependent(section, major);
    return section;
  }

  loadSnapshot()
    .then(snapshot => resolveSchoolMajorBackgroundContext(snapshot, {
      school: sourceContext.school,
      majorCode: major.code,
      majorName: major.name,
      scope: 'auto'
    }))
    .then(context => {
      if (!section.isConnected) return;
      renderMatch(section, context, major, sourceContext.school);
      section.dataset.majorBackgroundState = context.matched ? 'matched' : 'empty';
    })
    .catch(error => {
      if (!section.isConnected) return;
      content.replaceChildren();
      content.append(node('strong', '', '学校×专业背景暂时没有读取成功'));
      content.append(node('p', '', '这不会影响上面的专业本科与读研信息；本轮不会用模型常识补写学校背景。'));
      section.dataset.majorBackgroundState = 'error';
      console.warn('[major-path-background-context]', error?.message || String(error));
    });
  return section;
}

export async function countMajorBackgroundSchoolsForTesting(major, scope) {
  const snapshot = await loadSnapshot();
  return listMajorBackgroundSchools(snapshot, { majorCode: major?.code, majorName: major?.name, scope, regionKeys: scope === 'liaoning' ? ['ln'] : ['all'] }).total;
}
