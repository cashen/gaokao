from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FILES = [
    'tools/ln-2026/rebuild-centered-trend-analysis.py',
    'ln2026.html',
    'lngk2026.html',
    'ln-rank/major-trend-2026.html',
]
REPLACEMENTS = {
    '不做录取保证': '不承诺录取结果',
    '连续后移也不等于可以保证录取': '连续后移也不能据此确定录取',
    '也不等于可以保证录取': '也不能据此确定录取',
}

for relative in FILES:
    path = ROOT / relative
    text = path.read_text(encoding='utf-8')
    original = text
    for old, new in REPLACEMENTS.items():
        text = text.replace(old, new)
    if text != original:
        path.write_text(text, encoding='utf-8')
        print('patched', relative)
