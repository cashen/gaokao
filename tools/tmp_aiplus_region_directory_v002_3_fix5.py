from pathlib import Path
p=Path('tools/verify-ai-region-school-directory-v002.mjs')
s=p.read_text()
old="const query=region.type==='city'?`${region.province}${region.label}有哪些大学`:`${region.label}有哪些大学`;"
new="const query=region.type==='city'?(region.province===region.label?`${region.label}市有哪些大学`:`${region.province}${region.label}有哪些大学`):`${region.label}有哪些大学`;"
if s.count(old)!=1: raise SystemExit(f'query constructor occurrence {s.count(old)}')
p.write_text(s.replace(old,new,1))
