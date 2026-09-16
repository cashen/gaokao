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

function pendingSummary(items) {
  const fee = items.filter(item => item.isSinoForeign || item.isHighFee || /中外|高收费|学费|费用/.test([
    item.major, item.school, item.tuition, item.matchReason,
    ...(Array.isArray(item.flags) ? item.flags : [])
  ].filter(Boolean).join(' '))).length;
  const campus = items.filter(item => /校区|分校/.test([
    item.school, item.geoEntity, item.displayLocation
  ].filter(Boolean).join(' '))).length;
  const parts = [];
  if (fee) parts.push(`${fmt(fee)}个需要确认费用或培养方式`);
  if (campus) parts.push(`${fmt(campus)}个涉及校区或分校`);
  return parts.slice(0, 2).join('，');
}

function renderHomeState() {
  const score = readFamilyCandidateScore();
  const items = readFamilySelectionItems();
  const status = buildFamilyStatus({ score, items });
  document.body.dataset.homeState = status.selectedCount ? 'returning' : score ? 'score-ready' : 'new';

  if (status.selectedCount) {
    setText('homeTitle', '继续整理当前家庭方案');
    setText('homeLead', `当前参考分数${score ? `${fmt(score)}分` : '尚未确认'}，家庭方案里有${fmt(status.selectedCount)}个专业，其中${fmt(status.pendingCount)}个还需要继续确认。先听孩子对专业内容和城市生活的真实想法，再确认费用、校区、培养方式和特殊要求。`);
    setPrimary(status.nextActionHref, status.pendingCount ? '继续检查家庭方案' : '生成家庭方案报告');
    return;
  }

  if (score) {
    setText('homeTitle', `从${fmt(score)}分开始圈出可讨论专业`);
    setText('homeLead', '参考分数已经保存。接下来选择孩子愿意了解的专业方向，再结合地区、学校性质和家庭条件缩小范围。这里使用2026历史投档记录，不预测2027录取结果。');
    setPrimary('/ln-rank/', '继续专业初选');
    return;
  }

  setText('homeTitle', '先圈出一批值得家庭讨论的专业');
  setText('homeLead', '输入孩子的模考或预估参考分数，再结合专业方向和地区，先看看哪些专业值得继续了解。');
  setPrimary('/ln-rank/', '开始专业初选');
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
  document.getElementById('examCountdown')?.setAttribute('aria-label', '距离2027年高考还有' + days + '天' + hours + '小时' + minutes + '分' + seconds + '秒');
}

const release = mountCurrentRelease();
renderHomeState();
ensureSimulationToolEntry();
bindToolGroups();
renderCountdown();
const countdownTimer = globalThis.setInterval(renderCountdown, 1000);

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
