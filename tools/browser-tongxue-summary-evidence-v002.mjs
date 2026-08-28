import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.V3965_BASE_URL || 'http://127.0.0.1:8765';
const viewports = [
  { name:'pc-1366', viewport:{ width:1366, height:768 } },
  { name:'pad-820', viewport:{ width:820, height:1180 }, hasTouch:true },
  { name:'android-390', viewport:{ width:390, height:844 }, hasTouch:true, isMobile:true }
];

const payload = {
  ok:true,
  mode:'ai_summary',
  scope:'school',
  topic:'general',
  school:'沈阳建筑大学',
  summary:'学生评论中常提到课程实验、住宿生活、就业准备和考研氛围。不同学生体验存在差异，建议结合原始评论逐条核对。',
  studentEvidence:[
    {
      id:101,
      content:'电气专业实验和课程设计比较多，大三开始项目明显增加。',
      category:'course', categoryLabel:'课程学习', reason:'这条反馈用于补充课程学习的真实体验，并包含具体经历或条件。',
      authorLabel:'实验同学', createdAt:'2026-05-02T10:00:00+08:00', likes:5, replies:1,
      sourceUrl:'https://eo.srgaoxiao.cn/school/test?review=101', evidenceScope:'school', schoolSourceId:27032
    },
    {
      id:102,
      content:'宿舍条件一般，不过食堂选择多，校园生活整体还算方便。',
      category:'campus_life', categoryLabel:'校园生活', reason:'这条反馈用于补充校园生活的真实体验，并包含具体经历或条件。',
      authorLabel:'生活同学', createdAt:'2026-05-05T10:00:00+08:00',
      sourceUrl:'https://eo.srgaoxiao.cn/school/test?review=102', evidenceScope:'school', schoolSourceId:27032
    },
    {
      id:103,
      content:'就业方向比较明确，实习和校招需要自己主动准备。',
      category:'employment', categoryLabel:'就业发展', reason:'这条反馈用于补充就业发展的真实体验，并包含具体经历或条件。',
      authorLabel:'就业同学', createdAt:'2026-05-10T10:00:00+08:00', likes:8,
      sourceUrl:'https://eo.srgaoxiao.cn/school/test?review=103', evidenceScope:'school', schoolSourceId:27032
    }
  ],
  schoolMeta:{ id:27032, name:'沈阳建筑大学', province:'辽宁省', city:'沈阳市', type:'普通本科', reviewCount:36 },
  fetchedAt:'2026-08-23T12:00:00.000Z',
  transport:'来源评论摘要 + 学生证据 · 测试镜像',
  evidence:{ type:'student_voice', scope:'school', topic:'general', matchCount:3, sampleLevel:'source_summary', scannedCount:6, scannedPages:1, exhaustive:false, sourceSummary:true, officialFact:false, rankingInput:false, recommendationScoreInput:false, verificationWeight:'none', disagreementPolicy:'preserve_not_average' },
  source:{ id:'srgaoxiao', name:'神人高校网', url:'https://eo.srgaoxiao.cn/school/test' },
  version:'v1.4.1'
};

const browser = await chromium.launch({ headless:true });
const results = [];
try {
  for (const testCase of viewports) {
    const context = await browser.newContext({
      viewport:testCase.viewport,
      hasTouch:Boolean(testCase.hasTouch),
      isMobile:Boolean(testCase.isMobile),
      deviceScaleFactor:1
    });
    await context.route('**/api/tongxue-summary**', route => route.fulfill({
      status:200,
      contentType:'application/json; charset=utf-8',
      body:JSON.stringify(payload)
    }));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(String(error?.stack || error)));
    await page.goto(`${baseUrl}/tongxue/?school=${encodeURIComponent('沈阳建筑大学')}`, { waitUntil:'networkidle', timeout:60000 });
    await page.waitForFunction(() => document.getElementById('result')?.dataset.viewState === 'success', null, { timeout:20000 });

    const text = await page.locator('#result').textContent();
    assert.match(text, /大家主要在说什么/);
    assert.match(text, /这些概括从哪来/);
    assert.match(text, /几条有代表性的学生留言/);
    assert.doesNotMatch(text, /AI总结/);
    assert.doesNotMatch(text, /为什么这么判断/);
    assert.match(text, /课程学习/);
    assert.match(text, /校园生活/);
    assert.match(text, /就业发展/);
    assert.equal(await page.locator('[data-summary-evidence-explanation]').count(), 1);
    assert.equal(await page.locator('[data-student-evidence-grid] .review-card').count(), 3);
    assert.equal(await page.locator('[data-summary-evidence-empty]').count(), 0);

    const geometry = await page.evaluate(() => ({
      overflow:document.documentElement.scrollWidth - document.documentElement.clientWidth,
      resultWidth:document.getElementById('result')?.getBoundingClientRect().width || 0,
      viewportWidth:window.innerWidth
    }));
    assert.ok(geometry.overflow <= 1, `${testCase.name}: horizontal overflow ${geometry.overflow}`);
    assert.ok(geometry.resultWidth <= geometry.viewportWidth + 1, `${testCase.name}: result exceeds viewport`);
    assert.deepEqual(errors, []);
    results.push({ name:testCase.name, evidenceCards:3, overflow:geometry.overflow });
    await context.close();
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({ ok:true, humanCopy:true, results }, null, 2));
