import fs from 'node:fs';
const files = ['ln-rank/js/211-mainline/211-mainline-app.v3933_14.js','ln-rank/js/local-mainline/local-mainline-app.v3933_14.js','ln-rank/js/shared/api-client.js'];
const checks = files.map(file => {
  const text = fs.readFileSync(file,'utf8');
  return { file, hasFetchApiJson: text.includes('fetchApiJson') || text.includes('safeFetchJson'), nakedResJson: /\.json\s*\(/.test(text) && !file.endsWith('api-client.js'), exposesUnexpectedToken: /Unexpected token|<!DOCTYPE/.test(text) };
});
const passed = checks.every(c => c.hasFetchApiJson && !c.nakedResJson && !c.exposesUnexpectedToken);
console.log(JSON.stringify({ audit: 'audit-api-json-client-contract', version: 'v3.9.33.14', passed, checks }, null, 2));
if (!passed) process.exit(1);
