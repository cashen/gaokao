import fs from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { chromium } from 'playwright';

const execFileAsync = promisify(execFile);
const base = process.env.SIMULATION_REPORT_BASE_URL || 'http://127.0.0.1:4173';
const url = `${base}/ln-rank/simulation-report.html`;
const storageKey = 'gaokao:simulation-report:v002';
const studentName = '纸面紧凑卡测试学生';

const emptyManual = () => ({
  institutionCode: '', groupCode: '', campus: '', studyLocation: '', tuition: '',
  accommodationFee: '', planCount: '', studyLength: '', trainingMode: '',
  subjectRequirement: '', remark: ''
});

const volunteer = (id, manual = {}, status = '', note = '') => ({
  id, order: Number(id.replace(/\D/g, '')) || 1, school: `测试大学${id.replace(/\D/g, '') || '1'}`,
  majorCode: '080301', majorName: '测控技术与仪器', history: null, loading: false, error: '',
  manualCheck: { ...emptyManual(), ...manual }, familyDecision: '', familyStatus: status, familyNote: note
});

const stateFor = (rows) => ({
  version: 2, studentName, subjectTrack: '辽宁物理类（物化生）', totalScore: '555',
  scores: { chinese: '', math: '', english: '', physics: '', chemistry: '', biology: '' },
  rank: 29685, volunteers: rows
});

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await context.newPage();
  await page.route('**/api/simulation-rank**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, available: true, score: 555, rank: 29685, rankStart: 29685, rankEnd: 29685, sameCount: 1 }) }));
  await page.route('**/api/ai/major-history**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, records: [] }) }));
  await page.goto(url, { waitUntil: 'networkidle' });

  const setState = async rows => {
    await page.emulateMedia({ media: 'screen' });
    await page.evaluate(({ storageKey, value }) => localStorage.setItem(storageKey, JSON.stringify(value)), { storageKey, value: stateFor(rows) });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(150);
    await page.emulateMedia({ media: 'print' });
    await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
    await page.waitForTimeout(20);
  };

  await setState([
    volunteer('1'),
    volunteer('2', { remark: '中外合作办学项目', tuition: '32000元/年' }, '保留'),
    volunteer('3', { campus: '主校区', studyLocation: '异地校区' }),
    volunteer('4', { studyLength: '5年' }),
    volunteer('5', { trainingMode: '特殊培养项目' }, '调整', '需与招生章程再次确认培养安排')
  ]);

  const checks = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#volunteerRows > tr')];
    return {
      rowCount: rows.length,
      header: document.querySelector('.col-check')?.textContent.trim() || '',
      cards: rows.map(row => ({ id: row.dataset.rowId, text: row.querySelector('.print-check-block')?.innerText || '', fieldCount: row.querySelectorAll('.print-field').length, riskCount: row.querySelectorAll('.compact-risk-item').length })),
      widths: {
        order: getComputedStyle(document.querySelector('.col-order')).width,
        school: getComputedStyle(document.querySelector('.col-school')).width,
        major: getComputedStyle(document.querySelector('.col-major')).width,
        check: getComputedStyle(document.querySelector('.col-check')).width
      },
      hasLegacyWaitLabel: document.body.innerText.includes('学费：待核实') || document.body.innerText.includes('校区：待核实')
    };
  });

  if (checks.rowCount !== 5) throw new Error(`Expected 5 rows, got ${checks.rowCount}`);
  if (checks.header !== '核对 / 重点提醒') throw new Error(`Unexpected print check heading: ${checks.header}`);
  if (checks.hasLegacyWaitLabel) throw new Error('Legacy 待核实 placeholder leaked into print DOM.');
  if (checks.cards.some(card => card.fieldCount !== 0)) throw new Error('Legacy vertical print fields still exist in compact card DOM.');
  if (!checks.cards[0].text.includes('核对：□ 代码/专业组　□ 特殊限制')) throw new Error('Ordinary card missing fixed compact checks.');
  if (checks.cards[0].text.includes('学费') || checks.cards[0].text.includes('校区') || checks.cards[0].text.includes('学制')) throw new Error('Ordinary card contains low-value fixed fields.');
  if (!checks.cards[1].text.includes('中外合作') || !checks.cards[1].text.includes('学费需重点确认')) throw new Error('Sino-foreign card missing conditional fee reminder.');
  if (!checks.cards[2].text.includes('异地/多校区培养')) throw new Error('Remote-campus card missing conditional location reminder.');
  if (!checks.cards[3].text.includes('非标准学制')) throw new Error('Non-standard duration card missing reminder.');
  if (!checks.cards[4].text.includes('特殊培养方式')) throw new Error('Special training card missing reminder.');
  if (!checks.cards[4].text.includes('□保留 □调整 □删除')) throw new Error('Family handling line missing.');

  const multiRisk = volunteer('6', {
    remark: '中外合作办学 + 异地培养 + 额外说明',
    studyLength: '5年',
    trainingMode: '中外合作'
  });
  await setState([multiRisk]);
  const multiRiskCheck = await page.evaluate(() => {
    const card = document.querySelector('.print-check-block');
    return {
      riskCount: card?.querySelectorAll('.compact-risk-item').length || 0,
      text: card?.innerText || ''
    };
  });
  if (multiRiskCheck.riskCount > 2) throw new Error(`Expected at most 2 compact risk items, got ${multiRiskCheck.riskCount}`);

  const setCount = async count => {
    await setState(Array.from({ length: count }, (_, index) => volunteer(String(index + 1))));
    const output = `/tmp/simulation-report-v003-${count}.pdf`;
    await page.pdf({ path: output, format: 'A4', landscape: true, printBackground: true, margin: { top: '8mm', right: '8mm', bottom: '8mm', left: '8mm' } });
    const { stdout } = await execFileAsync('pdfinfo', [output]);
    const pages = Number(stdout.match(/^Pages:\s+(\d+)$/m)?.[1] || 0);
    const textPath = `/tmp/simulation-report-v003-${count}.txt`;
    await execFileAsync('pdftotext', ['-layout', output, textPath]);
    const text = await fs.readFile(textPath, 'utf8');
    if (!pages) throw new Error(`${count} volunteers produced no PDF pages`);
    if ((text.match(/辽宁物理类模拟志愿填报单/g) || []).length < pages) throw new Error(`Repeated student header missing on ${count}-volunteer PDF`);
    if (!text.includes('志愿') || !text.includes('学校') || !text.includes('专业（代码→中文）') || !text.includes('核对 / 重点提醒')) throw new Error(`Compact print header missing for ${count} volunteers`);
    if (text.includes('学费：待核实') || text.includes('校区：待核实') || text.includes('2026招生计划：待核实')) throw new Error(`Forbidden placeholder leaked for ${count} volunteers`);
    if (count === 30 && pages < 2) throw new Error('30 volunteers should span multiple pages');
    console.log(`compact print boundary ${count}: PASS (${pages} pages)`);
  };

  for (const count of [1, 5, 10, 20, 30]) await setCount(count);

  for (const [width, height] of [[820, 900], [390, 844], [360, 780]]) {
    await page.emulateMedia({ media: 'screen' });
    await page.setViewportSize({ width, height });
    await page.reload({ waitUntil: 'networkidle' });
    const responsive = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, toggleCount: document.querySelectorAll('.manual-toggle').length }));
    if (responsive.overflow !== 0) throw new Error(`Screen horizontal overflow at ${width}px: ${responsive.overflow}`);
    if (responsive.toggleCount !== 30) throw new Error(`Expected 30 screen toggles at ${width}px, got ${responsive.toggleCount}`);
  }

  console.log('simulation-report-v003-compact-paper: PASS');
  console.log('Ordinary card: fixed checks only, no low-value fixed fields');
  console.log('Risk card: conditional fee/location/duration/training reminders, max 2');
  console.log('Family action: keep / adjust / delete + one-line note');
  console.log('Print boundaries: 1 / 5 / 10 / 20 / 30 volunteers');
  console.log('Responsive: PC 1366 / Pad 820 / Android 390 / Android 360');
} finally {
  await browser.close();
}
