#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def write(path, text):
    (ROOT / path).write_text(text, encoding='utf-8')


def one(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected 1 occurrence, got {count}')
    return text.replace(old, new, 1)


page = read('tongxue/index.html')
page = one(page, 'tongxue-v155-direct-handoff-20260723', 'tongxue-v156-direct-result-20260723', 'build meta')
page = one(page, '.brand{color:var(--primary);font-weight:850;font-size:18px;text-decoration:none}.brand:hover{color:var(--brand-teal)}.back-home{color:var(--muted);font-size:13px;font-weight:750;text-decoration:none}.back-home:hover{color:var(--primary)}', '.brand{color:var(--primary);font-weight:850;font-size:18px;text-decoration:none}.brand:hover{color:var(--brand-teal)}.back-home{color:var(--muted);font-size:13px;font-weight:750;text-decoration:none}.back-home:hover{color:var(--primary)}.direct-change-school{border:0;background:transparent;padding:0;cursor:pointer}', 'change school style')
page = one(page, 'body:has(#result:not(:empty)) .hero-logo{width:clamp(210px,27vw,320px)}', 'body:has(#result:not(:empty)) .hero-logo{width:clamp(210px,27vw,320px)}\nbody.tongxue-direct-result .wrap{padding-top:18px}body.tongxue-direct-result #result>.result-shell,body.tongxue-direct-result #result>.state-card{margin-top:18px}body.tongxue-needs-confirmation .hero{padding-top:24px}', 'direct result CSS')
page = one(page, '同学你好 v1.5.5 · 更新于 2026-07-23 · 查看更新记录', '同学你好 v1.5.6 · 更新于 2026-07-23 · 查看更新记录', 'footer version')
page = one(page, './app/tongxue-performance-v155.js?v=155', './app/tongxue-performance-v156.js?v=156', 'entry script')
write('tongxue/index.html', page)

changelog = read('tongxue/changelog.html')
old = '<article class="release"><div class="release-head"><div><span class="badge">当前版本</span><h2>v1.5.5</h2></div><time class="date">2026-07-23</time></div><p class="release-note">从专业卡进入时，学校名称明确会自动查询并直接展示结果；存在歧义时仍会请用户确认。</p></article>'
new = '<article class="release"><div class="release-head"><div><span class="badge">当前版本</span><h2>v1.5.6</h2></div><time class="date">2026-07-23</time></div><p class="release-note">从专业卡直达学校时，只展示查询结果；学校名称有歧义或未匹配时，才保留搜索和候选学校。</p></article>\n    <article class="release"><div class="release-head"><h2>v1.5.5</h2><time class="date">2026-07-23</time></div><p class="release-note">从专业卡进入时，学校名称明确会自动查询并直接展示结果；存在歧义时仍会请用户确认。</p></article>'
changelog = one(changelog, old, new, 'changelog')
write('tongxue/changelog.html', changelog)

headers = read('_headers')
block = '\n/tongxue/app/tongxue-performance-v156.js\n  Cache-Control: public, max-age=31536000, immutable\n/tongxue/app/tongxue-direct-result-v156.js\n  Cache-Control: public, max-age=31536000, immutable\n'
if '/tongxue/app/tongxue-performance-v156.js' not in headers:
    headers += block
write('_headers', headers)

for rel in [
    'tools/tongxue/verify-directory.mjs',
    'tools/tongxue/verify-brand-ui-v152.mjs',
    'tools/tongxue/verify-interaction-v153.mjs',
    'tools/tongxue/verify-school-region-ui-v150.mjs',
    'tools/tongxue/verify-share.mjs'
]:
    text = read(rel)
    text = text.replace('tongxue-performance-v155.js', 'tongxue-performance-v156.js')
    text = text.replace('tongxue-v155-direct-handoff-20260723', 'tongxue-v156-direct-result-20260723')
    text = text.replace('同学你好 v1.5.5', '同学你好 v1.5.6')
    text = text.replace("'v1.5.5'", "'v1.5.6'")
    text = text.replace("pageVersion:'v1.5.5'", "pageVersion:'v1.5.6'")
    text = text.replace('v=155', 'v=156')
    write(rel, text)

verify = read('tools/tongxue/verify-directory.mjs')
verify = verify.replace("changelog.indexOf('v1.5.5')<changelog.indexOf('v1.5.4')", "changelog.indexOf('v1.5.6')<changelog.indexOf('v1.5.5')&&changelog.indexOf('v1.5.5')<changelog.indexOf('v1.5.4')")
write('tools/tongxue/verify-directory.mjs', verify)

print('Tongxue v1.5.6 direct result patch applied')
