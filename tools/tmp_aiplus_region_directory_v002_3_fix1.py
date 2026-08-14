from pathlib import Path
p=Path('tools/verify-ai-region-school-directory-v002.mjs')
s=p.read_text()
old="assert(shenyang.blocks.find(x=>x.type==='next_questions')?.items?.some(x=>/介绍下/.test(x.prompt)),'school research continuation missing');"
new="assert(!shenyang.blocks.find(x=>x.type==='next_questions')?.items?.some(x=>x.id==='region-first-school'||/继续看/.test(x.label||'')),'directory must not invent a first-school recommendation');"
if s.count(old)!=1: raise SystemExit(f'expected old first-school assertion once, got {s.count(old)}')
p.write_text(s.replace(old,new,1))
