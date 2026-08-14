from pathlib import Path
p=Path('tools/verify-ai-region-school-directory-v002.mjs')
s=p.read_text()
old="for(const region of uniqueRegions){const out=await run(`${region.label}有哪些大学`);assertDirectory(out,{province:region.province,city:region.city||''});}"
new="for(const region of uniqueRegions){const query=region.type==='city'?`${region.province}${region.label}有哪些大学`:`${region.label}有哪些大学`;const out=await run(query);assertDirectory(out,{province:region.province,city:region.city||''});}\nassertDirectory(await run('吉林有那些大学'),{province:'吉林'});\nassertDirectory(await run('吉林市有哪些大学'),{province:'吉林',city:'吉林'});"
if s.count(old)!=1: raise SystemExit(f'full-region loop occurrence {s.count(old)}')
p.write_text(s.replace(old,new,1))
