from pathlib import Path
p=Path('tools/verify-ai-school-history-bridge-v3992_2.mjs')
s=p.read_text()
s=s.replace('data-ai-plus-assets="aiplus-assets-v002_1"','data-ai-plus-assets="aiplus-assets-v002_3"')
s=s.replace('/aiplus/app.v3990_1.js?v=002_1','/aiplus/app.v3990_1.js?v=002_3')
p.write_text(s)
