import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const base = process.env.SIMULATION_REPORT_BASE_URL || 'http://127.0.0.1:4173';
const url = `${base}/ln-rank/simulation-report.html`;
const output = process.env.SIMULATION_REPORT_PDF || '/tmp/simulation-report-v002.pdf';
const extracted = '/tmp/simulation-report-v002.txt';
const studentName = '纸面核对测试学生';
const volunteers = Array.from({ length: 30 }, (_, index) => ({
  id: `test-${index + 1}`,
  order: index + 1,
  school: `测试大学${index + 1}`,
  majorCode: '080301',
  majorName: '测控技术与仪器',
  history: null,
  loading: false,
  error: '',
  manualCheck: {
    institutionCode: '',
    groupCode: '',
    campus: '',
    studyLocation: '',
    tuition: '',
    accommodationFee: '',
    planCount: '',
    studyLength: '',
    trainingMode: '',
    subjectRequirement: '',
    remark: ''
  },
  familyDecision: '',
  familyStatus: '',
  familyNote: ''
}));

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await context.newPage();
  await page.route('**/api/simulation-rank**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, available: true, score: 555, rank: 29685, rankStart: 29685, rankEnd: 29685, sameCount: 1 })
  }));
  await page.route('**/api/ai/major-history**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, records: [] })
  }));

  await page.addInitScript(({ storageKey, value }) => {
    localStorage.setItem(storageKey, JSON.stringify(value));
  }, {
    storageKey: 'gaokao:simulation-report:v002',
    value: {
      version: 2,
      studentName,
      subjectTrack: '辽宁物理类（物化生）',
      totalScore: '555',
      scores: { chinese: '', math: '', english: '', physics: '', chemistry: '', biology: '' },
      rank: null,
      volunteers
    }
  });

  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);

  const screenChecks = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    rowCount: document.querySelectorAll('#volunteerRows > tr').length,
    checkColumnHidden: getComputedStyle(document.querySelector('.col-check')).display === 'none'
  }));
  if (screenChecks.overflow !== 0) throw new Error(`PC horizontal overflow: ${screenChecks.overflow}`);
  if (screenChecks.rowCount !== 30) throw new Error(`Expected 30 volunteer rows, got ${screenChecks.rowCount}`);
  if (!screenChecks.checkColumnHidden) throw new Error('Printable check column must remain hidden on screen.');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'networkidle' });
  const mobileChecks = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    toggleCount: document.querySelectorAll('.manual-toggle').length
  }));
  if (mobileChecks.overflow !== 0) throw new Error(`Mobile horizontal overflow: ${mobileChecks.overflow}`);
  if (mobileChecks.toggleCount !== 30) throw new Error(`Expected 30 manual toggles, got ${mobileChecks.toggleCount}`);

  await page.emulateMedia({ media: 'print' });
  const printChecks = await page.evaluate(() => {
    const head = document.querySelector('.sheet-table thead');
    const studentHead = document.querySelector('.print-student-head');
    const firstCheck = document.querySelector('.print-check-block');
    return {
      theadDisplay: getComputedStyle(head).display,
      studentHeadDisplay: getComputedStyle(studentHead).display,
      checkDisplay: getComputedStyle(firstCheck).display,
      hasWaitLabel: document.body.innerText.includes('学费：待核实') || document.body.innerText.includes('校区：待核实') || document.body.innerText.includes('2026招生计划：待核实')
    };
  });
  if (printChecks.theadDisplay !== 'table-header-group') throw new Error(`Print thead display is ${printChecks.theadDisplay}`);
  if (printChecks.studentHeadDisplay !== 'table-row') throw new Error(`Print student head display is ${printChecks.studentHeadDisplay}`);
  if (printChecks.checkDisplay !== 'block') throw new Error(`Print check block display is ${printChecks.checkDisplay}`);
  if (printChecks.hasWaitLabel) throw new Error('Printable output must not contain hardcoded 待核实 labels.');

  await page.pdf({ path: output, format: 'A4', landscape: true, printBackground: true, margin: { top: '8mm', right: '8mm', bottom: '8mm', left: '8mm' } });
  const stat = await fs.stat(output);
  if (stat.size < 1000) throw new Error(`Generated PDF is unexpectedly small: ${stat.size} bytes`);

  const { stdout: pdfInfo } = await execFileAsync('pdfinfo', [output]);
  const pageMatch = pdfInfo.match(/^Pages:\s+(\d+)$/m);
  const pageCount = pageMatch ? Number(pageMatch[1]) : 0;
  if (pageCount < 2) throw new Error(`Expected 30 volunteers to span multiple pages, got ${pageCount} page(s).`);

  await execFileAsync('pdftotext', ['-layout', output, extracted]);
  const text = await fs.readFile(extracted, 'utf8');
  const pages = text.split('\f').map(value => value.trim()).filter(Boolean);
  if (pages.length < 2) throw new Error(`PDF text extraction produced ${pages.length} page(s); expected at least 2.`);
  for (const [index, pageText] of pages.entries()) {
    for (const required of [
      '辽宁物理类模拟志愿填报单',
      `姓名：${studentName}`,
      '总分：555',
      '参考位次：29,685',
      '类型：辽宁物理类（物化生）',
      '志愿',
      '学校',
      '专业（代码→中文）',
      '报考核对'
    ]) {
      if (!pageText.includes(required)) throw new Error(`PDF page ${index + 1} missing repeated header text: ${required}`);
    }
  }
  for (const forbidden of ['学费：待核实', '校区：待核实', '2026招生计划：待核实']) {
    if (text.includes(forbidden)) throw new Error(`PDF contains forbidden hardcoded placeholder: ${forbidden}`);
  }
  if (!text.includes('测试大学1') || !text.includes('测试大学30')) {
    throw new Error('PDF lost first or last volunteer row in multi-page output.');
  }

  console.log(`simulation-report-v002-browser: PASS (${stat.size} bytes PDF, ${pageCount} pages)`);
  console.log('PC 1366: no horizontal overflow, 30 rows');
  console.log('Mobile 390: no horizontal overflow, 30 manual-check controls');
  console.log('Print: A4 landscape, repeated student/header text on every extracted page');
  console.log('Print: 30 volunteers span multiple pages without hardcoded 待核实 placeholders');
} finally {
  await browser.close();
}
