from pathlib import Path
p=Path('tools/browser-ai-workspace-v3990_1.mjs')
text=p.read_text()
count=text.count('\\nasync function')
if count < 3:
    raise SystemExit(f'expected generated literal newline boundaries, found {count}')
text=text.replace('\\nasync function','\nasync function')
text=text.replace('\\n\nasync function selectionAndModel','\nasync function selectionAndModel')
text=text.replace('\\nasync function selectionAndModel','\nasync function selectionAndModel')
p.write_text(text)
