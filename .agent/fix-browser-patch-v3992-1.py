from pathlib import Path
p=Path('tools/browser-ai-workspace-v3990_1.mjs')
text=p.read_text()
count=text.count('\\\n')
if count < 3:
    raise SystemExit(f'expected generated line continuations, found {count}')
p.write_text(text.replace('\\\n','\n'))
