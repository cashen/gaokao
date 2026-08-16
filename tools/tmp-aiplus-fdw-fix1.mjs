import fs from 'node:fs';

function patch(path,needle,replacement){
  const source=fs.readFileSync(path,'utf8');
  if(!source.includes(needle))throw new Error(`Missing patch target in ${path}`);
  const next=source.replace(needle,replacement);
  if(next===source)throw new Error(`No change for ${path}`);
  fs.writeFileSync(path,next);
}

patch(
  'functions/_lib/ai/parent-semantic-frame.js',
  "if(!/(不喜欢|不想|讨厌|排斥).{0,4}(编程|写代码|代码)/.test(s)&&/(喜欢|愿意|能接受).{0,4}(编程|写代码|代码)/.test(s))push('programming_affinity','accept');",
  "if(!/(不喜欢|不想|讨厌|排斥).{0,4}(编程|写代码|代码)/.test(s)&&(/(喜欢|愿意|能接受|可以接受).{0,4}(编程|写代码|代码)/.test(s)||/(编程|写代码|代码).{0,4}(可以接受|能接受|愿意|喜欢)/.test(s)))push('programming_affinity','accept');"
);

patch(
  'aiplus/index.html',
  '招生分数来自站内确定性数据；学校、专业和政策事实有可靠依据才下结论，拿不到就明确告诉你。',
  '招生分数来自站内确定性数据；学校官方资料优先核对阳光高考等可验证官方来源，学校、专业和政策事实拿不到可靠依据就明确告诉你。'
);

console.log('FDW fix1 applied');
