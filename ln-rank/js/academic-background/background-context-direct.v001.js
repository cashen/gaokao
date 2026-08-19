import {
  ACADEMIC_BACKGROUND_CONTEXT_RESOURCE,
  listMajorBackgroundSchools,
  resolveSchoolMajorBackgroundContext,
  validateAcademicBackgroundContextSnapshot
} from '../../../shared/resources/background/academic-background-context.v001.js';
import { readAcademicBackgroundNavigationContext } from '../../../shared/resources/background/academic-background-navigation.v001.js';
import { buildMajorPathHref } from '../../../shared/resources/majors/major-path-navigation.v003.js?v=003_0';

export const ACADEMIC_BACKGROUND_DIRECT_VERSION = 'academic-background-direct-v0.01';
const nav = readAcademicBackgroundNavigationContext(location);
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

function el(tag, className = '', text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function scopeLabel(scope) {
  return scope === '211' ? '211专业背景' : '省内专业背景';
}

function currentPath() {
  return `${location.pathname}${location.search}${location.hash}`;
}

function sourceText(match = {}) {
  const source = (match.sources || [])[0];
  if (!source) return '来源已通过背景证据门禁';
  return [source.title, source.year ? `${source.year}年证据` : ''].filter(Boolean).join(' · ');
}

function renderExactBody(root, context) {
  if (!context.matched) {
    const empty = el('div', 'background-direct-empty');
    empty.append(el('strong', '', '当前没有达到展示门禁的学校×专业背景证据'));
    empty.append(el('p', '', '未显示不代表这个专业在这所学校是弱项；这里不会用学校层次或模型常识补成专业结论。'));
    root.append(empty);
    return;
  }
  const grid = el('div', 'background-direct-evidence');
  for (const match of context.matches) {
    const card = el('article', 'background-direct-evidence-item');
    const top = el('div', 'background-direct-evidence-top');
    top.append(el('span', 'background-direct-scope', scopeLabel(match.scope)));
    top.append(el('b', '', (match.directions || []).join(' / ') || context.canonicalMajor?.name || '专业背景'));
    card.append(top);
    if (match.note) card.append(el('p', '', match.note));
    card.append(el('small', '', sourceText(match)));
    grid.append(card);
  }
  root.append(grid);
  if (context.scopesMatched.length > 1) {
    root.append(el('p', 'background-direct-boundary', '这两类是不同证据视角，不相加成“更强”或推荐分；同一来源也不会重复计分。'));
  }
}

async function mount() {
  if (!nav.majorCode) return;
  const page = document.querySelector('.ls-page, .a211-page, #mainContent');
  const workspace = document.querySelector('.ls-workspace, .a211-workspace');
  if (!page || !workspace) return;
  const section = el('section', 'background-direct-card');
  section.dataset.backgroundDirect = ACADEMIC_BACKGROUND_DIRECT_VERSION;
  const head = el('div', 'background-direct-head');
  const heading = el('div');
  heading.append(el('p', 'background-direct-eyebrow', nav.school ? '从刚才的学校×专业继续看' : '从专业升学地图继续看'));
  heading.append(el('h2', '', `${nav.school ? `${nav.school} · ` : ''}${nav.canonicalName || nav.majorCode}`));
  heading.append(el('p', '', nav.school
    ? '这里只看这所学校和这个具体本科专业已有的背景证据；录取分数、学校平台和是否适合你仍是另外的问题。'
    : `下面继续看“${nav.canonicalName || nav.majorCode}”在${nav.scope === '211' ? '211院校' : '辽宁省内学校'}中的背景证据，不做学校强弱排行榜。`));
  head.append(heading);
  if (nav.from === 'major-path') {
    const back = el('a', 'background-direct-back', '← 返回专业升学地图');
    back.href = nav.returnTo || '/major-path/';
    head.append(back);
  }
  section.append(head);
  const body = el('div', 'background-direct-body');
  body.append(el('p', 'background-direct-loading', '正在读取统一背景证据…'));
  section.append(body);
  workspace.before(section);

  try {
    const snapshot = await loadSnapshot();
    body.replaceChildren();
    if (nav.school) {
      const exact = resolveSchoolMajorBackgroundContext(snapshot, {
        school: nav.school,
        majorCode: nav.majorCode,
        majorName: nav.canonicalName,
        scope: nav.scope
      });
      renderExactBody(body, exact);
    } else {
      const list = listMajorBackgroundSchools(snapshot, {
        majorCode: nav.majorCode,
        majorName: nav.canonicalName,
        scope: nav.scope,
        regionKeys: nav.scope === 'liaoning' ? ['ln'] : ['all'],
        limit: 200
      });
      const summary = el('div', 'background-direct-summary');
      summary.append(el('strong', '', list.ok ? `当前有 ${list.total} 所学校形成可展示的学校×专业背景证据` : '背景证据暂时没有读取成功'));
      summary.append(el('p', '', list.ok
        ? '数量只表示当前 evidence gate 的覆盖，不是学校排名；原页面已经按这个专业继续筛选，可往下看具体记录。'
        : '原页面仍可继续使用；本轮不会用旧线索或模型记忆补写。'));
      body.append(summary);
    }

    const actions = el('div', 'background-direct-actions');
    const majorHref = buildMajorPathHref({
      majorCode: nav.majorCode,
      canonicalName: nav.canonicalName,
      context: nav.school ? 'school' : 'score',
      sourceMajor: nav.canonicalName,
      school: nav.school,
      returnTo: currentPath()
    });
    if (majorHref) {
      const majorLink = el('a', 'background-direct-major-link', '了解这个专业的本科与读研路径 →');
      majorLink.href = majorHref;
      actions.append(majorLink);
    }
    body.append(actions);
    document.body.dataset.backgroundDirectReady = '1';
    document.dispatchEvent(new CustomEvent('gaokao:background-context-direct-ready', { detail: { scope: nav.scope, majorCode: nav.majorCode, school: nav.school } }));
  } catch (error) {
    body.replaceChildren();
    body.append(el('strong', '', '统一背景证据暂时没有读取成功'));
    body.append(el('p', '', '这不影响原来的省内/211背景页面；为保证准确，本轮不补写未读取到的学校×专业事实。'));
    document.body.dataset.backgroundDirectReady = 'error';
    console.warn('[academic-background-direct]', error?.message || String(error));
  }
}

mount();
