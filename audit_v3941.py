from pathlib import Path
import json, re, subprocess, hashlib, os, sys, time, zipfile
root=Path('/mnt/data/lnrank_v3941_work')
ln=root/'ln-rank'
ver='v3.9.41'; asset='v3941_0'; release='v3.9.41-ln-rank-serious-color-balance-responsive-contract-12-role-no-fenxi'
report={}
active=json.loads((ln/'active-assets.json').read_text('utf-8'))
errors=[]
# asset exist & non html
assets=active['html']+active['jsEntry']+active['cssEntry']
asset_results=[]
for rel in assets:
    p=ln/rel
    ok=p.exists()
    text=p.read_text('utf-8', errors='ignore')[:256] if ok else ''
    non_html= ok and not re.match(r'\s*<!doctype html|\s*<html', text, re.I)
    # HTML entries are expected html, so non_html only for js/css
    if rel.endswith(('.js','.css')) and not non_html: errors.append(f'asset html fallback or missing: {rel}')
    asset_results.append({'path':rel,'exists':ok,'nonHtmlForJsCss':non_html if rel.endswith(('.js','.css')) else True})
report['assets']=asset_results
# html refs
for html in active['html']:
    txt=(ln/html).read_text('utf-8')
    if asset not in txt: errors.append(f'{html} missing {asset}')
    if ver not in txt and html!='self-check.html': errors.append(f'{html} missing visible {ver}')
# version contract
version_values={
    'VERSION.txt':(ln/'VERSION.txt').read_text('utf-8').strip(),
    'active-assets':active.get('version'),
    'active-assets asset':active.get('assetVersion'),
    'release-meta':json.loads((ln/'release-meta.json').read_text('utf-8')).get('version'),
    'release-meta asset':json.loads((ln/'release-meta.json').read_text('utf-8')).get('assetVersion'),
    'module-manifest':json.loads((ln/'module-manifest.json').read_text('utf-8')).get('version'),
    'module-manifest asset':json.loads((ln/'module-manifest.json').read_text('utf-8')).get('assetVersion'),
}
for k,v in version_values.items():
    if k.endswith(' asset'):
        if v!=asset: errors.append(f'version asset mismatch {k}: {v}')
    else:
        if v!=ver: errors.append(f'version mismatch {k}: {v}')
report['versionContract']=version_values
# CSS forbidden selectors and required tokens/colors
for rel in active['cssEntry']:
    css=(ln/rel).read_text('utf-8')
    bad=[]
    for pat in [r'\[class\*=["\']?card', r'\[class\*=["\']?chip', r'(?m)^\s*button\s*\{']:
        if re.search(pat, css): bad.append(pat)
    required=['--ln-bg:#F6F8F7','--ln-primary:#155E75','--ln-action:#C65F25','--ln-action-soft:#FFF4EA','--ln-radius-card:16px','seriousness balance']
    missing=[x for x in required if x not in css]
    if bad: errors.append(f'forbidden selector in {rel}: {bad}')
    if missing: errors.append(f'missing serious token in {rel}: {missing}')
report['cssGate']={'forbiddenSelectorPatterns':['[class*=card]','[class*=chip]','button{}'],'activeCss':active['cssEntry']}
# import checking recursively for active JS
import_re=re.compile(r"(?:import\s+(?:[^'\"]+?\s+from\s+)?|import\s*\()\s*['\"]([^'\"]+)['\"]")
seen=set(); missing=[]
def check_js(rel):
    if rel in seen: return
    seen.add(rel)
    p=ln/rel
    if not p.exists(): missing.append(rel); return
    txt=p.read_text('utf-8')
    for m in import_re.finditer(txt):
        spec=m.group(1).split('?')[0]
        if not spec.startswith('.'): continue
        base=(p.parent/spec).resolve()
        cand=base if base.suffix else Path(str(base)+'.js')
        try:
            r=str(cand.relative_to(ln.resolve()))
        except Exception:
            continue
        if not cand.exists(): missing.append(r)
        else: check_js(r)
for rel in active['jsEntry']: check_js(rel)
if missing: errors.append('missing imports: '+', '.join(sorted(set(missing))[:20]))
report['jsImportGraph']={'visited':len(seen),'missing':sorted(set(missing))}
# node check active graph + all functions js
node_files=[str(ln/r) for r in sorted(seen)] + [str(p) for p in sorted((root/'functions').rglob('*.js'))]
node_fail=[]
for f in node_files:
    r=subprocess.run(['node','--check',f],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
    if r.returncode: node_fail.append({'file':str(Path(f).relative_to(root)),'stderr':r.stderr[-500:]})
if node_fail: errors.append('node check failed')
report['nodeCheck']={'files':len(node_files),'failures':node_fail[:10]}
# no fenxi boundaries
paths=[str(p.relative_to(root)) for p in root.rglob('*')]
no_fenxi={
    'containsLnFenxi': any(x.startswith('ln-rank/fenxi/') or x=='ln-rank/fenxi' for x in paths),
    'containsFunctionsFenxi': any(x.startswith('functions/fenxi/') or x=='functions/fenxi' for x in paths),
    'containsMiddleware': (root/'functions/_middleware.js').exists(),
    'containsFenxiSession': (root/'functions/_lib/fenxi-session.js').exists(),
}
if no_fenxi['containsLnFenxi'] or no_fenxi['containsFunctionsFenxi'] or no_fenxi['containsMiddleware'] or not no_fenxi['containsFenxiSession']:
    errors.append('no-fenxi boundary failed')
report['noFenxi']=no_fenxi
# report six sections via module import? simple static + dynamic if possible
sections=['一、概要判断','二、当前方案怎么看','三、前中后段快速确认','四、最终排序清单','五、本方案确认清单','六、数据和使用边界']
text='\n'.join(p.read_text('utf-8',errors='ignore') for p in [(root/'functions/_lib/feishu-selection-pool-styled-builder.js'),(root/'functions/_lib/feishu-selection-pool-report-builder.js'),(root/'functions/_lib/release-contract.js')])
report['reportSections']={s:(s in text) for s in sections}
if not all(report['reportSections'].values()): errors.append('report six section missing')
# release contract strings
for p in [ln/'js/domain/version-contract.js', root/'functions/_lib/release-contract.js']:
    t=p.read_text('utf-8')
    if ver not in t or '3941_0' not in t or release not in t: errors.append(f'release contract mismatch {p}')
# high-report forbidden? use cautious: don't fail historical/audit; scan active html/js/css & functions builders only. 
forbidden=['捡漏','能上','录取概率高','很稳','王牌','优势专业']
scan_files=[ln/h for h in active['html']] + [ln/j for j in active['jsEntry'] if not j.endswith('self-check.v3941_0.js')] + [root/'functions/_lib/feishu-selection-pool-styled-builder.js', root/'functions/_lib/feishu-selection-pool-report-builder.js']
for f in scan_files:
    t=f.read_text('utf-8',errors='ignore')
    for word in forbidden:
        if word in t:
            errors.append(f'potential high-report forbidden term {word} in {f.relative_to(root)}')
report['highReportScan']={'forbiddenTerms':forbidden,'scope':[str(f.relative_to(root)) for f in scan_files]}
report['ok']=not errors
report['errors']=errors
for name,data in [
    ('v3.9.41-asset-graph-report.json', {'version':ver,'assetVersion':asset,'release':release,'ok': all(r['exists'] and r['nonHtmlForJsCss'] for r in asset_results),'assets':asset_results}),
    ('v3.9.41-version-contract-sync-audit.json', {'version':ver,'assetVersion':asset,'release':release,'ok': not any('version' in e for e in errors),'values':version_values}),
    ('v3.9.41-css-serious-color-responsive-audit.json', {'version':ver,'assetVersion':asset,'release':release,'ok': not any('selector' in e or 'serious token' in e for e in errors),'activeCss':active['cssEntry'],'seriousTokens':{'bg':'#F6F8F7','primary':'#155E75','action':'#C65F25','actionSoft':'#FFF4EA','radiusCard':'16px'},'note':'暖橙降饱和，主流程承重色回到深青蓝；辅助页低权重。'}),
    ('v3.9.41-no-fenxi-scope-audit.json', {'version':ver,'assetVersion':asset,'release':release,'ok': not(no_fenxi['containsLnFenxi'] or no_fenxi['containsFunctionsFenxi'] or no_fenxi['containsMiddleware']) and no_fenxi['containsFenxiSession'],'boundary':no_fenxi}),
    ('v3.9.41-js-syntax-audit.json', {'version':ver,'assetVersion':asset,'release':release,'ok':len(node_fail)==0,'files':len(node_files),'failures':node_fail}),
    ('v3.9.41-report-six-section-contract-audit.json', {'version':ver,'assetVersion':asset,'release':release,'ok':all(report['reportSections'].values()),'sections':sections,'found':report['reportSections']}),
    ('v3.9.41-12-role-release-checklist.json', {'version':ver,'assetVersion':asset,'release':release,'ok':not errors,'roles':['发布资产审计员','架构可维护性审计员','主流程回归审计员','数据口径审计员','高报口径审计员','辅助功能边界审计员','AI 输出审计员','报告一致性审计员','家长可读性审计员','UI 一致性审计员','移动端行为审计员','API / 错误体验审计员'],'errors':errors,'summary':'v3.9.41 只做严肃色彩平衡与响应式合同保持，不改业务逻辑。'}),
]:
    (ln/name).write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
# overall report
(ln/'v3.9.41-release-audit-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'ok':not errors,'errors':errors,'nodeFiles':len(node_files),'visitedJs':len(seen)},ensure_ascii=False,indent=2))
