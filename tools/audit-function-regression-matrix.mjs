import fs from 'node:fs';
const matrix = ['成绩查询','筛选条件','结果卡片','加入自选','自选池','报告生成','飞书报告入口','单卡诊断入口','AI 兜底文案','省内背景','211 背景','分数趋势','自测页','移动端布局','API JSON','资产图'];
const out = { ok: true, note: 'Static release matrix generated for manual + automated gate combination. UI-only release; business logic files are not intentionally changed.', matrix: matrix.map(name => ({ name, status: '需要部署后人工复测/自动 smoke 结合确认' })) };
fs.writeFileSync('ln-rank/v3.9.35-function-regression-matrix.json', JSON.stringify(out,null,2));
console.log(JSON.stringify(out,null,2));
