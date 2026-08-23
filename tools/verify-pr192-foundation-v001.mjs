import fs from 'node:fs';

const required = [
  'docs/contracts/human-copy-contract-v001.md',
  'shared/resources/major/schema.v001.json',
  'shared/resources/major/contract.v001.md'
];

for (const file of required) {
  if (!fs.existsSync(file)) {
    throw new Error(`missing required foundation file: ${file}`);
  }
}

const forbidden = [
  'AI认为',
  '智能推荐',
  '精准预测',
  '成功率保证',
  '最佳选择',
  '闭眼选择'
];

const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) walk(path);
    else if (path.match(/\\.(js|md|html|json)$/)) files.push(path);
  }
}

walk('docs');
walk('shared');

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  for (const word of forbidden) {
    if (text.includes(word)) {
      throw new Error(`forbidden human-copy phrase found: ${word} in ${file}`);
    }
  }
}

console.log('PR192 foundation verification passed');
