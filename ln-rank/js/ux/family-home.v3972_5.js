import { mountCurrentRelease } from '../../../shared/resources/release/release-presenter.v3972_5.js?v=3972_5';
import '../../../shared/ui/shell/family-shell.v3972_5.js?v=3972_5';
import {
  buildFamilyStatus,
  readFamilyCandidateScore,
  readFamilySelectionItems
} from '../domain/family-decision-contract.v3970_0.js?v=3970_0';

export const HOME_RUNTIME_VERSION = 'family-home-runtime-v3972_5';
const EXAM_START_AT = new Date('2027-06-07T09:00:00+08:00');
const CLOCK_FORMATTER = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
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

function renderSteps(lines) {
  const root = document.getElementById('homeSteps');
  if (!root) return;
  root.replaceChildren(...lines.map(([title, detail]) => {
    const row = document.createElement('div');
    const heading = document.createElement('b');
    const copy = document.createElement('span');
    heading.textContent = title;
    copy.textContent = detail;
    row.append(heading, copy);
    return row;
  }));
}

function pendingSummary(items) {
  const fee = items.filter(item => item.isSinoForeign || item.isHighFee || /中外|高收费|学费|费用/.test([
    item.major,
    item.school,
    item.tuition,
    item.matchReason,
    ...(Array.isArray(item.flags) ? item.flags : [])
  ].filter(Boolean).join(' '))).length;
  const campus = items.filter(item => /校区|分校/.test([
    item.school,
    item.geoEntity,
    item.displayLocation
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
    setText('homeActionTitle', '下一步先做什么');
    const detail = pendingSummary(items);
    setText('homeActionCopy', detail ? `${detail}。先处理这些会影响家庭决定的事项，再生成报告。` : '先检查专业方向和城市是否过于集中，再确认孩子是否愿意继续了解。');
    setPrimary(status.nextActionHref, status.pendingCount ? '继续检查家庭方案' : '生成家庭方案报告');
    renderSteps([
      ['1. 先听孩子怎么想', '确认专业内容、学习方式和城市生活是否愿意继续了解。'],
      ['2. 再看家庭能否接受', '逐项确认费用、校区、培养方式和特殊要求。'],
      ['3. 最后整理并分享', '生成家庭方案报告，方便和孩子、家人一起讨论。']
    ]);
    return;
  }

  if (score) {
    setText('homeTitle', `从${fmt(score)}分开始圈出可讨论专业`);
    setText('homeLead', '参考分数已经保存。接下来选择孩子愿意了解的专业方向，再结合地区、学校性质和家庭条件缩小范围。这里使用2026历史投档记录，不预测2027录取结果。');
    setText('homeActionTitle', '现在先做什么');
    setText('homeActionCopy', '先说清孩子想了解什么，再补充家庭能够接受的地区、学校类型和费用条件。');
    setPrimary('/ln-rank/', '继续专业初选');
    renderSteps([
      ['1. 说清想看什么', '选择孩子愿意继续了解的专业方向。'],
      ['2. 说明家庭条件', '确认地区、办学性质和费用范围。'],
      ['3. 加入家庭方案', '把值得继续讨论的专业放在一起，稍后统一整理。']
    ]);
    return;
  }

  setText('homeTitle', '先圈出一批值得家庭讨论的专业');
  setText('homeLead', '输入孩子的模考或预估参考分数，再结合专业方向、地区和家庭条件，用2026历史投档记录缩小范围。工具不替家庭做决定，也不把历史投档当成2027录取结论。');
  setText('homeActionTitle', '现在先做什么');
  setText('homeActionCopy', '先确认孩子目前的参考分数，再说清想看的专业方向和家庭不能接受的条件。');
  setPrimary('/ln-rank/', '开始专业初选');
  renderSteps([
    ['1. 确认孩子的位置', '输入模考或预估参考分数。'],
    ['2. 说清想要和不能接受的', '同时考虑孩子意愿和家庭条件。'],
    ['3. 圈出并逐项复核', '加入家庭方案后，再确认计划、章程、费用和校区。']
  ]);
}

function renderCountdown(now = new Date()) {
  const remaining = EXAM_START_AT.getTime() - now.getTime();
  setText('d2027', remaining <= 0 ? '0' : String(Math.ceil(remaining / 86400000)));
  setText('nowText', CLOCK_FORMATTER.format(now));
}

const release = mountCurrentRelease();
renderHomeState();
renderCountdown();
const countdownTimer = globalThis.setInterval(renderCountdown, 60000);

window.addEventListener('storage', renderHomeState);
window.addEventListener('gaokao:selection-change', renderHomeState);
window.addEventListener('lnrank-selection-pool-updated', renderHomeState);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) renderCountdown();
});

globalThis.__GAOKAO_HOME_RUNTIME__ = Object.freeze({
  version: HOME_RUNTIME_VERSION,
  generation: release.siteRuntimeGeneration,
  release: release.display,
  releaseOwner: release.resourceOwners.release,
  shellOwner: release.resourceOwners.familyShell,
  stateOwner: release.resourceOwners.familyDecisionState,
  countdownOwner: HOME_RUNTIME_VERSION,
  timer: countdownTimer
});
