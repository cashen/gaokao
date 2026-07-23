from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def path(rel: str) -> Path:
    return ROOT / rel


def read(rel: str) -> str:
    return path(rel).read_text(encoding='utf-8')


def write(rel: str, value: str) -> None:
    target = path(rel)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(value, encoding='utf-8')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected exactly one occurrence, got {count}')
    return text.replace(old, new, 1)


def regex_once(text: str, pattern: str, replacement: str, label: str, flags: int = 0) -> str:
    output, count = re.subn(pattern, lambda _match: replacement, text, count=1, flags=flags)
    if count != 1:
        raise RuntimeError(f'{label}: expected exactly one regex match, got {count}')
    return output


def update_json(rel: str, mutate) -> None:
    data = json.loads(read(rel))
    mutate(data)
    write(rel, json.dumps(data, ensure_ascii=False, indent=2) + '\n')


# 1. Tongxue direct handoff activation.
page = read('tongxue/index.html')
page = replace_once(page, 'tongxue-v154-changelog-20260721', 'tongxue-v155-direct-handoff-20260723', 'tongxue build')
page = replace_once(page, 'aria-describedby="indexStatus" autofocus>', 'aria-describedby="indexStatus">', 'tongxue autofocus')
page = replace_once(page, './app/tongxue-performance-v154.js?v=154', './app/tongxue-performance-v155.js?v=155', 'tongxue entry')
page = replace_once(page, '同学你好 v1.5.4 · 更新于 2026-07-21', '同学你好 v1.5.5 · 更新于 2026-07-23', 'tongxue footer')
write('tongxue/index.html', page)

changelog = read('tongxue/changelog.html')
old_release = '<article class="release"><div class="release-head"><div><span class="badge">当前版本</span><h2>v1.5.4</h2></div><time class="date">2026-07-21</time></div><p class="release-note">为了美好修改了若干bug</p></article>'
new_release = '<article class="release"><div class="release-head"><div><span class="badge">当前版本</span><h2>v1.5.5</h2></div><time class="date">2026-07-23</time></div><p class="release-note">从专业卡进入时，学校名称明确会自动查询并直接展示结果；存在歧义时仍会请用户确认。</p></article>\n    <article class="release"><div class="release-head"><h2>v1.5.4</h2><time class="date">2026-07-21</time></div><p class="release-note">为了美好修改了若干bug</p></article>'
changelog = replace_once(changelog, old_release, new_release, 'tongxue changelog')
write('tongxue/changelog.html', changelog)

headers = read('_headers')
if '/tongxue/app/tongxue-performance-v155.js' not in headers:
    headers += '\n/tongxue/app/tongxue-performance-v155.js\n  Cache-Control: public, max-age=31536000, immutable\n/tongxue/app/tongxue-direct-handoff-v155.js\n  Cache-Control: public, max-age=31536000, immutable\n'
write('_headers', headers)

# 2. Active app bridges. Keep old core files, but route their report imports through v3956 modules.
app_core = read('ln-rank/js/app.v3951_0.js')
app_core = replace_once(app_core, "from './feature/feishu/index.js?v=3951_0';", "from './feature/feishu/index.v3956_0.js?v=3956_0';", 'main Feishu index')
app_core = replace_once(app_core, "from './feature/selection-pool/index.js?v=3951_0';", "from './feature/selection-pool/index.v3956_0.js?v=3956_0';", 'main selection index')
write('ln-rank/js/app.v3951_0.js', app_core)

pool_core = read('ln-rank/js/selection-pool.v3951_0.js')
pool_core = pool_core.replace("from './feature/selection-pool/index.js?v=3951_0';", "from './feature/selection-pool/index.v3956_0.js?v=3956_0';")
if "index.v3956_0.js?v=3956_0" not in pool_core:
    raise RuntimeError('selection pool v3956 index was not applied')
write('ln-rank/js/selection-pool.v3951_0.js', pool_core)

app_wrapper = read('ln-rank/js/app.v3955_0.js')
app_wrapper = replace_once(app_wrapper, "await import('./app.v3951_0.js?v=3951_0');", "await import('./app.v3951_0.js?v=3956_0');", 'main core query')
app_wrapper = app_wrapper.replace('v3955_0', 'v3956_0')
write('ln-rank/js/app.v3956_0.js', app_wrapper)
write('ln-rank/js/selection-pool.v3956_0.js', "await import('./selection-pool.v3951_0.js?v=3956_0');\n")

# 3. Central Feishu server routes.
write('functions/api/feishu-create-report.js', """import { buildFeishuReport } from '../_lib/feishu-report-builder.js';
import { buildReportDataV3956 } from '../_lib/report-data-service-v3956.js';
import { createFeishuReportResponse } from '../_lib/feishu-report-service.js';
import { FEISHU_REPORT_CONTRACT } from '../../shared/resources/reports/feishu-report-contract.js';

export function onRequest(context) {
  return createFeishuReportResponse(context, async (input, runtime) => {
    const data = await buildReportDataV3956(runtime.context.request, runtime.env, input);
    return {
      ...buildFeishuReport(data),
      reportType: FEISHU_REPORT_CONTRACT.currentBandReportType,
      dataYear: FEISHU_REPORT_CONTRACT.dataYear,
      audienceYear: FEISHU_REPORT_CONTRACT.audienceYear
    };
  }, FEISHU_REPORT_CONTRACT);
}
""")
write('functions/api/feishu-create-selection-pool-report.js', """import { buildSelectionPoolFeishuReport } from '../_lib/feishu-selection-pool-report-builder.js';
import { createFeishuReportResponse } from '../_lib/feishu-report-service.js';
import { FEISHU_REPORT_CONTRACT, normalizeSelectionPoolReportType } from '../../shared/resources/reports/feishu-report-contract.js';

export function onRequest(context) {
  return createFeishuReportResponse(context, async input => ({
    ...buildSelectionPoolFeishuReport({ ...input, reportType: normalizeSelectionPoolReportType(input.reportType) }),
    dataYear: FEISHU_REPORT_CONTRACT.dataYear,
    audienceYear: FEISHU_REPORT_CONTRACT.audienceYear
  }), FEISHU_REPORT_CONTRACT);
}
""")
write('functions/api/feishu-report-health.js', """import { FEISHU_REPORT_CONTRACT, FEISHU_REPORT_ROUTES } from '../../shared/resources/reports/feishu-report-contract.js';
import { feishuJson } from '../_lib/feishu-report-service.js';

export function onRequest(context) {
  const env = context.env || {};
  const hasSecret = name => Boolean(String(env[name] || '').trim());
  return feishuJson({
    ok: true,
    version: FEISHU_REPORT_CONTRACT.releaseVersion,
    dataYear: FEISHU_REPORT_CONTRACT.dataYear,
    audienceYear: FEISHU_REPORT_CONTRACT.audienceYear,
    routes: FEISHU_REPORT_ROUTES,
    env: {
      FEISHU_APP_ID: hasSecret('FEISHU_APP_ID'),
      FEISHU_APP_SECRET: hasSecret('FEISHU_APP_SECRET'),
      FEISHU_DOC_HOST: hasSecret('FEISHU_DOC_HOST')
    },
    message: '飞书报告 Functions 路由和共享合同已加载。真实文档创建仍需有效的飞书应用凭据。'
  });
}
""")

# 4. Current-band Feishu report: 2026 is primary; region labels use the shared catalog.
report = read('functions/_lib/feishu-report-builder.js')
if "shared/resources/geo/china-region-catalog.js" not in report:
    report = report.replace("import { getCampusForItem, getCampusReviewSummaryForItems, formatCampusReviewLine } from './kb/campus-accessor.js';", "import { getCampusForItem, getCampusReviewSummaryForItems, formatCampusReviewLine } from './kb/campus-accessor.js';\nimport { getRegionLabel } from '../../shared/resources/geo/china-region-catalog.js';\nimport { FEISHU_REPORT_CONTRACT } from '../../shared/resources/reports/feishu-report-contract.js';")
report = regex_once(report, r"\nconst REGION_LABELS = \{[\s\S]*?\n\};\n", "\n", 'remove region labels')
report = replace_once(report, 'const region = REGION_LABELS[filters.region] || "不限";', 'const region = getRegionLabel(filters.region);', 'shared region label')
report = regex_once(report, r"function historyText\(record\) \{[\s\S]*?\n\}\n\nfunction locationText", """function historyText(record) {
  const rows = [];
  if (record.score2025 != null || record.rank2025 != null) rows.push(`2025：${record.score2025 != null ? fmt(record.score2025) + ' 分' : '分数待核验'} / ${record.rank2025 != null ? fmt(record.rank2025) + ' 位' : '位次待核验'}`);
  if (record.score2024 != null || record.rank2024 != null) rows.push(`2024：${record.score2024 != null ? fmt(record.score2024) + ' 分' : '分数待核验'} / ${record.rank2024 != null ? fmt(record.rank2024) + ' 位' : '位次待核验'}`);
  const trend = record?.historyCompare?.rankTrendText ? `｜${record.historyCompare.rankTrendText}` : '';
  return rows.length ? `历史同口径参考：${rows.join('；')}${trend}` : '历史同口径参考：暂无';
}

function locationText""", 'current report history')
report = replace_once(report, 'lines.push(`- 2025最低分：${fmt(record.score2025 ?? record.score)} 分`);', 'lines.push(`- 2026最低投档分：${fmt(record.score2026 ?? record.score)} 分`);', 'current report score')
report = replace_once(report, 'lines.push(`- 2025最低位次：${fmt(record.rank2025 ?? record.rank)}`);', 'lines.push(`- 2026最低投档位次：${fmt(record.rank2026 ?? record.rank)}`);', 'current report rank')
report = replace_once(report, "    rangeText: band.rangeText\n  };", "    rangeText: band.rangeText,\n    reportType: FEISHU_REPORT_CONTRACT.currentBandReportType,\n    dataYear: FEISHU_REPORT_CONTRACT.dataYear,\n    audienceYear: FEISHU_REPORT_CONTRACT.audienceYear\n  };", 'current report metadata')
write('functions/_lib/feishu-report-builder.js', report)

# 5. Selection-pool Feishu report: 2026 primary and 2027 verification boundary.
selection_report = read('functions/_lib/feishu-selection-pool-report-builder.js')
if "feishu-report-contract.js" not in selection_report:
    selection_report = selection_report.replace("import { LN_RANK_RELEASE_CONTRACT } from './release-contract.js';", "import { FEISHU_REPORT_CONTRACT } from '../../shared/resources/reports/feishu-report-contract.js';")
selection_report = replace_once(selection_report, "lines.push(`- 2025最低分：${Number.isFinite(Number(item.score2025)) ? fmt(item.score2025) : '分数待核验'}`);", "lines.push(`- 2026最低投档分：${Number.isFinite(Number(item.score2026)) ? fmt(item.score2026) : '分数待核验'}`);", 'selection score')
selection_report = replace_once(selection_report, "lines.push(`- 2025最低位次：${Number.isFinite(Number(item.rank2025)) ? fmt(item.rank2025) : '位次待核验'}`);", "lines.push(`- 2026最低投档位次：${Number.isFinite(Number(item.rank2026)) ? fmt(item.rank2026) : '位次待核验'}`);", 'selection rank')
selection_report = selection_report.replace('核验 2026 招生计划', '核验 2027 招生计划').replace('和 2026 招生计划人工核验', '和 2027 招生计划人工核验')
selection_report = selection_report.replace('version: LN_RANK_RELEASE_CONTRACT.display', 'version: FEISHU_REPORT_CONTRACT.releaseVersion')
selection_report = selection_report.replace('assetVersion: LN_RANK_RELEASE_CONTRACT.assetVersion', 'assetVersion: FEISHU_REPORT_CONTRACT.assetVersion')
selection_report = selection_report.replace('release: LN_RANK_RELEASE_CONTRACT.release', 'release: FEISHU_REPORT_CONTRACT.releaseName')
selection_report = replace_once(selection_report, '    summary,\n    styledBlocks:', '    summary,\n    dataYear: FEISHU_REPORT_CONTRACT.dataYear,\n    audienceYear: FEISHU_REPORT_CONTRACT.audienceYear,\n    styledBlocks:', 'selection report metadata')
write('functions/_lib/feishu-selection-pool-report-builder.js', selection_report)

# 6. Three-flow server self-check with 2026 primary fields.
self_api = read('functions/api/ln-rank-self-check.js')
if "feishu-report-contract.js" not in self_api:
    self_api = self_api.replace("import { LN_RANK_RELEASE_CONTRACT } from '../_lib/release-contract.js';", "import { LN_RANK_RELEASE_CONTRACT } from '../_lib/release-contract.js';\nimport { FEISHU_REPORT_CONTRACT } from '../../shared/resources/reports/feishu-report-contract.js';")
self_report_smoke = r"""function reportSmoke() {
  const rec = {
    school: '测试大学', major: '电气工程及其自动化',
    score2026: 520, rank2026: 40000, score2025: 515, rank2025: 41500, score2024: 510, rank2024: 43000,
    scoreDelta2026: 0, scoreDelta: 0, statusLabel: '主要参考', position: '主要参考', matchLabel: '精准匹配',
    matchReason: '专业名称直接包含该词',
    standardMajor: { code: '080601', name: '电气工程及其自动化', categoryCode: '0806', categoryName: '电气类', mappingStatus: 'exact' }
  };
  const current = buildFeishuReport({
    candidateScore: 520,
    selectedBand: { key: 'near', title: '主要参考', rangeText: '510-520 分' },
    filters: { region: 'all', majorKeyword: '电气', bottomLineMode: 'all' },
    dataScope: '辽宁2026物理类', counts: { upper: 1, near: 1, steady: 1, total: 3 },
    selectedRecords: [rec], rangePreset: 'standard', keywordQuery: { rawKeywords: ['电气'] }, matchSummary: { exact: 1 }
  });
  const list = buildSelectionPoolFeishuReport({ candidateScore: 520, items: [rec], reportType: 'selectionPoolOnly' });
  const analyzed = buildSelectionPoolFeishuReport({ candidateScore: 520, items: [rec], reportType: 'selectionPoolWithAnalysis', analysis: { summary: '整体可以作为重点核验', stats: { total: 1, rushCount: 0, stableCount: 1, safeCount: 0 }, aiNarrative: { overall: '整体可以作为重点核验', structureDiagnosis: '专业结构待补充', actions: ['建议补充后段专业'] } } });
  const styled = buildSelectionPoolStyledBlocks({ title: '测试报告', candidateScore: 520, items: [rec], stats: { total: 1 }, summary: analyzed.summary, hasAnalysis: false });
  const requiredSections = (LN_RANK_RELEASE_CONTRACT.reportSections || []).map(x => `## ${x}`);
  const out = [];
  for (const [name, report] of [['当前区间报告', current], ['已选专业清单', list], ['带解读报告', analyzed]]) {
    const text = report.markdown || '';
    const errors = [];
    if (text.length < 200) errors.push('正文过短');
    if (!text.includes('2026最低投档')) errors.push('缺少2026主投档字段');
    if (!text.includes('2025') || !text.includes('2024')) errors.push('缺少2025/2024历史对照');
    if (!text.includes('专业代码')) errors.push('缺少专业代码');
    if (FORBIDDEN.test(text)) errors.push('出现工程词');
    if (name !== '当前区间报告') {
      const h2 = text.split(/\n+/).filter(line => /^##\s+/.test(line)).map(line => line.trim());
      if (h2.length != requiredSections.length || !requiredSections.every((section, index) => h2[index] === section)) errors.push(`报告二级标题必须固定六段，实际：${h2.join('｜') || '未识别'}`);
      if (report.version !== FEISHU_REPORT_CONTRACT.releaseVersion) errors.push(`报告版本未同步：${report.version}`);
    }
    out.push({ name, ok: errors.length === 0, errors, length: text.length, reportType: report.reportType || 'currentBand' });
  }
  out.push({ name: '复制文字版/样式块', ok: Array.isArray(styled) && styled.length > 5, errors: Array.isArray(styled) && styled.length > 5 ? [] : ['样式块为空'], length: Array.isArray(styled) ? styled.length : 0 });
  return out;
}
"""
self_api = regex_once(self_api, r"function reportSmoke\(\) \{[\s\S]*?\n\}\n\nexport async function onRequest", self_report_smoke + '\nexport async function onRequest', 'self-check report smoke')
self_api = self_api.replace('version: LN_RANK_RELEASE_CONTRACT.display, assetVersion: LN_RANK_RELEASE_CONTRACT.assetVersion, release: LN_RANK_RELEASE_CONTRACT.release', 'version: FEISHU_REPORT_CONTRACT.releaseVersion, assetVersion: FEISHU_REPORT_CONTRACT.assetVersion, release: FEISHU_REPORT_CONTRACT.releaseName')
write('functions/api/ln-rank-self-check.js', self_api)

# 7. Visible versions and active entry points.
for rel in ('ln-rank/index.html', 'ln-rank/selection-pool.html'):
    source = read(rel).replace('v3.9.55.0', 'v3.9.56.0')
    source = source.replace('?v=3955_0', '?v=3956_0')
    if rel.endswith('index.html'):
        source = source.replace('/ln-rank/js/app.v3955_0.js?v=3956_0', '/ln-rank/js/app.v3956_0.js?v=3956_0')
    else:
        source = source.replace('/ln-rank/js/selection-pool.v3951_0.js?v=3956_0', '/ln-rank/js/selection-pool.v3956_0.js?v=3956_0')
    write(rel, source)

self_html = read('ln-rank/self-check.html')
self_html = self_html.replace('v3.9.49.4', 'v3.9.56.0').replace('v3949_0', 'v3956_0').replace('3949_4', '3956_0')
self_html = self_html.replace('/ln-rank/js/self-check.v3956_0.js?v=3956_0', '/ln-rank/js/self-check.v3956_0.js?v=3956_0')
write('ln-rank/self-check.html', self_html)
write('ln-rank/js/self-check.v3956_0.js', r"""const VERSION='v3.9.56.0';
const ASSET='v3956_0';
const $=id=>document.getElementById(id);
const row=(name,ok,detail='')=>({name,ok,detail});
async function json(path){const response=await fetch(path,{cache:'no-store'});const text=await response.text();let data={};try{data=JSON.parse(text||'{}');}catch{throw new Error(`${path} 返回的不是 JSON`);}if(!response.ok)throw new Error(data.message||`${path} HTTP ${response.status}`);return data;}
function renderList(id,items){const root=$(id);if(!root)return;root.innerHTML=items.map(item=>`<div class="self-check-row ${item.ok?'is-ok':'is-bad'}"><b>${item.ok?'✅':'❌'} ${item.name}</b><p>${item.detail||''}</p></div>`).join('')||'<div class="self-check-row">暂无结果</div>';}
function overall(items){const bad=items.filter(item=>!item.ok);const badge=$('overallBadge');badge.className=`status ${bad.length?'bad':'ok'}`;badge.textContent=bad.length?`未通过 ${bad.length} 项`:'自测通过';$('errors').textContent=bad.length?bad.map(item=>`${item.name}: ${item.detail}`).join('\n'):'暂无。';}
async function main(){const checks=[];try{const [active,release,health,self]=await Promise.all([json('/ln-rank/active-assets.json?v=3956_0'),json('/ln-rank/release-meta.json?v=3956_0'),json('/api/feishu-report-health'),json('/api/ln-rank-self-check?v=3956_0')]);checks.push(row('活动资源版本',active.version===VERSION&&active.assetVersion===ASSET,`${active.version} / ${active.assetVersion}`));checks.push(row('发布合同版本',release.version===VERSION&&release.assetVersion===ASSET,`${release.version} / ${release.assetVersion}`));checks.push(row('飞书共享路由',health.ok&&health.dataYear===2026&&health.routes?.currentBand&&health.routes?.selectionPool,JSON.stringify(health.routes||{})));checks.push(row('三处报告构建',self.ok&&Array.isArray(self.reports)&&self.reports.filter(item=>item.name!=='复制文字版/样式块').length===3,(self.reports||[]).map(item=>`${item.name}:${item.ok?'通过':'失败'}`).join('｜')));renderList('reports',(self.reports||[]).map(item=>row(item.name,Boolean(item.ok),(item.errors||[]).join('；')||`长度 ${item.length||0}`)));renderList('cases',(self.cases||[]).map(item=>row(item.input||item.name,Boolean(item.ok),(item.errors||[]).join('；')||'通过')));renderList('uiChecks',(self.uiChecks||[]).map(item=>row(item.name,Boolean(item.ok),item.detail||'')));$('versionBox').textContent=`${active.version} / ${active.assetVersion} / ${release.releaseName||release.release||''}`;}catch(error){checks.push(row('自测执行',false,error?.message||String(error)));}overall(checks);}
document.addEventListener('DOMContentLoaded',()=>$('runSelfCheck')?.addEventListener('click',main));
""")

# 8. Shared resource registry and release metadata.
registry = read('shared/resources/resource-registry.js').replace("'v3955_0'", "'v3956_0'", 1)
if 'reports:' not in registry:
    registry = registry.replace("  schools: Object.freeze({", "  reports: Object.freeze({\n    id: 'feishu-report-contract',\n    module: '/shared/resources/reports/feishu-report-contract.js',\n    policy: 'single-source-contract-and-client',\n    consumers: Object.freeze(['ln-rank-browser', 'functions-api', 'self-check'])\n  }),\n  schools: Object.freeze({")
write('shared/resources/resource-registry.js', registry)


def mutate_active(data):
    data['version'] = 'v3.9.56.0'
    data['assetVersion'] = 'v3956_0'
    data['releaseGate'] = 'tongxue-direct-handoff, feishu-three-entry-2026, shared-report-resource, active-runtime-audit, protected-fenxi-runtime-unchanged'
    data['runtimeCacheQueryVersion'] = 'v3956_0'
    data['sharedResourceCenterVersion'] = 'v3956_0'
    data['mainJs'] = 'js/app.v3956_0.js'
    data['selectionPoolJs'] = 'js/selection-pool.v3956_0.js'
    entries = data.get('jsEntry', [])
    entries = ['js/app.v3956_0.js' if item == 'js/app.v3955_0.js' else item for item in entries]
    entries = ['js/selection-pool.v3956_0.js' if item == 'js/selection-pool.v3951_0.js' else item for item in entries]
    entries = ['js/self-check.v3956_0.js' if item == 'js/self-check.v3949_0.js' else item for item in entries]
    for item in ['js/feature/feishu/report-api.v3956_0.js','js/feature/selection-pool/feishu-report-api.v3956_0.js','js/shared/feishu-api-client.v3956_0.js']:
        if item not in entries: entries.append(item)
    data['jsEntry'] = entries
    data.update({
      'tongxueDirectHandoffContract': True,
      'tongxueDirectHandoffVersion': 'v1.5.5',
      'feishuSharedResourceContract': True,
      'feishuSharedServerServiceContract': True,
      'feishuSharedFrontendClientContract': True,
      'feishuCurrentBandExactRecordContract': True,
      'feishuLegacy2026FallbackContract': True,
      'feishuThreeEntryRegressionContract': True,
      'feishu2026PrimaryContract': True,
      'feishuHistoryYears': [2025, 2024],
      'activeRuntimeAuditContract': True,
      'sharedReportResource': '../shared/resources/reports/feishu-report-contract.js'
    })

update_json('ln-rank/active-assets.json', mutate_active)


def mutate_release(data):
    data['version'] = 'v3.9.56.0'
    data['assetVersion'] = 'v3956_0'
    data['releaseName'] = 'v3.9.56.0-feishu-tongxue-direct-resource-audit-no-fenxi'
    data['generatedAt'] = '2026-07-23T11:45:00+08:00'
    data['releaseGate'] = 'tongxue-direct-handoff, feishu-three-entry-2026, shared-report-resource, active-runtime-audit, protected-fenxi-runtime-unchanged'
    data['runtimeCacheQueryVersion'] = 'v3956_0'
    data['sharedResourceCenterVersion'] = 'v3956_0'
    data['mainJs'] = 'js/app.v3956_0.js'
    data['selectionPoolJs'] = 'js/selection-pool.v3956_0.js'
    data.update({
      'tongxueDirectHandoffContract': True,
      'tongxueDirectHandoffVersion': 'v1.5.5',
      'feishuSharedResourceContract': True,
      'feishuSharedServerServiceContract': True,
      'feishuSharedFrontendClientContract': True,
      'feishuCurrentBandExactRecordContract': True,
      'feishuLegacy2026FallbackContract': True,
      'feishuThreeEntryRegressionContract': True,
      'feishu2026PrimaryContract': True,
      'feishuHistoryYears': [2025, 2024],
      'activeRuntimeAuditContract': True,
      'sharedReportResource': 'shared/resources/reports/feishu-report-contract.js'
    })

update_json('ln-rank/release-meta.json', mutate_release)

# 9. Update copy audit to the 2026-first contract.
audit = read('tools/audit-feishu-copy-contract.mjs')
audit = audit.replace("for (const word of ['2024同口径参考','参考位置','建议再看','两年位次变化参考','院校专业背景'])", "for (const word of ['2026最低投档','2025','2024','参考位置','建议再看','院校专业背景'])")
audit = regex_once(audit, r"if \(!/2025最低分[\s\S]*?selection Feishu field order should follow 2025/2024/hard-fields/background contract'\);", "if (!/2026最低投档分[\\s\\S]{0,180}2026最低投档位次[\\s\\S]{0,260}historyText\\(item\\)[\\s\\S]{0,260}相对孩子[\\s\\S]{0,260}参考位置[\\s\\S]{0,260}地域[\\s\\S]{0,260}codeText[\\s\\S]{0,900}localContextItems\\(item\\)/.test(selectionReport)) failures.push('selection Feishu field order should follow 2026/2025/2024/hard-fields/background contract');", 'selection audit regex')
audit = regex_once(audit, r"if \(!/2025最低分[\s\S]*?search Feishu field order should follow fixed report contract'\);", "if (!/2026最低投档分[\\s\\S]{0,180}2026最低投档位次[\\s\\S]{0,260}historyText\\(record\\)[\\s\\S]{0,260}相对孩子[\\s\\S]{0,260}参考位置[\\s\\S]{0,260}地域[\\s\\S]{0,260}专业代码[\\s\\S]{0,260}院校专业背景[\\s\\S]{0,260}建议再看/.test(searchReport)) failures.push('search Feishu field order should follow 2026-first report contract');", 'current audit regex')
write('tools/audit-feishu-copy-contract.mjs', audit)

print('v3956 integration patch applied')
