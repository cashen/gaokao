import { readFile, writeFile } from 'node:fs/promises';
import { createSchoolInitialCodes } from '../../tongxue/data/school-pinyin-initials-v141.js';

const target=process.argv[2]||'tongxue/data/school-search-index.20260617-v150.json';
const CURATED_CODES=Object.freeze({'辽宁科技大学':['lkd']});
const payload=JSON.parse(await readFile(target,'utf8'));
if(payload.buildId!=='tongxue-v150-region-20260617'||!Array.isArray(payload.schools)||payload.schools.length!==Number(payload.count||0))throw new Error('v1.5.0 地域索引结构或版本异常。');
payload.schools=payload.schools.map((row)=>{
  if(!Array.isArray(row)||row.length<5||!String(row[0]||'').trim()||!String(row[1]||'').trim()||!String(row[2]||'').trim())throw new Error('地域索引存在无效记录。');
  const name=String(row[0]).trim();
  return [name,String(row[1]).trim(),String(row[2]).trim(),String(row[3]||'').trim(),createSchoolInitialCodes(name,CURATED_CODES[name]||[])];
});
const byName=new Map(payload.schools.map((row)=>[row[0],row]));
assertCodes(byName,'辽宁科技大学',['lnkjdx','lkd'],['lnkj']);
assertCodes(byName,'辽宁科技学院',['lnkjxy'],['lnkj']);
assertCodes(byName,'东北大学',['dbdx'],[]);
await writeFile(target,JSON.stringify(payload)+'\n','utf8');
console.log('TONGXUE_REGION_INITIAL_BUILD '+JSON.stringify({target,count:payload.schools.length,bytes:(await readFile(target)).length}));
function assertCodes(index,name,required,forbidden){const codes=index.get(name)?.[4]||[];for(const code of required)if(!codes.includes(code))throw new Error(`${name} 缺少首字母代码 ${code}`);for(const code of forbidden)if(codes.includes(code))throw new Error(`${name} 不应包含自动短代码 ${code}`);}
