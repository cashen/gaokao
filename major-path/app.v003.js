import { MAJOR_CATALOG_2026 } from '../ln-rank/kb/major-understanding/major-catalog-2026.generated.js?v=3949_0';
import {
  MAJOR_PATH_NAVIGATION_META,
  readMajorPathSourceContext
} from '../shared/resources/majors/major-path-navigation.v003.js?v=003_0';

const sourceContext = readMajorPathSourceContext(location);
if (sourceContext.fromLnRank && sourceContext.majorCode) document.body.classList.add('major-path-direct');

await import('./app.v002.js?v=002_0');

export const MAJOR_PATH_DIRECT_VERSION = 'major-path-direct-v0.03';

function findMajorByCode(code) {
  const key = String(code || '').trim().toUpperCase();
  return MAJOR_CATALOG_2026.find(item => item.code === key) || null;
}

function safeReturnLabel(context) {
  if (context.context === 'school' && context.school) return `← 返回${context.school}的专业`;
  return '← 返回刚才的专业列表';
}

function sameOriginLnRankReferrer() {
  if (!document.referrer) return false;
  try {
    const referrer = new URL(document.referrer);
    return referrer.origin === location.origin && referrer.pathname.startsWith('/ln-rank/');
  } catch {
    return false;
  }
}

function installReturnAction(context) {
  const action = document.querySelector('.back-home');
  if (!(action instanceof HTMLAnchorElement)) return;
  action.href = context.returnTo || '/ln-rank/';
  action.textContent = safeReturnLabel(context);
  action.dataset.majorPathReturn = 'ln-rank';
  action.addEventListener('click', event => {
    if (!sameOriginLnRankReferrer()) return;
    event.preventDefault();
    history.back();
  });
}

function sourceBoundaryText(context, major) {
  const sourceMajor = String(context.sourceMajor || '').trim();
  if (context.context === 'school') {
    const school = context.school ? `你刚才在“${context.school}”的在辽专业里看到这条记录。` : '你刚才从学校专业列表进入这里。';
    if (sourceMajor && sourceMajor !== major.name) {
      return `${school} 招生记录写的是“${sourceMajor}”；本页只解释规范本科专业“${major.name}”本身。项目、校区、学费和培养方式仍请返回招生记录继续确认。`;
    }
    return `${school} 这里先把“${major.name}”这个本科专业本身讲清楚；这所学校具体怎么培养、在哪个校区、学费和项目规则仍以学校材料为准。`;
  }
  if (sourceMajor && sourceMajor !== major.name) {
    return `你刚才在按分数查看时看到“${sourceMajor}”。系统已经确认它对应规范本科专业“${major.name}”；这里解释专业本身，原招生记录的学校、项目和分数信息请返回后继续看。`;
  }
  return `你刚才在按分数查看的专业列表里看到“${major.name}”。这里不重复招生分数，而是把这个专业在本科目录、相邻专业和读研路径里的位置讲清楚。`;
}

function insertSourceBoundary(context, major) {
  const shell = document.querySelector('[data-result-major]');
  const header = shell?.querySelector('.result-head');
  if (!shell || !header || shell.querySelector('[data-major-path-source-boundary]')) return;
  const note = document.createElement('section');
  note.className = 'direct-source-note';
  note.dataset.majorPathSourceBoundary = context.context;
  note.innerHTML = `<strong>从刚才的结果继续看</strong><p>${sourceBoundaryText(context, major)}</p>`;
  header.insertAdjacentElement('afterend', note);
}

function installChangeMajorAction() {
  const hero = document.querySelector('.hero');
  const form = document.getElementById('searchForm');
  if (!hero || !form || document.querySelector('[data-major-path-change-major]')) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'direct-change-major';
  button.dataset.majorPathChangeMajor = '1';
  button.textContent = '换个专业';
  button.addEventListener('click', () => {
    document.body.classList.remove('major-path-direct');
    hero.hidden = false;
    const input = document.getElementById('majorInput');
    input?.focus();
    hero.scrollIntoView({ behavior: 'auto', block: 'start' });
  });
  const result = document.getElementById('result');
  result?.insertAdjacentElement('beforebegin', button);
}

function directBoot(context) {
  if (!context.fromLnRank || !context.majorCode) return false;
  const major = findMajorByCode(context.majorCode);
  const input = document.getElementById('majorInput');
  const form = document.getElementById('searchForm');
  if (!major || !(input instanceof HTMLInputElement) || !(form instanceof HTMLFormElement)) {
    document.body.classList.remove('major-path-direct');
    return false;
  }
  installReturnAction(context);
  input.value = major.name;
  form.requestSubmit();
  const result = document.getElementById('result');
  result?.scrollIntoView({ behavior: 'auto', block: 'start' });
  insertSourceBoundary(context, major);
  installChangeMajorAction();
  document.body.dataset.majorPathDirect = MAJOR_PATH_DIRECT_VERSION;
  document.title = `${major.name}：专业关系与读研方向 - 专业升学地图`;
  return true;
}

directBoot(sourceContext);

window.__MAJOR_PATH_DIRECT_META__ = Object.freeze({
  version: MAJOR_PATH_DIRECT_VERSION,
  navigationVersion: MAJOR_PATH_NAVIGATION_META.version,
  direct: Boolean(sourceContext.fromLnRank && sourceContext.majorCode),
  context: sourceContext.context
});
