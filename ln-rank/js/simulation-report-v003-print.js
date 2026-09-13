const STORAGE_KEY = 'gaokao:simulation-report:v002';

const esc = value => String(value ?? '').replace(/[&<>\"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const clean = value => String(value ?? '').trim();
const compactText = value => clean(value).replace(/\s+/gu, ' ');
const normalizePlace = value => compactText(value).replace(/[（）()\s]/gu, '').toLowerCase();

function readRows() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return new Map((Array.isArray(parsed?.volunteers) ? parsed.volunteers : []).map(row => [String(row.id), row]));
  } catch {
    return new Map();
  }
}

function riskMessages(row) {
  const manual = row?.manualCheck || {};
  const remark = compactText(manual.remark);
  const trainingMode = compactText(manual.trainingMode);
  const combined = `${trainingMode} ${remark}`;
  const messages = [];

  if (/(中外合作|合作办学|中外|国际合作)/u.test(combined)) {
    messages.push('中外合作｜学费需重点确认');
  }

  const campus = compactText(manual.campus);
  const studyLocation = compactText(manual.studyLocation);
  const remoteHint = /(异地|多校区|分校区|分校|外地培养)/u.test(combined)
    || (campus && studyLocation && normalizePlace(campus) !== normalizePlace(studyLocation));
  if (remoteHint) messages.push('异地/多校区培养｜确认实际地点');

  const duration = compactText(manual.studyLength);
  if (duration && !/^4(?:年|年制)?$/u.test(duration)) {
    messages.push('非标准学制｜确认培养年限');
  }

  if (trainingMode && !/(普通|普通本科|普通培养)/u.test(trainingMode) && !/(中外合作|合作办学|中外|国际合作)/u.test(trainingMode)) {
    messages.push('特殊培养方式｜需确认');
  }

  return messages.slice(0, 2);
}

function familyLine(row) {
  const decision = row?.familyStatus || '';
  const note = compactText(row?.familyNote);
  const shownNote = note.length > 42 ? `${note.slice(0, 42)}…` : note;
  const marked = label => decision === label ? '☑' : '□';
  return `<span class="compact-family">处理：${marked('保留')}保留 ${marked('调整')}调整 ${marked('删除')}删除　备注：<span class="compact-note-line">${shownNote ? esc(shownNote) : '&nbsp;'}</span></span>`;
}

function renderCompactCheck(row) {
  const risks = riskMessages(row);
  const riskHtml = risks.length
    ? `<span class="compact-risk" aria-label="重点提醒">${risks.map(item => `<span class="compact-risk-item">⚠ ${esc(item)}</span>`).join('')}</span>`
    : '';
  return `<div class="compact-check-sheet">
    <div class="compact-check-line">核对：□ 代码/专业组　□ 特殊限制</div>
    ${riskHtml ? `<div class="compact-risk-line">${riskHtml}</div>` : ''}
    <div class="compact-family-line">${familyLine(row)}</div>
  </div>`;
}

function syncPrintChecks() {
  const rows = readRows();
  document.querySelectorAll('#volunteerRows > tr[data-row-id]').forEach(tr => {
    const row = rows.get(String(tr.dataset.rowId));
    const mount = tr.querySelector('.print-check-block');
    if (mount) mount.innerHTML = renderCompactCheck(row || {});
  });
  const heading = document.querySelector('.col-check');
  if (heading) heading.textContent = '核对 / 重点提醒';
}

window.addEventListener('beforeprint', syncPrintChecks);
syncPrintChecks();
