import {
  readFamilyCandidateScore,
  readFamilySelectionItems,
  countFamilyPendingItems,
  resolveFamilyNextAction
} from '../domain/family-decision-contract.v3955_0.js?v=3955_0';

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
  root.innerHTML = lines.map(([title, detail]) => `<div><b>${title}</b><span>${detail}</span></div>`).join('');
}

function pendingSummary(items) {
  const fee = items.filter(item => item.isSinoForeign || item.isHighFee || /中外|高收费|学费|费用/.test([item.major,item.school,item.tuition,item.matchReason,...(item.flags||[])].join(' '))).length;
  const campus = items.filter(item => /校区|分校/.test([item.school,item.geoEntity,item.displayLocation].join(' '))).length;
  const parts = [];
  if (fee) parts.push(`${fmt(fee)}个需要确认费用或培养方式`);
  if (campus) parts.push(`${fmt(campus)}个涉及校区或分校`);
  return parts.slice(0, 2).join('，');
}

function render() {
  const score = readFamilyCandidateScore();
  const items = readFamilySelectionItems();
  const selectedCount = items.length;
  const pendingCount = countFamilyPendingItems(items);
  const next = resolveFamilyNextAction({ score, items });
  document.body.dataset.homeState = selectedCount ? 'returning' : score ? 'score-ready' : 'new';

  if (selectedCount) {
    setText('homeTitle', '继续检查当前家庭方案');
    setText('homeLead', `当前参考分数${score ? `${fmt(score)}分` : '尚未确认'}，已经选了${fmt(selectedCount)}个专业，其中${fmt(pendingCount)}个还需要继续确认。历史数据只帮助家庭缩小范围，最后仍要核对2027招生计划、章程、校区、学费、体检要求和孩子真实意愿。`);
    setText('homeActionTitle', '下一步先做什么');
    const detail = pendingSummary(items);
    setText('homeActionCopy', detail ? `${detail}。先让孩子确认是否接受专业内容，再由家长确认费用、校区和培养方式。` : '当前已选专业暂未发现明显费用或特殊项目提醒，可以继续检查专业方向和城市是否过于集中。');
    setPrimary(next.href, '继续检查家庭方案');
    renderSteps([
      ['1. 先看孩子是否接受', '确认专业内容、学习方式和城市生活是否能接受。'],
      ['2. 再看家庭能否承担', '逐项确认学费、校区、培养方式和特殊要求。'],
      ['3. 最后保存复核结果', '生成家庭复核报告，等2027官方资料公布后再核对。']
    ]);
    return;
  }

  if (score) {
    setText('homeTitle', `从${fmt(score)}分开始圈出可讨论专业`);
    setText('homeLead', '先选择孩子想了解的专业方向，再结合地区、学校性质和家庭条件缩小范围。这里使用2026历史投档记录，不预测2027录取结果。');
    setText('homeActionTitle', '现在先做什么');
    setText('homeActionCopy', '参考分数已经保存，下一步选择专业方向和家庭能够接受的地区、学校类型。');
    setPrimary('/ln-rank/', '继续专业初选');
    renderSteps([
      ['1. 说清想看什么', '选择孩子愿意继续了解的专业方向。'],
      ['2. 说明家庭条件', '确认地区、办学性质和费用范围。'],
      ['3. 圈出可讨论专业', '把孩子和家庭都能继续讨论的专业加入已选。']
    ]);
    return;
  }

  setText('homeTitle', '先圈出一批可以讨论的专业');
  setText('homeLead', '输入孩子的模考或预估参考分数，再结合专业方向、地区和家庭条件，用2026历史投档记录缩小范围。工具不替家庭做决定，也不把历史投档当成2027录取结论。');
  setText('homeActionTitle', '现在先做什么');
  setText('homeActionCopy', '先确认孩子目前的参考分数，再说清想看的专业方向和家庭不能接受的条件。');
  setPrimary('/ln-rank/', '开始专业初选');
  renderSteps([
    ['1. 确认孩子的位置', '输入模考或预估参考分数。'],
    ['2. 说清想要和不能接受的', '同时考虑孩子意愿和家庭条件。'],
    ['3. 圈出并逐项复核', '保留可讨论专业，再确认计划、章程和费用。']
  ]);
}

render();
window.addEventListener('storage', render);
window.addEventListener('lnrank-selection-pool-updated', render);
