from pathlib import Path
import json, shutil, re, hashlib, os, subprocess, sys, time
root=Path('/mnt/data/lnrank_v3941_work')
ln=root/'ln-rank'
OLD='v3.9.40'
NEW='v3.9.41'
OLD_ASSET='v3940_0'
NEW_ASSET='v3941_0'
OLD_REL='v3.9.40-ln-rank-global-color-token-responsive-contract-12-role-no-fenxi'
NEW_REL='v3.9.41-ln-rank-serious-color-balance-responsive-contract-12-role-no-fenxi'
NEW_LABEL='serious-color-balance-responsive-contract-12-role-no-fenxi'

# 1) duplicate active JS/CSS assets
css_files=[
 'css/dist/ln-rank-main', 'css/dist/ln-rank-selection','css/dist/ln-rank-trend','css/dist/ln-rank-self-check','css/dist/local-mainline','css/dist/211-mainline'
]
for stem in css_files:
    src=ln/f'{stem}.{OLD_ASSET}.css'
    dst=ln/f'{stem}.{NEW_ASSET}.css'
    text=src.read_text(encoding='utf-8')
    text=text.replace('v3.9.40 global color token + responsive contract', 'v3.9.41 serious color balance + responsive contract')
    text=text.replace('设计目的：全站同一套视觉语言；蓝灰负责可信，米白负责缓释，暖橙只负责下一步与核验提示。', '设计目的：在 v3.9.40 全站 token 基础上回收过亮暖橙与过软圆角；保持家长缓释感，同时提高高考复核工具的严肃度。')
    text=text.replace(OLD, NEW).replace(OLD_ASSET, NEW_ASSET)
    # token replacements in v3940 appended block; keep older historical css untouched except active override appended
    text=text.replace('--ln-bg:#F7F4EF;', '--ln-bg:#F6F8F7;')
    text=text.replace('--ln-surface-soft:#FBF8F3;', '--ln-surface-soft:#F9FAF8;')
    text=text.replace('--ln-text:#18212F;', '--ln-text:#172033;')
    text=text.replace('--ln-muted:#64748B;', '--ln-muted:#667085;')
    text=text.replace('--ln-border:#E6DED2;', '--ln-border:#DDE5E1;')
    text=text.replace('--ln-primary:#1F5F8B;', '--ln-primary:#155E75;')
    text=text.replace('--ln-primary-hover:#174E73;', '--ln-primary-hover:#0F4A5C;')
    text=text.replace('--ln-primary-soft:#EAF4FA;', '--ln-primary-soft:#E8F3F5;')
    text=text.replace('--ln-action:#F97332;', '--ln-action:#C65F25;')
    text=text.replace('--ln-action-hover:#EA580C;', '--ln-action-hover:#A94F1E;')
    text=text.replace('--ln-action-soft:#FFF3E8;', '--ln-action-soft:#FFF4EA;')
    text=text.replace('--ln-action-border:#FDBA74;', '--ln-action-border:#E7B184;')
    text=text.replace('--ln-success:#2F7D5C;', '--ln-success:#2F6F5E;')
    text=text.replace('--ln-warning:#B45309;', '--ln-warning:#9A5B16;')
    text=text.replace('--ln-radius-card:18px;', '--ln-radius-card:16px;')
    # soften hard-coded warm text color in active block
    text=text.replace('color:#6B3C17', 'color:#6F4218')
    text=text.replace('color:#7C2D12', 'color:#743C16')
    text=text.replace('border-color:#D7E7F1', 'border-color:#CFE2E7')
    # append page-specific serious overrides. scoped only.
    fname=dst.name
    if 'ln-rank-main' in fname:
        extra = r'''

/* v3.9.41 seriousness balance overrides: 橙色从主情绪退回行动/核验提示，主流程用深青蓝承重。 */
body.ln-parent-guided-flow{
  background:
    radial-gradient(circle at 8% 8%, rgba(21,94,117,.055), transparent 26%),
    radial-gradient(circle at 92% 12%, rgba(47,111,94,.045), transparent 30%),
    linear-gradient(135deg,#F7F9F8 0%,#F4F7F6 62%,#F3F6F8 100%);
}
.ln-parent-guided-flow .hero,.ln-parent-guided-flow .ln-parent-compact-stepper,.ln-parent-guided-flow .panel{box-shadow:0 10px 24px rgba(23,32,51,.055)}
.ln-parent-guided-flow .ln-stepper-index{background:var(--ln-primary);border-color:var(--ln-primary);color:#fff;box-shadow:none}
.ln-parent-guided-flow .ln-stepper-list li{background:#FFFFFF;border-color:var(--ln-border)}
.ln-parent-guided-flow .ln-stepper-list li:first-child{border-color:#B7D2DA;background:var(--ln-primary-soft)}
.ln-parent-guided-flow .ln-stepper-details{background:#F7FAF9;border-color:var(--ln-border);color:var(--ln-muted)}
.ln-parent-guided-flow .range-button.is-active,.ln-parent-guided-flow .bottomline-button.is-active,.ln-parent-guided-flow .bottomline-sheet-option.is-active{background:var(--ln-primary-soft);border-color:#9DC3CC;color:var(--ln-primary);box-shadow:0 0 0 1px rgba(21,94,117,.06) inset}
.ln-parent-guided-flow .bottomline-panel,.ln-parent-guided-flow .special-project-panel,.ln-parent-guided-flow .major-trend-hint{background:var(--ln-action-soft);border-color:var(--ln-action-border);color:#6F4218}
.ln-parent-guided-flow .aux-background-card{background:#FAFCFB;border-color:var(--ln-border);color:var(--ln-muted)}
.ln-parent-guided-flow .aux-background-card .aux-title,.ln-parent-guided-flow .aux-background-card strong{color:var(--ln-primary)}
.ln-parent-guided-flow .query-button,.ln-parent-guided-flow .action-primary{background:var(--ln-primary);border-color:var(--ln-primary)}
.ln-parent-guided-flow .action-secondary,.ln-parent-guided-flow .ghost-button{border-color:#CFE2E7;color:var(--ln-primary);background:var(--ln-primary-soft)}
.ln-parent-guided-flow .panel,.ln-parent-guided-flow .result-card,.ln-parent-guided-flow .major-card,.ln-parent-guided-flow .band-card{border-radius:var(--ln-radius-card)}
@media(max-width:640px){.ln-parent-guided-flow .hero,.ln-parent-guided-flow .panel,.ln-parent-guided-flow .ln-parent-compact-stepper,.ln-parent-guided-flow .aux-background-entry{border-radius:14px}}
'''
    elif 'ln-rank-selection' in fname:
        extra = r'''

/* v3.9.41 seriousness balance overrides: 自选池像方案工作台，暖色只保留给下一步和核验提示。 */
body.ln-selection-guided-flow{background:linear-gradient(135deg,#F7F9F8 0%,#F4F7F6 66%,#F3F6F8 100%)}
.ln-selection-guided-flow .hero,.ln-selection-guided-flow .workspace-panel,.ln-selection-guided-flow .ln-plan-status-strip,.ln-selection-guided-flow .ln-selection-step{box-shadow:0 10px 24px rgba(23,32,51,.055)}
.ln-selection-guided-flow .ln-step-marker,.ln-selection-guided-flow .ln-plan-status-steps li:first-child{background:var(--ln-primary-soft);border-color:#B7D2DA;color:var(--ln-primary)}
.ln-selection-guided-flow .workspace-button.primary,.ln-selection-guided-flow .workspace-button.report-primary{background:var(--ln-primary);border-color:var(--ln-primary);color:#fff}
.ln-selection-guided-flow .workspace-button.primary:hover,.ln-selection-guided-flow .workspace-button.report-primary:hover{background:var(--ln-primary-hover)}
.ln-selection-guided-flow .review-checklist,.ln-selection-guided-flow .ln-report-status,.ln-selection-guided-flow .direction-explorer-report-mount{background:var(--ln-action-soft);border-color:var(--ln-action-border);color:#6F4218}
.ln-selection-guided-flow .candidate-card,.ln-selection-guided-flow .selection-card,.ln-selection-guided-flow .workspace-item,.ln-selection-guided-flow .report-preview-card{border-radius:var(--ln-radius-card)}
@media(max-width:640px){.ln-selection-guided-flow .hero,.ln-selection-guided-flow .workspace-panel,.ln-selection-guided-flow .ln-selection-step,.ln-selection-guided-flow .ln-plan-status-strip{border-radius:14px}}
'''
    elif 'trend' in fname:
        extra = r'''

/* v3.9.41 seriousness balance overrides: 趋势页是参考资料，不用强行动色。 */
body.major-trend-body{background:linear-gradient(135deg,#F7F9F8 0%,#F4F7F6 70%,#F3F6F8 100%)}
.major-trend-body .hero,.major-trend-body .trend-card,.major-trend-body .major-trend-section{box-shadow:0 10px 24px rgba(23,32,51,.055)}
.major-trend-body .ln-aux-guidance-note{background:#F7FAF9;border-color:var(--ln-border);color:var(--ln-muted)}
.major-trend-body .trend-action-main{background:var(--ln-primary);border-color:var(--ln-primary)}
.major-trend-body .trend-action-soft,.major-trend-body .scope-pill{background:var(--ln-primary-soft);border-color:#CFE2E7;color:var(--ln-primary)}
@media(max-width:640px){.major-trend-body .hero,.major-trend-body .trend-card,.major-trend-body .major-trend-section{border-radius:14px}}
'''
    elif 'self-check' in fname:
        extra = r'''

/* v3.9.41 seriousness balance overrides: self-check 保持工程页，不使用家长行动橙。 */
body.ln-self-check-guided-page{background:#F5F7FA;color:var(--ln-text)}
.ln-self-check-guided-page .self-hero,.ln-self-check-guided-page .self-card{border-radius:16px;box-shadow:0 10px 24px rgba(23,32,51,.055)}
.ln-self-check-guided-page .btn{background:var(--ln-primary);border-color:var(--ln-primary)}
'''
    elif 'local-mainline' in fname or '211-mainline' in fname:
        extra = r'''

/* v3.9.41 seriousness balance overrides: 辅助复核页低权重，不做光环或强营销色。 */
body{background:linear-gradient(135deg,#F7F9F8 0%,#F4F7F6 70%,#F3F6F8 100%)}
.lm-hero,.lm-panel,.lm-boundary,.lm-howto,.lm-start-guide,.lm-card,.lm-record-card{box-shadow:0 10px 24px rgba(23,32,51,.055);border-radius:var(--ln-radius-card)}
.lm-boundary-soft,.lm-review-row,.lm-tech-detail{background:#F7FAF9;border-color:var(--ln-border);color:var(--ln-muted)}
.lm-link-button.secondary,.lm-card-text-link,.lm-pill.primary,.lm-evidence-chip{background:var(--ln-primary-soft);border-color:#CFE2E7;color:var(--ln-primary)}
@media(max-width:640px){.lm-hero,.lm-panel,.lm-boundary,.lm-howto,.lm-start-guide,.lm-card,.lm-record-card{border-radius:14px}}
'''
    else:
        extra=''
    dst.write_text(text+extra, encoding='utf-8')

# JS duplicates with version strings changed
js_pairs=[
    ('js/app.v3940_0.js','js/app.v3941_0.js'),
    ('js/selection-pool.v3940_0.js','js/selection-pool.v3941_0.js'),
    ('js/major-trend-render.v3940_0.js','js/major-trend-render.v3941_0.js'),
    ('js/self-check.v3940_0.js','js/self-check.v3941_0.js'),
    ('js/local-mainline/local-mainline-app.v3940_0.js','js/local-mainline/local-mainline-app.v3941_0.js'),
    ('js/211-mainline/211-mainline-app.v3940_0.js','js/211-mainline/211-mainline-app.v3941_0.js'),
]
for src_rel,dst_rel in js_pairs:
    src=ln/src_rel; dst=ln/dst_rel
    text=src.read_text(encoding='utf-8').replace(OLD,NEW).replace(OLD_ASSET,NEW_ASSET).replace(OLD_REL,NEW_REL)
    dst.write_text(text, encoding='utf-8')

# HTML and version files
for rel in ['index.html','selection-pool.html','211-mainline.html','local-mainline.html','major-trend-2025.html','self-check.html']:
    p=ln/rel
    text=p.read_text(encoding='utf-8').replace(OLD,NEW).replace(OLD_ASSET,NEW_ASSET).replace('3940_0','3941_0').replace(OLD_REL,NEW_REL)
    text=text.replace('全站色彩 token 与响应式合同', '严肃色彩平衡与响应式合同')
    p.write_text(text, encoding='utf-8')
(ln/'VERSION.txt').write_text(NEW+'\n', encoding='utf-8')

# update contract files
vc=ln/'js/domain/version-contract.js'
vc.write_text(f"export const LN_RANK_VERSION = {{\n  display: '{NEW}',\n  asset: '3941_0',\n  release: '{NEW_REL}'\n}};\n", encoding='utf-8')
rc=root/'functions/_lib/release-contract.js'
rc.write_text(f"export const LN_RANK_RELEASE_CONTRACT = {{\n  display: '{NEW}',\n  asset: '3941_0',\n  assetVersion: '{NEW_ASSET}',\n  release: '{NEW_REL}',\n  label: '{NEW_LABEL}',\n  reportSections: [\n    '一、概要判断',\n    '二、当前方案怎么看',\n    '三、前中后段快速确认',\n    '四、最终排序清单',\n    '五、本方案确认清单',\n    '六、数据和使用边界'\n  ]\n}};\n", encoding='utf-8')

# update JSON manifests
active={
  "version": NEW,
  "assetVersion": NEW_ASSET,
  "html": ["index.html","selection-pool.html","211-mainline.html","local-mainline.html","major-trend-2025.html","self-check.html"],
  "jsEntry": ["js/app.v3941_0.js","js/selection-pool.v3941_0.js","js/major-trend-render.v3941_0.js","js/self-check.v3941_0.js","js/local-mainline/local-mainline-app.v3941_0.js","js/211-mainline/211-mainline-app.v3941_0.js"],
  "cssEntry": ["css/dist/ln-rank-main.v3941_0.css","css/dist/ln-rank-selection.v3941_0.css","css/dist/ln-rank-trend.v3941_0.css","css/dist/ln-rank-self-check.v3941_0.css","css/dist/local-mainline.v3941_0.css","css/dist/211-mainline.v3941_0.css"],
  "sourceCssPreserved": True,
  "cssDist": {"main":"css/dist/ln-rank-main.v3941_0.css","selection":"css/dist/ln-rank-selection.v3941_0.css","trend":"css/dist/ln-rank-trend.v3941_0.css","selfCheck":"css/dist/ln-rank-self-check.v3941_0.css","localMainline":"css/dist/local-mainline.v3941_0.css","main211":"css/dist/211-mainline.v3941_0.css"},
  "releaseGate": "serious color balance, responsive contract, report six-section contract, self-check mount, deep version contract, scoped CSS selector gate",
  "compactGuideUI": True,
  "productIntentPreservation": True,
  "twelveRoleReview": True,
  "versionContractSync": True,
  "reportSixSectionContract": True,
  "selfCheckGate": True,
  "cssBlastRadiusScoped": True,
  "globalColorTokenContract": True,
  "seriousColorBalanceContract": True,
  "responsiveContract": True,
  "parentNewUserReliefContract": True,
  "noFunctionLogicChange": True,
  "functionLogicChangeScope": "none; visual seriousness balance only, functions keep v3.9.39/v3.9.40 report/self-check logic with release contract version synchronized to v3.9.41",
  "noFenxiIncluded": True
}
(ln/'active-assets.json').write_text(json.dumps(active,ensure_ascii=False,indent=2),encoding='utf-8')
release={
  "version":NEW,"assetVersion":NEW_ASSET,"release":NEW_REL,"name":NEW_REL,"label":NEW_LABEL,
  "notes":[
    "基于 v3.9.40 全站色系与响应式合同基线继续推进，不新增功能，不改查询算法。",
    "针对实际截图反馈，将明亮暖橙和过软米白视觉回收为更严肃的深青蓝、冷静灰白和低饱和暖橙。",
    "橙色退回到行动/核验提示，不再承担主流程步骤和辅助入口主情绪。",
    "保持 375/390/414/430/768/1024/1366 响应式合同：防横向滚动、chip 竖排、按钮挤压和长文本溢出。",
    "no-fenxi 边界保持；functions/_middleware.js 不在包内。"
  ],
  "noFenxiIncluded":True,"releaseAssetGraphGate":True,"twelveRoleReview":True,"productIntentPreservation":True,"compactGuideUI":True,"versionContractSync":True,"reportSixSectionContract":True,"selfCheckGate":True,"cssBlastRadiusScoped":True,"globalColorTokenContract":True,"seriousColorBalanceContract":True,"responsiveContract":True,"parentNewUserReliefContract":True,"functionLogicChangeScope":"none; visual seriousness balance only, release version synchronized"
}
(ln/'release-meta.json').write_text(json.dumps(release,ensure_ascii=False,indent=2),encoding='utf-8')
module={
  "version":NEW,"assetVersion":NEW_ASSET,
  "entries":{"search":"js/app.v3941_0.js","selectionPool":"js/selection-pool.v3941_0.js","majorTrend":"js/major-trend-render.v3941_0.js","selfCheck":"js/self-check.v3941_0.js","localMainline":"js/local-mainline/local-mainline-app.v3941_0.js","main211":"js/211-mainline/211-mainline-app.v3941_0.js"},
  "entrypoints":{"search":"js/app.v3941_0.js","selectionPool":"js/selection-pool.v3941_0.js","majorTrend":"js/major-trend-render.v3941_0.js","selfCheck":"js/self-check.v3941_0.js","localMainline":"js/local-mainline/local-mainline-app.v3941_0.js","main211":"js/211-mainline/211-mainline-app.v3941_0.js"},
  "cssDist":active['cssDist'],
  "compactGuideUI":True,"productIntentPreservation":True,"reportSixSectionContract":True,"selfCheckGate":True,"cssBlastRadiusScoped":True,"globalColorTokenContract":True,"seriousColorBalanceContract":True,"responsiveContract":True,"parentNewUserReliefContract":True,"noFenxiIncluded":True
}
(ln/'module-manifest.json').write_text(json.dumps(module,ensure_ascii=False,indent=2),encoding='utf-8')

# remove or keep old v3940 audit? keep history, add new reports
# simple audit reports placeholders with actual checks later overwritten by audit script
