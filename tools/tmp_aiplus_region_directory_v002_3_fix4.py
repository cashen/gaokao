from pathlib import Path
p=Path('functions/_lib/ai/school-directory-resource.js')
s=p.read_text()
old="function chooseCity(source,map,province){const rows=[];for(const [alias,items] of map){const index=source.indexOf(alias);if(index<0)continue;for(const item of items){if(province&&item.province&&item.province!==province)continue;rows.push({...item,index,matchLength:alias.length,matchedAlias:alias});}}rows.sort((a,b)=>a.index-b.index||b.matchLength-a.matchLength||a.city.localeCompare(b.city,'zh-CN'));return rows[0]||null;}"
new="function chooseCity(source,map,province){const rows=[];for(const [alias,items] of map){const index=source.indexOf(alias);if(index<0)continue;for(const item of items){if(province&&item.province&&item.province!==province)continue;if(province&&item.city===province&&!source.includes(`${compact(item.city)}市`))continue;rows.push({...item,index,matchLength:alias.length,matchedAlias:alias});}}rows.sort((a,b)=>a.index-b.index||b.matchLength-a.matchLength||a.city.localeCompare(b.city,'zh-CN'));return rows[0]||null;}"
if s.count(old)!=1: raise SystemExit(f'chooseCity occurrence {s.count(old)}')
s=s.replace(old,new,1)
old2="let selectedProvince=province,selectedCity=city;if(selectedProvince&&selectedCity&&selectedProvince.province===selectedCity.city&&!source.includes(`${compact(selectedCity.city)}市`))selectedCity=null;"
new2="let selectedProvince=province,selectedCity=city;"
if s.count(old2)!=1: raise SystemExit(f'post city ambiguity occurrence {s.count(old2)}')
p.write_text(s.replace(old2,new2,1))
