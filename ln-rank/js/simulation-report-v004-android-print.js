const STORAGE_KEY = 'gaokao:simulation-report:v002';
const PRINT_PATH = '/ln-rank/simulation-report.html?print=1';

function isAndroid() {
  return /Android/i.test(navigator.userAgent || '');
}

function readState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function syncCurrentFormToStorage() {
  const stored = readState() || {};
  const studentName = document.getElementById('studentName');
  const totalScore = document.getElementById('totalScore');
  const subjectTrack = document.getElementById('subjectTrack');
  const next = {
    ...stored,
    version: 2,
    studentName: studentName?.value.trim() || '',
    totalScore: totalScore?.value.trim() || '',
    subjectTrack: subjectTrack?.value.trim() || '辽宁物理类（物化生）'
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function installFallbackStyles() {
  if (document.getElementById('android-print-fallback-style')) return;
  const style = document.createElement('style');
  style.id = 'android-print-fallback-style';
  style.textContent = `
    body.android-print-fallback { background:#fff; }
    body.android-print-fallback .screen-only { display:none !important; }
    body.android-print-fallback .print-only { display:table-row !important; }
    body.android-print-fallback .panel { border:0; box-shadow:none; border-radius:0; }
    body.android-print-fallback .table-wrap { overflow:visible; margin-top:0; }
    body.android-print-fallback .sheet-table { min-width:0; width:100%; table-layout:fixed; }
    body.android-print-fallback .sheet-table th,
    body.android-print-fallback .sheet-table td { padding:4px; }
    body.android-print-fallback .col-check { display:table-cell !important; min-width:0 !important; width:36%; }
    body.android-print-fallback .col-actions { display:none !important; }
    body.android-print-fallback .drag-handle { display:none; }
    body.android-print-fallback .school-suggestions { display:none !important; }
    body.android-print-fallback .footnote { display:none; }
    body.android-print-fallback .android-print-hint { display:block; margin:0 0 10px; padding:10px 12px; border:1px solid #d7e0dd; border-radius:10px; font-size:13px; line-height:1.45; background:#f8faf9; }
    @media print {
      body.android-print-fallback .android-print-hint { display:none !important; }
      body.android-print-fallback .print-only { display:table-row !important; }
      body.android-print-fallback .col-check { display:table-cell !important; }
    }
  `;
  document.head.appendChild(style);
}

function syncFallbackPrintMeta() {
  const state = readState();
  if (!state) return;
  const values = {
    printStudentName: state.studentName || '',
    printTotalScore: state.totalScore || '',
    printRank: Number.isFinite(Number(state.rank)) && Number(state.rank) > 0 ? Number(state.rank).toLocaleString('zh-CN') : '—',
    printSubject: state.subjectTrack || '辽宁物理类（物化生）'
  };
  Object.entries(values).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  });
  const date = document.getElementById('printDate');
  if (date) date.textContent = new Date().toLocaleDateString('zh-CN');
}

function setupFallbackPage() {
  if (!new URLSearchParams(location.search).has('print')) return false;
  installFallbackStyles();
  document.body.classList.add('android-print-fallback');
  const hint = document.createElement('p');
  hint.className = 'android-print-hint';
  hint.textContent = '这是手机打印版。若未自动出现打印窗口，请打开浏览器菜单，选择“打印”或“保存为 PDF”。';
  const tableWrap = document.querySelector('.table-wrap');
  tableWrap?.parentNode?.insertBefore(hint, tableWrap);
  syncFallbackPrintMeta();
  return true;
}

function replaceAndroidPrintButton() {
  if (!isAndroid()) return;
  const button = document.getElementById('printSheet');
  if (!button || button.dataset.androidPrintReady === '1') return;
  const replacement = button.cloneNode(true);
  replacement.dataset.androidPrintReady = '1';
  replacement.textContent = '打印 A4';
  button.replaceWith(replacement);
  replacement.addEventListener('click', () => {
    syncCurrentFormToStorage();
    const opened = window.open(PRINT_PATH, '_blank', 'noopener');
    if (!opened) {
      window.location.href = PRINT_PATH;
      return;
    }
    opened.focus?.();
  });
}

const fallbackPage = setupFallbackPage();
if (!fallbackPage) {
  replaceAndroidPrintButton();
}
