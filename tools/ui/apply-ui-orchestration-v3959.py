#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]


def p(rel:str)->Path:return ROOT/rel
def read(rel:str)->str:return p(rel).read_text(encoding='utf-8')
def write(rel:str,text:str)->None:
    target=p(rel);target.parent.mkdir(parents=True,exist_ok=True);target.write_text(text,encoding='utf-8')

def one(text:str,old:str,new:str,label:str)->str:
    count=text.count(old)
    if count!=1:raise RuntimeError(f'{label}: expected 1 occurrence, got {count}')
    return text.replace(old,new,1)

def ensure_before(text:str,anchor:str,addition:str,label:str)->str:
    if addition in text:return text
    return one(text,anchor,addition+anchor,label)

def ensure_after(text:str,anchor:str,addition:str,label:str)->str:
    if addition in text:return text
    return one(text,anchor,anchor+addition,label)

UI_LINKS='''  <link rel="stylesheet" href="/shared/ui/tokens/foundation.v3959_0.css?v=3959_0" />\n  <link rel="stylesheet" href="/shared/ui/tokens/semantic.v3959_0.css?v=3959_0" />\n  <link rel="stylesheet" href="/shared/ui/shell/family-shell.v3959_0.css?v=3959_0" />\n'''
UI_SCRIPT='  <script type="module" src="/shared/ui/shell/family-shell.v3959_0.js?v=3959_0"></script>\n'

# Release single owner.
release=read('shared/resources/release/current-release.js')
release=release.replace("'v3.9.58.0'","'v3.9.59.0'")
release=release.replace("'3958_0'","'3959_0'")
release=release.replace("'v3958_0'","'v3959_0'")
release=release.replace('v3.9.58.0-unified-resource-ownership-no-fenxi','v3.9.59.0-resource-ui-orchestration-no-fenxi')
release=release.replace('unified-resource-ownership-no-fenxi','resource-ui-orchestration-no-fenxi')
release=release.replace("resourceOwnershipVersion: 'resource-ownership-v3958',","resourceOwnershipVersion: 'resource-ownership-v3958',\n  uiOrchestrationVersion: 'ui-orchestration-v3959',")
release=release.replace("reports: '/shared/resources/reports/feishu-report-contract.js'","reports: '/shared/resources/reports/feishu-report-contract.js',\n    ui: '/shared/ui/ui-registry.js'")
write('shared/resources/release/current-release.js',release)

registry=read('shared/resources/resource-registry.js')
ui_registry="""  ui: Object.freeze({
    id: 'family-ui-orchestration',
    registry: '/shared/ui/ui-registry.js',
    foundation: '/shared/ui/tokens/foundation.v3959_0.css',
    semantic: '/shared/ui/tokens/semantic.v3959_0.css',
    shellCss: '/shared/ui/shell/family-shell.v3959_0.css',
    shellJs: '/shared/ui/shell/family-shell.v3959_0.js',
    policy: 'single-ui-language-shell-state-and-responsive-contract',
    consumers: Object.freeze(['home','ln-rank','selection-pool','ln2026','zy2026','tongxue'])
  }),
"""
registry=ensure_before(registry,"  campusAssignments: Object.freeze({",ui_registry,'UI registry')
write('shared/resources/resource-registry.js',registry)

# Versioned active wrappers.
app=read('ln-rank/js/app.v3958_0.js').replace('3958_0','3959_0')
write('ln-rank/js/app.v3959_0.js',app)
selection=read('ln-rank/js/selection-pool.v3958_0.js').replace('3958_0','3959_0')
write('ln-rank/js/selection-pool.v3959_0.js',selection)
self_check=read('ln-rank/js/self-check.v3958_0.js').replace('3958_0','3959_0')
write('ln-rank/js/self-check.v3959_0.js',self_check)

# Static page helper.
def patch_page(rel:str,page_key:str,brand:str='family',density:str='workspace',remove_old_bar:bool=False)->None:
    text=read(rel)
    text=ensure_before(text,'</head>',UI_LINKS,'UI links '+rel)
    body_pattern=re.compile(r'<body(?P<attrs>[^>]*)>')
    match=body_pattern.search(text)
    if not match:raise RuntimeError(f'{rel}: body missing')
    attrs=match.group('attrs')
    attrs=re.sub(r'\sdata-ui-page="[^"]*"','',attrs)
    attrs=re.sub(r'\sdata-ui-brand="[^"]*"','',attrs)
    attrs=re.sub(r'\sdata-ui-density="[^"]*"','',attrs)
    attrs=re.sub(r'\sdata-release="[^"]*"','',attrs)
    class_match=re.search(r'class="([^"]*)"',attrs)
    if class_match:
        classes=class_match.group(1).split()
        if 'ui-orchestrated' not in classes:classes.append('ui-orchestrated')
        attrs=attrs[:class_match.start()]+f'class="{" ".join(classes)}"'+attrs[class_match.end():]
    else:attrs+=' class="ui-orchestrated"'
    attrs+=f' data-ui-page="{page_key}" data-ui-brand="{brand}" data-ui-density="{density}" data-release="v3.9.59.0"'
    text=text[:match.start()]+f'<body{attrs}>'+text[match.end():]
    if remove_old_bar:
        text=re.sub(r'\s*<script type="module" src="/ln-rank/js/ux/family-decision-bar\.v3955_0\.js\?v=[^"]+"></script>','',text)
    text=ensure_before(text,'</body>',UI_SCRIPT,'UI script '+rel)
    write(rel,text)

# Home: remove its duplicate core token owner and update footer.
home=read('index.html')
home=home.replace('    :root{--bg:#f4f7f6;--card:#fff;--ink:#17242d;--text:#40515a;--muted:#6b7880;--line:#dce6e2;--brand:#155e75;--soft:#e8f3f5}\n','')
home=home.replace('首页版本：v3.9.55.0','首页版本：v3.9.59.0')
write('index.html',home)
patch_page('index.html','home','family','reading')

# Primary family workflow.
for rel,key in [('ln-rank/index.html','selection'),('ln-rank/selection-pool.html','selected')]:
    text=read(rel).replace('v3.9.58.0','v3.9.59.0').replace('v3958_0','v3959_0').replace('?v=3958_0','?v=3959_0')
    text=text.replace('/ln-rank/js/app.v3958_0.js?v=3959_0','/ln-rank/js/app.v3959_0.js?v=3959_0')
    text=text.replace('/ln-rank/js/selection-pool.v3958_0.js?v=3959_0','/ln-rank/js/selection-pool.v3959_0.js?v=3959_0')
    write(rel,text)
    patch_page(rel,key,'family','workspace',True)

# Evidence pages retain their internal experience/data versions, but join current shell.
patch_page('ln2026.html','difficulty','family','reading')
patch_page('zy2026/index.html','structure','family','workspace')
write('zy2026.html',read('zy2026/index.html'))

# Tongxue keeps sub-brand colors but stops owning the whole foundation token set.
tongxue=read('tongxue/index.html')
tongxue=re.sub(r':root\{--bg:#fff;--card:#fff;--primary:#172d67;--primary-hover:#102352;--brand-teal:#45b99a;--brand-teal-soft:#eaf7f3;--text:#17242d;--muted:#60717a;--border:#dce6e2;--soft:#eaf7f3;--warm:#fff6ed;--warm-border:#f0d4bc;--warm-text:#8d4b20;--danger:#9a4336;--danger-bg:#fff0ec;--danger-border:#efc5ba;--shadow:0 14px 38px rgba\(20,40,50,.07\)\}',':root{--tongxue-logo-navy:#172d67;--tongxue-logo-teal:#45b99a}',tongxue,count=1)
write('tongxue/index.html',tongxue)
patch_page('tongxue/index.html','tongxue','tongxue','reading')

# Self-check shell and active entry.
self_page=read('ln-rank/self-check.html').replace('v3.9.58.0','v3.9.59.0').replace('self-check.v3958_0.js?v=3958_0','self-check.v3959_0.js?v=3959_0')
write('ln-rank/self-check.html',self_page)
patch_page('ln-rank/self-check.html','selected','family','reading')

# Metadata.
def update_meta(rel:str)->None:
    data=json.loads(read(rel))
    data['version']='v3.9.59.0';data['assetVersion']='v3959_0'
    data['releaseName']='v3.9.59.0-resource-ui-orchestration-no-fenxi'
    data['releaseGate']='resource-ownership-v3958-preserved, shared-ui-tokens, family-shell, action-state-copy-contracts, six-page-adapters, no-new-observer, protected-fenxi-runtime-unchanged'
    data['runtimeCacheQueryVersion']='v3959_0';data['sharedResourceCenterVersion']='v3959_0'
    data['mainJs']='js/app.v3959_0.js';data['selectionPoolJs']='js/selection-pool.v3959_0.js';data['selfCheckJs']='js/self-check.v3959_0.js'
    entries=[]
    for item in data.get('jsEntry',[]):
        item={'js/app.v3958_0.js':'js/app.v3959_0.js','js/selection-pool.v3958_0.js':'js/selection-pool.v3959_0.js','js/self-check.v3958_0.js':'js/self-check.v3959_0.js','js/ux/family-decision-bar.v3955_0.js':'../shared/ui/shell/family-shell.v3959_0.js'}.get(item,item)
        if item not in entries:entries.append(item)
    data['jsEntry']=entries
    for key,value in {
      'uiOrchestrationVersion':'ui-orchestration-v3959',
      'sharedUiRegistry':'../shared/ui/ui-registry.js',
      'sharedUiFoundationCss':'../shared/ui/tokens/foundation.v3959_0.css',
      'sharedUiSemanticCss':'../shared/ui/tokens/semantic.v3959_0.css',
      'sharedUiShellCss':'../shared/ui/shell/family-shell.v3959_0.css',
      'sharedUiShellJs':'../shared/ui/shell/family-shell.v3959_0.js',
      'sharedUiOwnershipContract':True,
      'sharedUiTokenContract':True,
      'sharedUiShellContract':True,
      'sharedUiActionContract':True,
      'sharedUiStateContract':True,
      'sharedUiCopyContract':True,
      'sharedUiSixPageAdapterContract':True,
      'sharedUiMobileNavigationContract':True,
      'sharedUiKeyboardSafeAreaContract':True,
      'sharedUiSubBrandContract':True,
      'sharedUiNoNewObserverContract':True,
      'sharedUiResourceOwnershipPreservedContract':True
    }.items():data[key]=value
    write(rel,json.dumps(data,ensure_ascii=False,indent=2)+'\n')
for rel in ('ln-rank/release-meta.json','ln-rank/active-assets.json'):update_meta(rel)

# Public cache headers.
headers=read('_headers')
for path in [
 '/shared/ui/tokens/foundation.v3959_0.css','/shared/ui/tokens/semantic.v3959_0.css',
 '/shared/ui/shell/family-shell.v3959_0.css','/shared/ui/shell/family-shell.v3959_0.js',
 '/shared/ui/contracts/action-contract.v3959_0.js','/shared/ui/contracts/state-contract.v3959_0.js',
 '/shared/ui/contracts/copy-contract.v3959_0.js','/shared/ui/ui-registry.js',
 '/ln-rank/js/app.v3959_0.js','/ln-rank/js/selection-pool.v3959_0.js','/ln-rank/js/self-check.v3959_0.js'
]:
    if path not in headers:headers+=f'\n{path}\n  Cache-Control: public, max-age=31536000, immutable\n'
write('_headers',headers)

# Release verification follows the single release owner and new UI entry.
check=read('tools/check-ln-2026-release.mjs')
check=check.replace('app.v3958_0.js?v=3958_0','app.v3959_0.js?v=3959_0')
check=check.replace('app.v3951_0.js?v=3958_0','app.v3951_0.js?v=3959_0')
check=check.replace("main.includes('family-decision-bar.v3955_0.js')","main.includes('/shared/ui/shell/family-shell.v3959_0.js?v=3959_0')")
check=check.replace("'family status bar loaded'","'shared family shell loaded'")
check=check.replace('selection-pool.v3958_0.js?v=3958_0','selection-pool.v3959_0.js?v=3959_0')
check=check.replace("'selection v3958 entry'","'selection v3959 entry'")
check=check.replace("const appWrapper=t('ln-rank/js/app.v3958_0.js');","const appWrapper=t('ln-rank/js/app.v3959_0.js');")
check=check.replace("active.mainJs==='js/app.v3958_0.js'&&active.jsEntry.includes('js/app.v3958_0.js')","active.mainJs==='js/app.v3959_0.js'&&active.jsEntry.includes('js/app.v3959_0.js')")
check=check.replace("active.selectionPoolJs==='js/selection-pool.v3958_0.js'&&active.jsEntry.includes('js/selection-pool.v3958_0.js')","active.selectionPoolJs==='js/selection-pool.v3959_0.js'&&active.jsEntry.includes('js/selection-pool.v3959_0.js')")
check=check.replace("active.jsEntry.includes('js/ux/family-decision-bar.v3955_0.js')","active.jsEntry.includes('../shared/ui/shell/family-shell.v3959_0.js')")
check=check.replace("'active family bar'","'active shared family shell'")
check=check.replace("'v3958 ownership contracts'","'resource ownership contracts'")
ui_checks="""
const uiRegistry=t('shared/ui/ui-registry.js');
ok(uiRegistry.includes('UI_ORCHESTRATION_VERSION')&&uiRegistry.includes('tongxue'),'shared UI registry');
for(const path of ['index.html','ln-rank/index.html','ln-rank/selection-pool.html','ln2026.html','zy2026/index.html','tongxue/index.html']){
  const page=t(path);ok(page.includes('family-shell.v3959_0.js?v=3959_0'),`${path} shared UI shell`);ok(page.includes('foundation.v3959_0.css?v=3959_0'),`${path} shared UI tokens`);
}
ok(release.sharedUiOwnershipContract===true&&release.sharedUiSixPageAdapterContract===true,'shared UI release contracts');
"""
check=ensure_before(check,"for(const path of ['.bootstrap'",ui_checks,'compact UI checks')
check=check.replace('unified resource ownership checks passed','resource and UI orchestration checks passed')
write('tools/check-ln-2026-release.mjs',check)

verify=read('tools/ln-2026/verify-final-release-v3.py')
verify=verify.replace("base.VERSION = 'v3.9.58.0'","base.VERSION = 'v3.9.59.0'")
verify=verify.replace('app.v3958_0.js?v=3958_0','app.v3959_0.js?v=3959_0')
verify=verify.replace('data-release="v3.9.58.0"','data-release="v3.9.59.0"')
verify=verify.replace("contains('ln-rank/js/app.v3958_0.js'","contains('ln-rank/js/app.v3959_0.js'")
verify=verify.replace("meta['version'] == 'v3.9.58.0' and meta['assetVersion'] == 'v3958_0'","meta['version'] == 'v3.9.59.0' and meta['assetVersion'] == 'v3959_0'")
verify=verify.replace("meta['sharedResourceCenterVersion'] == 'v3958_0'","meta['sharedResourceCenterVersion'] == 'v3959_0'")
verify=verify.replace("active['mainJs'] == 'js/app.v3958_0.js'","active['mainJs'] == 'js/app.v3959_0.js'")
verify=verify.replace("'js/app.v3958_0.js' in active['jsEntry']","'js/app.v3959_0.js' in active['jsEntry']")
verify=verify.replace('v3.9.58.0 unified resource ownership verification passed','v3.9.59.0 resource and UI orchestration verification passed')
write('tools/ln-2026/verify-final-release-v3.py',verify)

family=read('tools/verify-family-decision-v3955.mjs').replace("'v3.9.58.0'","'v3.9.59.0'").replace("'v3958_0'","'v3959_0'")
family=family.replace('app.v3958_0.js?v=3958_0','app.v3959_0.js?v=3959_0').replace('data-release="v3.9.58.0"','data-release="v3.9.59.0"')
family=family.replace("active.jsEntry.includes('js/app.v3958_0.js')","active.jsEntry.includes('js/app.v3959_0.js')")
family=family.replace("active.jsEntry.includes('js/ux/family-decision-bar.v3955_0.js')","active.jsEntry.includes('../shared/ui/shell/family-shell.v3959_0.js')")
family=family.replace('FAMILY_DECISION_V3958_OK','FAMILY_DECISION_V3959_OK')
write('tools/verify-family-decision-v3955.mjs',family)

print('UI_ORCHESTRATION_V3959_APPLIED')
