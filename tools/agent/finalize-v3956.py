from __future__ import annotations

import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def p(rel: str) -> Path:
    return ROOT / rel


def read(rel: str) -> str:
    return p(rel).read_text(encoding='utf-8')


def write(rel: str, text: str) -> None:
    target = p(rel)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(text, encoding='utf-8')


def one(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected 1 occurrence, got {count}')
    return text.replace(old, new, 1)


def maybe(text: str, old: str, new: str) -> str:
    return text.replace(old, new)


# Active main core reads control lines from the shared exam resource instead of duplicating constants.
app = read('ln-rank/js/app.v3951_0.js')
exam_import = "import { LIAONING_PHYSICS_EXAM_CONFIG, isPublicBottomLineVisible } from '../../shared/resources/exam/liaoning-physics.js?v=3956_0';\n"
if exam_import not in app:
    app = app.replace("import { state } from './state/app-state.js?v=3951_0';\n", "import { state } from './state/app-state.js?v=3951_0';\n" + exam_import, 1)
app = re.sub(r"// v3\.9\.16：[\s\S]*?const SPECIAL_CONTROL_SCORE = 508;\n", "const EXAM = LIAONING_PHYSICS_EXAM_CONFIG;\n", app, count=1)
app = re.sub(r"function shouldShowBottomLinePanel\(score\) \{[\s\S]*?\n\}", "function shouldShowBottomLinePanel(score) {\n  return isPublicBottomLineVisible(score, EXAM);\n}", app, count=1)
if 'UNDERGRADUATE_CONTROL_SCORE' in app or 'SPECIAL_CONTROL_SCORE' in app:
    raise RuntimeError('active main still duplicates control-line constants')
write('ln-rank/js/app.v3951_0.js', app)

# Old module paths remain as compatibility adapters, but route strings and request logic have one owner.
write('ln-rank/js/feature/feishu/report-api.js', "export { createFeishuReport } from './report-api.v3956_0.js?v=3956_0';\n")
write('ln-rank/js/feature/selection-pool/feishu-report-api.js', "export { createSelectionPoolFeishuReport } from './feishu-report-api.v3956_0.js?v=3956_0';\n")
write('functions/_lib/report-data-service.js', "export { buildReportDataV3956 as buildReportData, normalizeReportParams } from './report-data-service-v3956.js';\n")

# Tongxue v1.5.5 static contracts.
for rel in [
    'tools/tongxue/verify-directory.mjs',
    'tools/tongxue/verify-brand-ui-v152.mjs',
    'tools/tongxue/verify-interaction-v153.mjs',
    'tools/tongxue/verify-school-region-ui-v150.mjs',
    'tools/tongxue/verify-share.mjs'
]:
    text = read(rel)
    text = text.replace('tongxue-performance-v154.js', 'tongxue-performance-v155.js')
    text = text.replace('tongxue-performance-v112.js?v=154', 'tongxue-performance-v112.js?v=155')
    text = text.replace('tongxue-v154-changelog-20260721', 'tongxue-v155-direct-handoff-20260723')
    text = text.replace('同学你好 v1.5.4', '同学你好 v1.5.5')
    text = text.replace("'v1.5.4'", "'v1.5.5'")
    text = text.replace("pageVersion:'v1.5.4'", "pageVersion:'v1.5.5'")
    text = text.replace('v=154', 'v=155')
    write(rel, text)

directory = read('tools/tongxue/verify-directory.mjs')
directory = directory.replace('更新于 2026-07-21', '更新于 2026-07-23')
old_order = "if(!(changelog.indexOf('v1.5.5')<changelog.indexOf('v1.5.3')&&changelog.indexOf('v1.5.3')<changelog.indexOf('v1.5.2')&&changelog.indexOf('v1.5.2')<changelog.indexOf('v1.5.1')))"
new_order = "if(!(changelog.indexOf('v1.5.5')<changelog.indexOf('v1.5.4')&&changelog.indexOf('v1.5.4')<changelog.indexOf('v1.5.3')&&changelog.indexOf('v1.5.3')<changelog.indexOf('v1.5.2')&&changelog.indexOf('v1.5.2')<changelog.indexOf('v1.5.1')))"
directory = one(directory, old_order, new_order, 'Tongxue changelog order')
write('tools/tongxue/verify-directory.mjs', directory)

# Main compact release gate now targets v3.9.56 while preserving the independent zy2026 v3.9.55 experience contract.
check = read('tools/check-ln-2026-release.mjs')
check = check.replace("main.includes('v3.9.55.0')", "main.includes('v3.9.56.0')")
check = check.replace("app.v3955_0.js?v=3955_0", "app.v3956_0.js?v=3956_0")
check = check.replace("app.v3951_0.js?v=3955_0", "app.v3951_0.js?v=3956_0")
check = check.replace("selection.includes('v3.9.55.0')", "selection.includes('v3.9.56.0')")
check = check.replace("t('ln-rank/js/app.v3955_0.js')", "t('ln-rank/js/app.v3956_0.js')")
check = check.replace("active.version==='v3.9.55.0'", "active.version==='v3.9.56.0'&&active.assetVersion==='v3956_0'")
check = check.replace("active.mainJs==='js/app.v3955_0.js'", "active.mainJs==='js/app.v3956_0.js'")
check = check.replace("active.jsEntry.includes('js/app.v3955_0.js')", "active.jsEntry.includes('js/app.v3956_0.js')")
check = check.replace("release.version==='v3.9.55.0'", "release.version==='v3.9.56.0'&&release.assetVersion==='v3956_0'")
check = check.replace("console.log('LN 2026 v3.9.55.0 shared resource center checks passed')", "console.log('LN 2026 v3.9.56.0 Feishu, Tongxue and shared resource checks passed')")
anchor = "ok(release.sharedResourceCenterContract===true&&release.sharedMajorBandsRequestRewriteContract===true,'shared release contracts');"
extra = "\nok(release.feishuSharedResourceContract===true&&release.feishuThreeEntryRegressionContract===true&&release.tongxueDirectHandoffContract===true,'v3956 integration contracts');\nok(t('shared/resources/reports/feishu-report-contract.js').includes('/api/feishu-create-selection-pool-report'),'shared Feishu route contract');\nok(t('tongxue/index.html').includes('tongxue-performance-v155.js?v=155'),'Tongxue v155 active');"
if extra.strip() not in check:
    check = one(check, anchor, anchor + extra, 'compact integration checks')
write('tools/check-ln-2026-release.mjs', check)

# Full Python release verifier.
verify = read('tools/ln-2026/verify-final-release-v3.py')
verify = verify.replace("base.VERSION = 'v3.9.55.0'", "base.VERSION = 'v3.9.56.0'")
verify = verify.replace("'/ln-rank/js/app.v3955_0.js?v=3955_0', 'data-release=\"v3.9.55.0\"'", "'/ln-rank/js/app.v3956_0.js?v=3956_0', 'data-release=\"v3.9.56.0\"'")
verify = verify.replace("contains('ln-rank/js/app.v3955_0.js'", "contains('ln-rank/js/app.v3956_0.js'")
verify = verify.replace("meta['version'] == 'v3.9.55.0' and meta['assetVersion'] == 'v3955_0'", "meta['version'] == 'v3.9.56.0' and meta['assetVersion'] == 'v3956_0'")
verify = verify.replace("meta['sharedResourceCenterVersion'] == 'v3955_0'", "meta['sharedResourceCenterVersion'] == 'v3956_0'")
verify = verify.replace("active['mainJs'] == 'js/app.v3955_0.js'", "active['mainJs'] == 'js/app.v3956_0.js'")
verify = verify.replace("'js/app.v3955_0.js' in active['jsEntry']", "'js/app.v3956_0.js' in active['jsEntry']")
verify = verify.replace("print('LN 2026 v3.9.55.0 family decision, 2026-first AI and shared resource center verification passed')", "print('LN 2026 v3.9.56.0 Feishu, Tongxue and shared resource verification passed')")
verify = verify.replace("'sharedSchoolDirectoryLazySingleFlightContract'", "'sharedSchoolDirectoryLazySingleFlightContract', 'feishuSharedResourceContract', 'feishuThreeEntryRegressionContract', 'tongxueDirectHandoffContract'")
report_anchor = "    for key in ('score2026', 'rank2026', 'score2025', 'rank2025', 'score2024', 'rank2024'):\n        base.check(key in report, f'report missing {key}')"
report_extra = "\n    base.check('2026最低投档分' in report and '2025最低分' not in report, 'Feishu report is not 2026-first')\n    contains('functions/_lib/report-data-service-v3956.js', 'ln-rank-manifest.js', 'selectedRecords', 'current-visible-band')\n    contains('functions/_lib/feishu-report-service.js', 'createFeishuReportResponse')\n    contains('tongxue/index.html', 'tongxue-performance-v155.js?v=155', '同学你好 v1.5.5')\n    contains('tongxue/app/tongxue-direct-handoff-v155.js', 'button.click()', 'shouldAutoQuery')"
if report_extra.strip() not in verify:
    verify = one(verify, report_anchor, report_anchor + report_extra, 'full Feishu/Tongxue checks')
write('tools/ln-2026/verify-final-release-v3.py', verify)

# Release workflows run the new gates.
workflow = read('.github/workflows/verify-ln-2026-final.yml')
workflow = workflow.replace('node tools/audit-shared-resource-center-v3955.mjs', 'node tools/audit-shared-resource-center-v3956.mjs')
if 'Verify three Feishu report flows' not in workflow:
    workflow = workflow.replace("      - name: Audit shared resource center\n        run: node tools/audit-shared-resource-center-v3956.mjs\n", "      - name: Audit shared resource center\n        run: node tools/audit-shared-resource-center-v3956.mjs\n      - name: Verify three Feishu report flows\n        run: node tools/verify-feishu-report-v3956.mjs\n      - name: Audit active runtime graph\n        run: node tools/audit-active-runtime-v3956.mjs\n")
workflow = workflow.replace('/shared/resources/schools/school-resource-center.js /ln-rank/', '/shared/resources/schools/school-resource-center.js /shared/resources/reports/feishu-report-contract.js /ln-rank/')
workflow = workflow.replace('/zy2026.html; do', '/zy2026.html /tongxue/; do')
write('.github/workflows/verify-ln-2026-final.yml', workflow)

tongxue_workflow = read('.github/workflows/tongxue-live-verification.yml')
if 'Verify direct school handoff' not in tongxue_workflow:
    tongxue_workflow = tongxue_workflow.replace("      - name: Verify mouse keyboard IME and copy ownership\n        run: node tools/tongxue/verify-interaction-v153.mjs\n", "      - name: Verify mouse keyboard IME and copy ownership\n        run: node tools/tongxue/verify-interaction-v153.mjs\n      - name: Verify direct school handoff\n        run: node tools/tongxue/verify-direct-handoff-v155.mjs\n")
write('.github/workflows/tongxue-live-verification.yml', tongxue_workflow)

# Stronger active-resource audit: all frontend Feishu route literals must be centralized.
audit = read('tools/audit-active-runtime-v3956.mjs')
if 'allFrontendRouteOwners' not in audit:
    insert = """
const allFrontendRouteOwners = [];
function collectJs(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) collectJs(file);
    else if (entry.name.endsWith('.js')) {
      const source = fs.readFileSync(file, 'utf8');
      if (source.includes('/api/feishu-create-report') || source.includes('/api/feishu-create-selection-pool-report')) allFrontendRouteOwners.push(file);
    }
  }
}
collectJs('ln-rank/js');
assert.deepEqual(allFrontendRouteOwners, [], `frontend modules still own Feishu route strings: ${allFrontendRouteOwners.join(', ')}`);
assert.ok(!fs.readFileSync('ln-rank/js/app.v3951_0.js', 'utf8').includes('SPECIAL_CONTROL_SCORE'));
"""
    audit = audit.replace("for (const forbidden of ['fenxi/pendingdel'", insert + "\nfor (const forbidden of ['fenxi/pendingdel'", 1)
write('tools/audit-active-runtime-v3956.mjs', audit)

shared_audit = read('tools/audit-shared-resource-center-v3956.mjs')
if "active main core control lines" not in shared_audit:
    shared_audit = shared_audit.replace("assert.ok(appWrapper.includes(\"url.pathname !== '/api/major-bands'\"));", "assert.ok(appWrapper.includes(\"url.pathname !== '/api/major-bands'\"));\nassert.ok(!read('ln-rank/js/app.v3951_0.js').includes('SPECIAL_CONTROL_SCORE'), 'active main core control lines are duplicated');")
write('tools/audit-shared-resource-center-v3956.mjs', shared_audit)

# Final branch cleanup. These files exist only to materialize the integration and must not enter main.
for rel in [
    '.github/workflows/agent-v3956-integration.yml',
    'tools/agent/apply-v3956-integration.py',
    'tools/agent/v3956-trigger.txt',
    'tools/agent/__pycache__/apply-v3956-integration.cpython-312.pyc',
    'tools/agent/finalize-v3956.py'
]:
    target = p(rel)
    if target.exists():
        target.unlink()
cache = p('tools/agent/__pycache__')
if cache.exists():
    shutil.rmtree(cache)
agent_dir = p('tools/agent')
if agent_dir.exists() and not any(agent_dir.iterdir()):
    agent_dir.rmdir()

print('v3956 release finalized and temporary integration files removed')
