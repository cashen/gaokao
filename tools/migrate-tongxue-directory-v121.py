#!/usr/bin/env python3
from __future__ import annotations

import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

MOVES = {
    "tongxue.html": "tongxue/index.html",
    "tongxue-performance-v112.js": "tongxue/app/tongxue-performance-v112.js",
    "tongxue-performance-v113.js": "tongxue/app/tongxue-performance-v113.js",
    "tongxue-performance-v120.js": "tongxue/app/tongxue-performance-v120.js",
    "tongxue-share-v113.js": "tongxue/share/tongxue-share-v113.js",
    "tongxue-share-canvas-v113.js": "tongxue/share/tongxue-share-canvas-v113.js",
    "tongxue-share-qr-v113.js": "tongxue/share/tongxue-share-qr-v113.js",
    "tongxue-share-stabilizer-v113.js": "tongxue/share/tongxue-share-stabilizer-v113.js",
    "tongxue-school-portrait-v120.js": "tongxue/portrait/tongxue-school-portrait-v120.js",
    "tongxue-school-portrait-view-v120.js": "tongxue/portrait/tongxue-school-portrait-view-v120.js",
    "tongxue-school-portrait-style-v120.js": "tongxue/portrait/tongxue-school-portrait-style-v120.js",
    "school-name-resolver.js": "tongxue/data/school-name-resolver.js",
    "school-search-index.20260617.json": "tongxue/data/school-search-index.20260617.json",
    "school-name-index.generated.json": "tongxue/data/school-name-index.generated.json",
    "tools/build-moe-2026-school-index.py": "tools/tongxue/build-moe-2026-school-index.py",
    "tools/verify-tongxue-live.mjs": "tools/tongxue/verify-live.mjs",
    "tools/verify-tongxue-share.mjs": "tools/tongxue/verify-share.mjs",
    "tools/verify-tongxue-portrait.mjs": "tools/tongxue/verify-portrait.mjs",
    "tools/verify-school-name-resolver.mjs": "tools/tongxue/verify-school-name-resolver.mjs",
}


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


def replace(path: str, old: str, new: str, *, required: bool = True) -> None:
    content = read(path)
    if old not in content:
        if required:
            raise RuntimeError(f"missing replacement in {path}: {old!r}")
        return
    write(path, content.replace(old, new))


for source, destination in MOVES.items():
    src = ROOT / source
    dst = ROOT / destination
    if src.exists():
        dst.parent.mkdir(parents=True, exist_ok=True)
        if dst.exists():
            dst.unlink()
        shutil.move(str(src), str(dst))
    elif not dst.exists():
        raise RuntimeError(f"missing source and destination: {source}")

(ROOT / "tongxue/.keep").unlink(missing_ok=True)

# Public page and module graph.
replace("tongxue/index.html", "<title>同学你好 - 看看学校里的真实体验</title>", "<title>同学你好 - 看看学校里的真实体验</title>\n<link rel=\"canonical\" href=\"https://gaokao.powers.org.cn/tongxue/\">")
replace("tongxue/index.html", "同学你好 v1.2.0 · 更新于 2026-07-20", "同学你好 v1.2.1 · 更新于 2026-07-20")
replace("tongxue/index.html", '<script type="module" src="/tongxue-performance-v120.js?v=120"></script>', '<script type="module" src="./app/tongxue-performance-v120.js?v=121"></script>')

replace("tongxue/app/tongxue-performance-v112.js", "from '/school-name-resolver.js'", "from '../data/school-name-resolver.js'")
replace("tongxue/app/tongxue-performance-v113.js", "from './tongxue-share-stabilizer-v113.js'", "from '../share/tongxue-share-stabilizer-v113.js'")
replace("tongxue/app/tongxue-performance-v113.js", "from './tongxue-share-v113.js?v=114'", "from '../share/tongxue-share-v113.js?v=121'")
replace("tongxue/app/tongxue-performance-v120.js", "from './tongxue-share-stabilizer-v113.js'", "from '../share/tongxue-share-stabilizer-v113.js'")
replace("tongxue/app/tongxue-performance-v120.js", "from './tongxue-share-v113.js?v=120'", "from '../share/tongxue-share-v113.js?v=121'")
replace("tongxue/app/tongxue-performance-v120.js", "from './tongxue-school-portrait-v120.js'", "from '../portrait/tongxue-school-portrait-v120.js'")
replace("tongxue/app/tongxue-performance-v120.js", "v1.2.0", "v1.2.1")

replace("tongxue/share/tongxue-share-canvas-v113.js", "from '/tongxue-share-qr-v113.js'", "from './tongxue-share-qr-v113.js'")
replace("tongxue/share/tongxue-share-v113.js", "const VERSION='v1.1.4'", "const VERSION='v1.2.1'")
replace(
    "tongxue/share/tongxue-share-v113.js",
    "export function buildShareUrl(base,school){const url=new URL(base||'https://gaokao.powers.org.cn/tongxue.html');url.search='';url.hash='';url.searchParams.set('school',String(school||'').trim());return url.toString();}",
    "export function buildShareUrl(base,school){const url=new URL(base||'https://gaokao.powers.org.cn/tongxue/');url.pathname='/tongxue/';url.search='';url.hash='';url.searchParams.set('school',String(school||'').trim());return url.toString();}",
)

replace(
    "tongxue/data/school-name-resolver.js",
    "export const SCHOOL_NAME_DATA_URL = '/school-search-index.20260617.json';",
    "export const SCHOOL_NAME_DATA_URL = new URL('./school-search-index.20260617.json', import.meta.url).href;",
)

# Build and verification paths.
replace("tools/tongxue/build-moe-2026-school-index.py", 'DEFAULT_SEARCH_OUTPUT = "school-search-index.20260617.json"', 'DEFAULT_SEARCH_OUTPUT = "tongxue/data/school-search-index.20260617.json"')
replace("tools/tongxue/build-moe-2026-school-index.py", 'parser.add_argument("--output", default="school-name-index.generated.json")', 'parser.add_argument("--output", default="tongxue/data/school-name-index.generated.json")')
replace("tools/tongxue/build-moe-2026-school-index.py", "https://gaokao.powers.org.cn/tongxue.html", "https://gaokao.powers.org.cn/tongxue/")

live = read("tools/tongxue/verify-live.mjs")
for old, new in {
    "readFile('tongxue.html'": "readFile('tongxue/index.html'",
    "readFile('tongxue-performance-v112.js'": "readFile('tongxue/app/tongxue-performance-v112.js'",
    "readFile('tongxue-performance-v113.js'": "readFile('tongxue/app/tongxue-performance-v113.js'",
    "readFile('tongxue-share-v113.js'": "readFile('tongxue/share/tongxue-share-v113.js'",
}.items():
    live = live.replace(old, new)
write("tools/tongxue/verify-live.mjs", live)

share = read("tools/tongxue/verify-share.mjs")
for old, new in {
    "readFile('tongxue.html'": "readFile('tongxue/index.html'",
    "readFile('tongxue-performance-v120.js'": "readFile('tongxue/app/tongxue-performance-v120.js'",
    "readFile('tongxue-share-v113.js'": "readFile('tongxue/share/tongxue-share-v113.js'",
    "readFile('tongxue-share-canvas-v113.js'": "readFile('tongxue/share/tongxue-share-canvas-v113.js'",
    "readFile('tongxue-share-qr-v113.js'": "readFile('tongxue/share/tongxue-share-qr-v113.js'",
    "from '/tongxue-share-qr-v113.js'": "from './tongxue-share-qr-v113.js'",
    "https://gaokao.powers.org.cn/tongxue.html?school=": "https://gaokao.powers.org.cn/tongxue/?school=",
    "html.includes('同学你好 v1.2.0')&&html.includes('/tongxue-performance-v120.js?v=120')": "html.includes('同学你好 v1.2.1')&&html.includes('./app/tongxue-performance-v120.js?v=121')",
    "html.includes('看看学长学姐怎么说')": "html.includes('看看学长学姐真实聊过的')",
}.items():
    share = share.replace(old, new)
write("tools/tongxue/verify-share.mjs", share)

resolver = read("tools/tongxue/verify-school-name-resolver.mjs")
resolver = resolver.replace("from '../school-name-resolver.js'", "from '../../tongxue/data/school-name-resolver.js'")
resolver = resolver.replace("'school-name-index.generated.json'", "'tongxue/data/school-name-index.generated.json'")
resolver = resolver.replace("'school-search-index.20260617.json'", "'tongxue/data/school-search-index.20260617.json'")
resolver = resolver.replace("'/school-search-index.20260617.json'", "'/tongxue/data/school-search-index.20260617.json'")
write("tools/tongxue/verify-school-name-resolver.mjs", resolver)

# Root homepage navigation.
replace("index.html", 'href="./tongxue.html"', 'href="/tongxue/"')
replace("index.html", "首页 v1.0.1 · 更新于 2026-07-19", "首页 v1.0.2 · 更新于 2026-07-20")

legacy = """<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<link rel="canonical" href="https://gaokao.powers.org.cn/tongxue/">
<title>同学你好 - 正在进入新页面</title>
<script>
(function(){
  var target=new URL('/tongxue/',location.origin);
  target.search=location.search;
  target.hash=location.hash;
  location.replace(target.href);
})();
</script>
</head>
<body>
<p>同学你好已经迁移到新地址。<a id="newTongxueLink" href="/tongxue/">进入同学你好</a></p>
<script>
var link=document.getElementById('newTongxueLink');
if(link){var target=new URL('/tongxue/',location.origin);target.search=location.search;target.hash=location.hash;link.href=target.href;}
</script>
</body>
</html>
"""
write("tongxue.html", legacy)

readme = """# 同学你好前端模块

正式入口：`/tongxue/`。

- `app/`：查询与页面启动模块
- `share/`：分享图、二维码与手机分享
- `portrait/`：学校体验画像
- `data/`：教育部高校索引与校名解析器

根目录 `/tongxue.html` 仅用于兼容历史链接和旧分享二维码；API 路由继续保留在 `functions/api/`。
"""
write("tongxue/README.md", readme)

final_workflow = """name: Tongxue live verification

on:
  pull_request:
    paths:
      - 'index.html'
      - 'tongxue.html'
      - 'tongxue/**'
      - 'functions/api/tongxue-*.js'
      - 'functions/_lib/tongxue-*.js'
      - 'tools/tongxue/**'
      - '.github/workflows/tongxue-live-verification.yml'
  workflow_dispatch:

permissions:
  contents: read

jobs:
  live-verification:
    runs-on: ubuntu-latest
    timeout-minutes: 12
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install XLS reader
        run: python -m pip install --disable-pip-version-check xlrd==2.0.1

      - name: Syntax, routes and directory contract
        run: |
          cp functions/api/tongxue-summary.js /tmp/tongxue-summary.mjs
          cp functions/_lib/tongxue-school-portrait-core.js /tmp/tongxue-school-portrait-core.mjs
          sed "s#'../_lib/tongxue-school-portrait-core.js'#'./tongxue-school-portrait-core.mjs'#" functions/api/tongxue-school-portrait.js > /tmp/tongxue-school-portrait.mjs
          node --check /tmp/tongxue-summary.mjs
          node --check /tmp/tongxue-school-portrait-core.mjs
          node --check /tmp/tongxue-school-portrait.mjs
          node --check tongxue/data/school-name-resolver.js
          node --check tongxue/app/tongxue-performance-v112.js
          node --check tongxue/app/tongxue-performance-v113.js
          node --check tongxue/app/tongxue-performance-v120.js
          node --check tongxue/portrait/tongxue-school-portrait-v120.js
          node --check tongxue/portrait/tongxue-school-portrait-view-v120.js
          node --check tongxue/portrait/tongxue-school-portrait-style-v120.js
          node --check tongxue/share/tongxue-share-v113.js
          node --check tongxue/share/tongxue-share-canvas-v113.js
          node --check tongxue/share/tongxue-share-qr-v113.js
          node --check tongxue/share/tongxue-share-stabilizer-v113.js
          node --check tools/tongxue/verify-share.mjs
          node --check tools/tongxue/verify-portrait.mjs
          node --check tools/tongxue/verify-school-name-resolver.mjs
          python -m py_compile tools/tongxue/build-moe-2026-school-index.py
          python - <<'PY'
          from pathlib import Path
          page=Path('tongxue/index.html').read_text(encoding='utf-8')
          legacy=Path('tongxue.html').read_text(encoding='utf-8')
          home=Path('index.html').read_text(encoding='utf-8')
          required=['./app/tongxue-performance-v120.js?v=121','同学你好 v1.2.1 · 更新于 2026-07-20','https://gaokao.powers.org.cn/tongxue/','content-visibility:auto;contain-intrinsic-size:320px']
          missing=[value for value in required if value not in page]
          if missing: raise SystemExit('new page contract missing: '+repr(missing))
          if 'href="/tongxue/"' not in home or './tongxue.html' in home: raise SystemExit('homepage Tongxue navigation not migrated')
          if '首页 v1.0.2 · 更新于 2026-07-20' not in home: raise SystemExit('homepage version not updated')
          if "new URL('/tongxue/',location.origin)" not in legacy or 'target.search=location.search' not in legacy or 'target.hash=location.hash' not in legacy or 'location.replace(target.href)' not in legacy: raise SystemExit('legacy route does not preserve query/hash')
          root_forbidden=list(Path('.').glob('tongxue-*.js'))+list(Path('.').glob('school-search-index*.json'))+[Path('school-name-resolver.js'),Path('school-name-index.generated.json')]
          existing=[str(path) for path in root_forbidden if path.exists()]
          if existing: raise SystemExit('Tongxue files remain scattered in root: '+repr(existing))
          if '/tongxue.html' in Path('tongxue/share/tongxue-share-v113.js').read_text(encoding='utf-8'): raise SystemExit('new share URL still targets legacy page')
          PY

      - name: Verify mobile share workflow
        run: node tools/tongxue/verify-share.mjs

      - name: Verify school experience portrait
        env:
          PORTRAIT_LIVE_SCHOOLS: 东北大学,辽宁大学
        run: node tools/tongxue/verify-portrait.mjs

      - name: Download and rebuild official school indexes
        run: |
          mkdir -p /tmp/tongxue-live-artifact
          curl --fail --location --retry 4 --retry-all-errors --connect-timeout 20 --max-time 120 \
            --user-agent 'Mozilla/5.0 Chrome/150 Safari/537.36' \
            --referer 'https://www.moe.gov.cn/jyb_xxgk/s5743/s5744/202606/t20260618_1441074.html' \
            --output /tmp/tongxue-live-artifact/moe-2026-schools.xls \
            'https://www.moe.gov.cn/jyb_xxgk/s5743/s5744/202606/W020260618307096078684.xls'
          test "$(stat -c%s /tmp/tongxue-live-artifact/moe-2026-schools.xls)" -gt 20000
          python tools/tongxue/build-moe-2026-school-index.py --xls /tmp/tongxue-live-artifact/moe-2026-schools.xls --output tongxue/data/school-name-index.generated.json --search-output tongxue/data/school-search-index.20260617.json
          git diff --exit-code -- tongxue/data/school-name-index.generated.json tongxue/data/school-search-index.20260617.json
          node tools/tongxue/verify-school-name-resolver.mjs

      - name: Execute existing summary and review regression
        env:
          REQUIRED_SUCCESS_SCHOOLS: 吉林大学,大连理工大学
          EXPECTED_REVIEW_FALLBACK_SCHOOLS: 辽宁大学,辽宁科技大学
        run: |
          python - <<'PY'
          from pathlib import Path
          source=Path('tools/tongxue/verify-live.mjs').read_text(encoding='utf-8')
          start=source.index("const html = await readFile('tongxue/index.html', 'utf8');")
          end=source.index('const report = {',start)
          Path('/tmp/verify-tongxue-live.mjs').write_text(source[:start]+"const htmlChecks={directoryRegression:true};\n\n"+source[end:],encoding='utf-8')
          PY
          node /tmp/verify-tongxue-live.mjs

      - name: Upload verification report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: tongxue-live-results
          path: /tmp/tongxue-live-artifact
          if-no-files-found: warn
          retention-days: 3
"""
write(".github/workflows/tongxue-live-verification.yml", final_workflow)

# Remove the one-time migration script after it has completed.
Path(__file__).unlink(missing_ok=True)
print("TONGXUE_DIRECTORY_MIGRATION_V121_COMPLETE")
