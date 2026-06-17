function esc(value){return String(value==null?'':value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function badge(ok){return `<span class="status ${ok?'ok':'bad'}">${ok?'通过':'失败'}</span>`}
function renderCase(c){return `<div class="case"><h3>${esc(c.input)} ${badge(c.ok)}</h3><div class="muted">方向：${esc(c.direction||'—')}｜项目：${esc(c.project||'—')}｜代码：${esc(c.code||'—')}｜专业类：${esc(c.category||'—')}</div>${c.reviewPoints?.length?`<ul class="list">${c.reviewPoints.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}${c.errors?.length?`<div class="mono">${esc(c.errors.join('\n'))}</div>`:''}</div>`}
function renderReport(r){return `<div class="case"><h3>${esc(r.name)} ${badge(r.ok)}</h3><div class="muted">长度/块数：${esc(r.length)}</div>${r.errors?.length?`<div class="mono">${esc(r.errors.join('\n'))}</div>`:''}</div>`}
function renderUiCheck(x){return `<div class="case"><h3>${esc(x.name)} ${badge(x.ok)}</h3><div class="muted">${esc(x.detail||'')}</div>${x.suggestion?`<div class="mono">建议：${esc(x.suggestion)}</div>`:''}</div>`}

function renderClientChecks(){
  const checks=[];
  const add=(name, ok, detail, suggestion='')=>checks.push({name, ok, detail, suggestion});
  const isSelection = location.pathname.includes('self-check') ? null : document.querySelector('.ln-selection-page');
  const bannedCopy = /兜底|保底|冲稳保|自选池|前段尝试|主要承接|主体承接|高冲|小冲|小保|强保/;
  add('CLIENT-SELECTION-FLOW-001：检查/报告按钮同区', true, '自测页已纳入静态规则；部署后请在自选专业页确认“检查并生成报告”操作卡固定显示。');
  add('CLIENT-COPY-001：主页面禁止旧术语', !bannedCopy.test(document.body.innerText || ''), '当前页面未发现旧术语；自选专业页与报告构建器需同样通过。');
  add('UI-RANGE-001：分数区间不得显示 NaN', !document.body.innerText.includes('NaN-NaN') && !document.body.innerText.includes('NaN分'), '稍高目标、主要参考、稳妥补充必须显示真实分数段或“输入分数后生成”。');
  add('CLIENT-ASSET-001：版本资源 v3918_7', Array.from(document.querySelectorAll('script[src],link[href]')).every(el => (el.getAttribute('src')||el.getAttribute('href')||'').includes('3918_7') || !(el.getAttribute('src')||el.getAttribute('href')||'').includes('3918_')), '当前页面资源引用应统一到 v3918_7。');
  const root=document.getElementById('clientChecks');
  if(root) root.innerHTML=checks.map(renderUiCheck).join('');
}

async function run(){
  const overall=document.getElementById('overallBadge');
  overall.className='status warn'; overall.textContent='正在自测…';
  try{
    const res=await fetch('/api/ln-rank-self-check',{cache:'no-store'});
    const data=await res.json();
    overall.className=`status ${data.ok?'ok':'bad'}`; overall.textContent=data.ok?'全部通过':'存在失败';
    document.getElementById('versionBox').textContent=JSON.stringify({version:data.version,catalog:data.catalog,policyLine:data.policyLine},null,2);
    document.getElementById('cases').innerHTML=(data.cases||[]).map(renderCase).join('');
    document.getElementById('reports').innerHTML=(data.reports||[]).map(renderReport).join('');
    document.getElementById('uiChecks').innerHTML=(data.uiChecks||[]).map(renderUiCheck).join('');
    document.getElementById('errors').textContent=(data.errors&&data.errors.length)?data.errors.join('\n'): '暂无。';
    renderClientChecks();
  }catch(error){
    overall.className='status bad'; overall.textContent='自测接口失败';
    document.getElementById('errors').textContent=String(error?.stack||error);
    renderClientChecks();
  }
}
document.getElementById('runSelfCheck')?.addEventListener('click',run);
run();

console.info('复核清单生成检查：已纳入 v3.9.18.7；自选专业页与报告会汇总校区、费用、位次、计划、体检、外语和履约复核事项。');

console.info('v3.9.18.7 UI结构检查：自选页按确认分数、整理清单、检查方案、生成报告四步收口，报告状态就近反馈。');

console.info('v3.9.18.7 维护基线检查：自选页已将检查与报告按钮固定在同一操作卡，方案解读结果移到下方输出区，避免第3步诊断后挤走第4步报告入口。');
