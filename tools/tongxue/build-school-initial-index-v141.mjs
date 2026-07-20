import { readFile, writeFile } from 'node:fs/promises';
import { createSchoolInitialCodes } from '../../tongxue/data/school-pinyin-initials-v141.js';

const target=process.argv[2]||'tongxue/data/school-search-index.20260617.json';
const CURATED_CODES=Object.freeze({
  '辽宁科技大学':['lkd']
});

const payload=JSON.parse(await readFile(target,'utf8'));
if(!Array.isArray(payload.schools)||payload.schools.length!==Number(payload.count||0)){
  throw new Error('高校搜索索引结构或数量异常。');
}

payload.schools=payload.schools.map((row)=>{
  if(!Array.isArray(row)||!String(row[0]||'').trim())throw new Error('高校搜索索引存在无效记录。');
  const name=String(row[0]).trim();
  const codes=createSchoolInitialCodes(name,CURATED_CODES[name]||[]);
  if(!codes.length)throw new Error(`学校首字母代码为空：${name}`);
  return [name,String(row[1]||''),String(row[2]||''),codes];
});

const byName=new Map(payload.schools.map((row)=>[row[0],row]));
assertCodes(byName,'辽宁科技大学',['lnkjdx','lkd'],['lnkj']);
assertCodes(byName,'辽宁科技学院',['lnkjxy'],['lnkj']);
assertCodes(byName,'东北大学',['dbdx'],[]);

await writeFile(target,JSON.stringify(payload)+'\n','utf8');
console.log('TONGXUE_INITIAL_INDEX_BUILD '+JSON.stringify({target,count:payload.schools.length,bytes:(await readFile(target)).length}));

function assertCodes(index,name,required,forbidden){
  const codes=index.get(name)?.[3]||[];
  for(const code of required)if(!codes.includes(code))throw new Error(`${name} 缺少首字母代码 ${code}`);
  for(const code of forbidden)if(codes.includes(code))throw new Error(`${name} 不应包含自动短代码 ${code}`);
}
