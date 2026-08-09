from pathlib import Path
p=Path('tools/browser-ai-workspace-v3990_1.mjs')
text=p.read_text()
count=text.count('\\nasync function')
if count < 3:
    raise SystemExit(f'expected generated literal newline boundaries, found {count}')
p.write_text(text.replace('\\nasync function','\nasync function'))
