const PINYIN_BOUNDARIES=Object.freeze([
['a','阿'],['b','八'],['c','嚓'],['d','搭'],['e','蛾'],['f','发'],['g','噶'],['h','哈'],['j','击'],['k','喀'],['l','垃'],['m','妈'],['n','拿'],['o','哦'],['p','啪'],['q','期'],['r','然'],['s','撒'],['t','塌'],['w','挖'],['x','昔'],['y','压'],['z','匝']
]);

const PHRASE_INITIALS=Object.freeze([
['哈尔滨','heb'],['呼和浩特','hhht'],['乌鲁木齐','wlmq'],['克拉玛依','klmy'],['石家庄','sjz'],['西双版纳','xsbn'],['巴音郭楞','bygl'],
['重庆','cq'],['长春','cc'],['长沙','cs'],['长江','cj'],['长安','ca'],['长城','cc'],['长治','cz'],['长白','cb'],['长征','cz'],
['厦门','xm'],['六安','la'],['乐山','ls'],['乐清','yq'],['西藏','xz'],['朝阳','cy'],['番禺','py']
].sort((a,b)=>b[0].length-a[0].length));

const collator=new Intl.Collator('zh-Hans-CN-u-co-pinyin',{usage:'sort',sensitivity:'base'});
const charCache=new Map();

export function normalizeInitialQuery(value){
  return String(value||'').normalize('NFKC').toLowerCase().replace(/[^a-z0-9]+/g,'');
}

export function toPinyinInitials(value){
  const text=String(value||'').normalize('NFKC').toLowerCase();
  let output='';
  for(let index=0;index<text.length;){
    const phrase=PHRASE_INITIALS.find(([word])=>text.startsWith(word,index));
    if(phrase){output+=phrase[1];index+=phrase[0].length;continue;}
    const char=text[index];
    if(/[a-z0-9]/.test(char)){output+=char;index+=1;continue;}
    if(/\p{Script=Han}/u.test(char))output+=initialForHan(char);
    index+=1;
  }
  return normalizeInitialQuery(output);
}

export function createSchoolInitialCodes(officialName,providedCodes=[]){
  const codes=new Set();
  const officialCode=toPinyinInitials(officialName);
  if(officialCode.length>=2)codes.add(officialCode);
  for(const raw of Array.isArray(providedCodes)?providedCodes:[providedCodes]){
    const direct=normalizeInitialQuery(raw);
    if(direct.length>=2)codes.add(direct);
  }
  return [...codes].sort((a,b)=>b.length-a.length||a.localeCompare(b));
}

function initialForHan(char){
  if(charCache.has(char))return charCache.get(char);
  let low=0,high=PINYIN_BOUNDARIES.length-1,answer='';
  while(low<=high){
    const middle=(low+high)>>1;
    if(collator.compare(char,PINYIN_BOUNDARIES[middle][1])>=0){answer=PINYIN_BOUNDARIES[middle][0];low=middle+1;}
    else high=middle-1;
  }
  charCache.set(char,answer);
  return answer;
}
