from pathlib import Path
p=Path('functions/_lib/ai/school-directory-resource.js')
s=p.read_text()
old="if(province){for(const alias of unique([province,`${province}省`,`${province}市`],6)){const key=compact(alias);if(key&&!provinces.has(key))provinces.set(key,{type:'province',province,label:province,alias});}}"
new="if(province){for(const alias of unique([province,`${province}省`],6)){const key=compact(alias);if(key&&!provinces.has(key))provinces.set(key,{type:'province',province,label:province,alias});}}"
if s.count(old)!=1: raise SystemExit(f'province alias occurrence {s.count(old)}')
s=s.replace(old,new,1)
old2="function chooseCity(source,map,province){const rows=[];for(const [alias,items] of map){const index=source.indexOf(alias);if(index<0)continue;for(const item of items){if(province&&item.province&&item.province!==province)continue;if(province&&item.city===province&&!source.includes(`${compact(item.city)}市`))continue;rows.push({...item,index,matchLength:alias.length,matchedAlias:alias});}}rows.sort((a,b)=>a.index-b.index||b.matchLength-a.matchLength||a.city.localeCompare(b.city,'zh-CN'));return rows[0]||null;}"
new2="function chooseCity(source,map,province,provinceMatch=null){const rows=[];for(const [alias,items] of map){let from=0;while(from<source.length){const index=source.indexOf(alias,from);if(index<0)break;for(const item of items){if(province&&item.province&&item.province!==province)continue;const pStart=Number(provinceMatch?.index),pEnd=Number.isFinite(pStart)?pStart+Number(provinceMatch?.matchLength||0):-1,overlapsProvince=pEnd>=0&&index<pEnd&&index+alias.length>pStart,explicitSameCity=Boolean(province&&item.city===province&&source.startsWith(`${compact(item.city)}市`,index));if(overlapsProvince&&!explicitSameCity)continue;if(province&&item.city===province&&!explicitSameCity)continue;rows.push({...item,index,matchLength:alias.length,matchedAlias:alias});}from=index+Math.max(1,alias.length);}}rows.sort((a,b)=>a.index-b.index||b.matchLength-a.matchLength||a.city.localeCompare(b.city,'zh-CN'));return rows[0]||null;}"
if s.count(old2)!=1: raise SystemExit(f'chooseCity v4 occurrence {s.count(old2)}')
s=s.replace(old2,new2,1)
old3="const directory=await loadDirectory(context),province=chooseProvince(source,directory.aliases.provinces),city=chooseCity(source,directory.aliases.cities,province?.province||'');"
new3="const directory=await loadDirectory(context),province=chooseProvince(source,directory.aliases.provinces),city=chooseCity(source,directory.aliases.cities,province?.province||'',province);"
if s.count(old3)!=1: raise SystemExit(f'resolve chooseCity call {s.count(old3)}')
p.write_text(s.replace(old3,new3,1))
