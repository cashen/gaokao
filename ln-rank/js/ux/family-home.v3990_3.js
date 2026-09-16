import { mountCurrentRelease } from '../../../shared/resources/release/release-presenter.v3990_3.js?v=3990_3';
import '../../../shared/ui/shell/family-shell.v3990_3.js?v=3990_3-nav003';
import {
  buildFamilyStatus,
  readFamilyCandidateScore,
  readFamilySelectionItems
} from '../domain/family-decision-contract.v3970_0.js?v=3970_0';

export const HOME_RUNTIME_VERSION = 'family-home-runtime-v3990_3-r031';
export const HOME_UI_REVISION = 'r031-home-redesign';
export const HOME_TOOL_REVISION = 'r032-home-simulation-entry';
export const HOME_INFORMATION_ARCHITECTURE_VERSION = 'home-information-architecture-v033';
export const HOME_EXPERIENCE_REVISION = 'r034-home-experience-refinement';
const EXAM_START_AT = new Date('2027-06-07T09:00:00+08:00');
const CLOCK_FORMATTER = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
});

function fmt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('zh-CN') : '—';
}

function setText(id, value) {
  const node = document.getElementById(id);
  if (node) node.textContent = value;
}

function setPrimary(href, text) {
  const link = document.getElementById('homePrimaryAction');
  if (!link) return;
  link.href = href;
  const label = link.querySelector('span');
  if (label) label.textContent = text;
}

function injectHomeExperienceStyles() {
  if (document.querySelector('[data-home-experience-style="r034"]')) return;
  const style = document.createElement('style');
  style.dataset.homeExperienceStyle = 'r034';
  style.textContent = `
    body[data-home-experience-revision="r034-home-experience-refinement"]{background:radial-gradient(circle at 50% -15%,rgba(23,105,216,.08),transparent 42%),linear-gradient(180deg,#fbfdff 0%,var(--bg) 72%)}
    body[data-home-experience-revision="r034-home-experience-refinement"] .shell{box-shadow:0 18px 50px rgba(21,61,106,.08)}
    body[data-home-experience-revision="r034-home-experience-refinement"] .hero{gap:30px;padding:38px;background:linear-gradient(135deg,#fff 0%,#f8fbff 58%,#eff6ff 100%)}
    body[data-home-experience-revision="r034-home-experience-refinement"] h1{letter-spacing:-.06em}
    body[data-home-experience-revision="r034-home-experience-refinement"] .lead{max-width:600px;color:#53647a}
    body[data-home-experience-revision="r034-home-experience-refinement"] .hero-primary{margin-top:22px}
    body[data-home-experience-revision="r034-home-experience-refinement"] .primary{min-width:250px;border-radius:17px;box-shadow:0 10px 24px rgba(23,105,216,.16)}
    body[data-home-experience-revision="r034-home-experience-refinement"] .countdown-panel{padding:24px 25px 21px;border-color:#d7e4f1;border-radius:26px;background:rgba(255,255,255,.94);box-shadow:0 14px 30px rgba(24,69,120,.07)}
    body[data-home-experience-revision="r034-home-experience-refinement"] .countdown-kicker{font-size:13px;letter-spacing:.05em}
    body[data-home-experience-revision="r034-home-experience-refinement"] .countdown-panel h2{margin-top:7px;font-size:20px}
    body[data-home-experience-revision="r034-home-experience-refinement"] .countdown-year{font-size:42px;opacity:.9}
    body[data-home-experience-revision="r034-home-experience-refinement"] .time{grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;margin-top:24px}
    body[data-home-experience-revision="r034-home-experience-refinement"] .time-cell{grid-column:span 1;padding:13px 5px 11px;border-color:#dce7f3;background:linear-gradient(180deg,#fbfdff,#f1f7fd);border-radius:14px}
    body[data-home-experience-revision="r034-home-experience-refinement"] .time-cell:first-child{grid-column:span 3;text-align:left;padding-left:17px}
    body[data-home-experience-revision="r034-home-experience-refinement"] .time-cell:first-child b{font-size:clamp(38px,5vw,58px)}
    body[data-home-experience-revision="r034-home-experience-refinement"] .time-cell:first-child span{font-size:12px;margin-top:6px}
    body[data-home-experience-revision="r034-home-experience-refinement"] .countdown-meta{margin-top:16px}
    body[data-home-experience-revision="r034-home-experience-refinement"] .countdown-rule{height:4px;margin-top:18px;background:linear-gradient(90deg,#e8f1fa,#e8f1fa)}
    body[data-home-experience-revision="r034-home-experience-refinement"] .countdown-rule:before{width:100%;opacity:.55}
    body[data-home-experience-revision="r034-home-experience-refinement"] .countdown-note{margin-top:11px}
    body[data-home-experience-revision="r034-home-experience-refinement"] .home-journey{display:flex;align-items:center;gap:10px;max-width:620px;margin-top:19px;padding-top:15px;border-top:1px solid #e4ecf4}
    body[data-home-experience-revision="r034-home-experience-refinement"] .home-journey-step{display:flex;align-items:center;gap:8px;min-width:0;color:#738398;font-size:12px;font-weight:800}
    body[data-home-experience-revision="r034-home-experience-refinement"] .home-journey-step b{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;border:1px solid #d6e3f1;background:#fff;color:#7890a8;font-size:11px}
    body[data-home-experience-revision="r034-home-experience-refinement"] .home-journey-step.is-current{color:#1769d8}
    body[data-home-experience-revision="r034-home-experience-refinement"] .home-journey-step.is-current b{border-color:#b9d4f2;background:#edf5ff;color:#1769d8}
    body[data-home-experience-revision="r034-home-experience-refinement"] .home-journey-arrow{flex:1;min-width:18px;height:1px;background:#dce7f3}
    body[data-home-experience-revision="r034-home-experience-refinement"] .tool-group[data-tool-group="mainline"]{border-color:#c8def4;box-shadow:0 8px 22px rgba(26,74,122,.045)}
    body[data-home-experience-revision="r034-home-experience-refinement"] .tool-group[data-tool-group="mainline"] .tool-toggle{padding-top:14px;padding-bottom:14px}
    body[data-home-experience-revision="r034-home-experience-refinement"] .tool-group[data-tool-group="mainline"] .tool-link[data-tool-kind="primary"]{border-color:#cadef4;background:#f7fbff}
    body[data-home-experience-revision="r034-home-experience-refinement"] .tool-group[data-tool-group="mainline"] .tool-link[data-tool-kind="primary"]:hover{background:#f3f8fe}
    body[data-home-experience-revision="r034-home-experience-refinement"] .hero-proof{color:#75859a}
    @media(max-width:860px){
      body[data-home-experience-revision="r034-home-experience-refinement"] .hero{gap:23px;padding:26px}
      body[data-home-experience-revision="r034-home-experience-refinement"] .home-journey{max-width:none}
    }
    @media(max-width:620px){
      body[data-home-experience-revision="r034-home-experience-refinement"] .hero{gap:17px;padding:18px}
      body[data-home-experience-revision="r034-home-experience-refinement"] .primary{min-width:0}
      body[data-home-experience-revision="r034-home-experience-refinement"] .countdown-panel{padding:18px 17px 16px;border-radius:20px}
      body[data-home-experience-revision="r034-home-experience-refinement"] .countdown-top{gap:8px}
      body[data-home-experience-revision="r034-home-experience-refinement"] .countdown-year{font-size:33px}
      body[data-home-experience-revision="r034-home-experience-refinement"] .time{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:18px}
      body[data-home-experience-revision="r034-home-experience-refinement"] .time-cell:first-child{grid-column:1/-1;padding:15px 15px 12px;text-align:left}
      body[data-home-experience-revision="r034-home-experience-refinement"] .time-cell:first-child b{font-size:44px}
      body[data-home-experience-revision="r034-home-experience-refinement"] .time-cell:not(:first-child){padding:11px 3px 9px}
      body[data-home-experience-revision="r034-home-experience-refinement"] .time-cell:not(:first-child) b{font-size:27px}
      body[data-home-experience-revision="r034-home-experience-refinement"] .countdown-meta{margin-top:13px}
      body[data-home-experience-revision="r034-home-experience-refinement"] .home-journey{gap:7px;margin-top:15px;padding-top:12px}
      body[data-home-experience-revision="r034-home-experience-refinement"] .home-journey-step{gap:6px;font-size:11px}
      body[data-home-experience-revision="r034-home-experience-refinement"] .home-journey-step b{width:22px;height:22px;font-size:10px}
      body[data-home-experience-revision="r034-home-experience-refinement"] .home-journey-arrow{min-width:8px}
    }
  `;
  document.head.append(style);
}

function ensureJourney() {
  const copy = document.querySelector('.hero-copy');
  const primary = document.querySelector('.hero-primary');
  if (!copy || !primary || copy.querySelector('[data-home-journey]')) return;
  const journey = document.createElement('div');
  journey.className = 'home-journey';
  journey.dataset.homeJourney = 'true';
  journey.innerHTML = `
    <span class="home-journey-step is-current" data-home-journey-step="major"><b>1</b><span>专业初选</span></span>
    <span class="home-journey-arrow" aria-hidden="true"></span>
    <span class="home-journey-step" data-home-journey-step="simulation"><b>2</b><span>模拟志愿</span></span>
  `;
  primary.insertAdjacentElement('afterend', journey);
}

function renderJourney(state) {
  const major = document.querySelector('[data-home-journey-step="major"]');
  const simulation = document.querySelector('[data-home-journey-step="simulation"]');
  if (!major || !simulation) return;
  const selected = Number(state?.selectedCount) || 0;
  const score = Number(state?.score) || 0;
  const onSimulation = selected > 0;
  major.classList.toggle('is-current', !onSimulation);
  simulation.classList.toggle('is-current', onSimulation);
  major.querySelector('span:last-child')?.replaceChildren(document.createTextNode(onSimulation ? '已完成专业初选' : '专业初选'));
  simulation.querySelector('span:last-child')?.replaceChildren(document.createTextNode(onSimulation ? '继续整理志愿' : score ? '接着整理志愿' : '下一步整理志愿'));
}

function setStateCopy({ score, selectedCount, pendingCount, status }) {
  if (selectedCount) {
    setText('homeTitle', '继续整理孩子已经看过的内容');
    setText('homeLead', `已经选了${fmt(selectedCount)}个专业${score ? `，参考分数为${fmt(score)}分` : ''}。接下来把值得继续讨论的学校和专业放在一起，再逐项核对费用、校区、培养方式和特殊要求。`);
    setPrimary(status.nextActionHref, pendingCount ? '继续整理' : '打开志愿整理');
    return;
  }
  if (score) {
    setText('homeTitle', `从${fmt(score)}分开始圈专业`);
    setText('homeLead', '参考分数已经保存。接下来选择孩子愿意了解的专业方向，再结合地区、学校性质和家庭条件缩小范围。这里使用2026历史投档记录，不预测2027录取结果。');
    setPrimary('/ln-rank/', '继续专业初选');
    return;
  }
  setText('homeTitle', '先圈出一批值得家庭讨论的专业');
  setText('homeLead', '输入孩子的模考或预估参考分数，再结合专业方向和地区，先看看哪些专业值得继续了解。');
  setPrimary('/ln-rank/', '开始专业初选');
}

function setCountDownAccessibility(totalSeconds) {
  const countdown = document.getElementById('examCountdown');
  if (!countdown) return;
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  countdown.setAttribute('aria-label', `距离2027年高考还有${days}天${hours}小时${minutes}分${seconds}秒`);
}

function ensureSimulationToolEntry() {
  const list = document.querySelector('[data-tool-group="mainline"] .tool-list');
  if (!list || list.querySelector('[data-home-simulation-entry]')) return;
  const link = document.createElement('a');
  link.className = 'tool-link';
  link.dataset.toolKind = 'primary';
  link.dataset.homeSimulationEntry = 'true';
  link.href = '/ln-rank/simulation-report.html';
  link.setAttribute('aria-label', '打开模拟志愿');

  const copy = document.createElement('span');
  const eyebrow = document.createElement('em');
  const title = document.createElement('strong');
  const detail = document.createElement('span');
  const arrow = document.createElement('i');
  eyebrow.textContent = '接着整理';
  title.textContent = '模拟志愿';
  detail.textContent = '把已经考虑过的学校和专业放在一起，再慢慢核对。';
  arrow.textContent = '→';
  arrow.setAttribute('aria-hidden', 'true');
  copy.append(eyebrow, title, detail);
  link.append(copy, arrow);

  const first = list.querySelector('a[href="/ln-rank/"]');
  if (first) first.insertAdjacentElement('afterend', link);
  else list.append(link);
}

const TOOL_GROUP_SELECTOR = '.tool-group[data-tool-group]';
const TOOL_GROUP_RUNTIME_VERSION = 'home-disclosure-stability-v001';

function restoreViewport(position) {
  if (!position) return;
  try { window.scrollTo(position.x, position.y); }
  catch { try { window.scrollTo(Number(position.x) || 0, Number(position.y) || 0); } catch {} }
}

function bindToolGroups() {
  for (const group of document.querySelectorAll(TOOL_GROUP_SELECTOR)) {
    const toggle = group.querySelector('.tool-toggle');
    const panelId = toggle?.getAttribute('aria-controls');
    const panel = panelId ? document.getElementById(panelId) : group.querySelector('.tool-list');
    if (!toggle || !panel || toggle.dataset.bound === 'true') continue;

    const setOpen = open => {
      const next = Boolean(open);
      group.dataset.open = String(next);
      toggle.setAttribute('aria-expanded', String(next));
      panel.hidden = !next;
    };

    setOpen(toggle.getAttribute('aria-expanded') === 'true' && !panel.hidden);
    toggle.dataset.bound = 'true';
    toggle.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      const position = { x: Number(window.scrollX) || 0, y: Number(window.scrollY) || 0 };
      const next = toggle.getAttribute('aria-expanded') !== 'true';
      setOpen(next);
      try { toggle.focus({ preventScroll: true }); } catch { try { toggle.focus(); } catch {} }
      const restore = () => restoreViewport(position);
      restore();
      globalThis.setTimeout(restore, 0);
      if (typeof globalThis.requestAnimationFrame === 'function') {
        globalThis.requestAnimationFrame(restore);
        globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(restore));
      }
    });
  }
}

function renderCountdown(now = new Date()) {
  const remainingMs = Math.max(0, EXAM_START_AT.getTime() - now.getTime());
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad2 = value => String(value).padStart(2, '0');
  setText('d2027', String(days));
  setText('h2027', pad2(hours));
  setText('m2027', pad2(minutes));
  setText('s2027', pad2(seconds));
  setText('nowText', CLOCK_FORMATTER.format(now));
  setCountDownAccessibility(totalSeconds);
}

const release = mountCurrentRelease();
injectHomeExperienceStyles();
ensureJourney();
renderHomeState();
ensureSimulationToolEntry();
bindToolGroups();
renderCountdown();
const countdownTimer = globalThis.setInterval(renderCountdown, 1000);

function renderHomeState() {
  const score = readFamilyCandidateScore();
  const items = readFamilySelectionItems();
  const status = buildFamilyStatus({ score, items });
  document.body.dataset.homeState = status.selectedCount ? 'returning' : score ? 'score-ready' : 'new';
  document.body.dataset.homeExperienceRevision = HOME_EXPERIENCE_REVISION;
  document.title = '辽宁高考家庭决策｜2027专业初选与模拟志愿';
  setStateCopy({
    score,
    selectedCount: status.selectedCount,
    pendingCount: status.pendingCount,
    status
  });
  renderJourney({ score, selectedCount: status.selectedCount });
}

window.addEventListener('storage', renderHomeState);
window.addEventListener('gaokao:selection-change', renderHomeState);
window.addEventListener('lnrank-selection-pool-updated', renderHomeState);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) renderCountdown();
});

globalThis.__GAOKAO_HOME_RUNTIME__ = Object.freeze({
  version: HOME_RUNTIME_VERSION,
  uiRevision: HOME_UI_REVISION,
  homeToolRevision: HOME_TOOL_REVISION,
  informationArchitectureVersion: HOME_INFORMATION_ARCHITECTURE_VERSION,
  homeExperienceRevision: HOME_EXPERIENCE_REVISION,
  generation: release.siteRuntimeGeneration,
  release: release.display,
  releaseOwner: release.resourceOwners.release,
  shellOwner: release.resourceOwners.familyShell,
  stateOwner: release.resourceOwners.familyDecisionState,
  countdownOwner: HOME_RUNTIME_VERSION,
  countdownPrecision: 'second',
  disclosureOwner: TOOL_GROUP_RUNTIME_VERSION,
  countdownIntervalMs: 1000,
  examStartAt: EXAM_START_AT.toISOString(),
  simulationEntryHref: '/ln-rank/simulation-report.html',
  simulationEntryCount: () => document.querySelectorAll('[data-home-simulation-entry]').length,
  timer: countdownTimer
});
