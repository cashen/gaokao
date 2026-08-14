from pathlib import Path
p=Path('tools/verify-ai-region-school-directory-v002.mjs')
s=p.read_text()
old="for(const region of uniqueRegions){const query=region.type==='city'?`${region.province}${region.label}有哪些大学`:`${region.label}有哪些大学`;const out=await run(query);assertDirectory(out,{province:region.province,city:region.city||''});}"
new="for(const region of uniqueRegions){const query=region.type==='city'?`${region.province}${region.label}有哪些大学`:`${region.label}有哪些大学`;const out=await run(query);const expected=truthRows({province:region.province,city:region.city||''}).length,actual=Number(out.result?.regionSchools?.total||0);if(expected!==actual)throw new Error(`region matrix mismatch query=${query} expected=${expected} actual=${actual} resolved=${JSON.stringify(out.result?.regionSchools?.region||{})}`);assertDirectory(out,{province:region.province,city:region.city||''});}"
if s.count(old)!=1: raise SystemExit(f'matrix loop occurrence {s.count(old)}')
p.write_text(s.replace(old,new,1))
