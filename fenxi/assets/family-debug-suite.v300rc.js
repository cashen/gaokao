// V3.0RC debug one-click suite. No password / cookie / secret is collected.
(function(){
  'use strict';
  var VERSION='300rc-debug-suite-20260520';
  function $(id){return document.getElementById(id)}
  function now(){return new Date().toISOString()}
  function safeJson(v){try{return JSON.stringify(v,null,2)}catch(e){return String(v)}}
  async function fetchJson(path){var r=await fetch(path,{cache:'no-store'}); if(!r.ok)throw new Error(path+' HTTP '+r.status); return r.json();}
  function majorText(r){return String((r&&(r.majorText||r.cleanMajor||r.major||r.admissionMajor))||'');}
  function classifyPath(row){var m=majorText(row).replace(/\s+/g,'');
    if(/法学|公安|思想政治|社会工作|行政管理|公共管理|马克思主义/.test(m))return 'public_service';
    if(/师范|小学教育|学前教育|特殊教育|教育学/.test(m))return 'teacher';
    if(/会计|审计|财务|财政|税收|统计/.test(m))return 'accounting';
    if(/计算机|软件|人工智能|网络|数据|物联网|信息管理|电子商务/.test(m))return 'computer';
    if(/电气|智能电网|电力|能源与动力|新能源|储能/.test(m))return 'electric';
    if(/机械|自动化|车辆|交通运输|智能制造|测控|过程装备/.test(m))return 'engineering';
    if(/电子信息|通信|微电子|集成电路|光电/.test(m))return 'electronic';
    if(/临床|口腔|麻醉|儿科|医学影像|医学检验|护理|康复|药学|预防医学|公共卫生|动物医学/.test(m))return 'medical';
    if(/汉语言|新闻|传播|外语|英语|历史|哲学|档案|图书馆/.test(m))return 'liberal';
    if(/材料|化工|环境|食品|生物|制药|高分子/.test(m))return 'deep_engineering';
    return 'unknown';}
  function segment(rank){rank=Number(rank||0); if(!rank)return 'unknown'; if(rank<=25000)return 'high'; if(rank<=60000)return 'middle'; if(rank<=90000)return 'low'; return 'edge';}
  function cLabel(seg){return seg==='high'?'C：争平台':seg==='middle'?'C：看城市 / 层级':seg==='low'?'C：机会对照':'C：成本换本科机会';}
  function scoreRow(row,caseDef,type){
    var p=classifyPath(row), rank=Number(caseDef.input.rank||0), rr=Number(row.rank2025||row.rank||0), delta=rr-rank, s=0;
    var txt=majorText(row), high=!!(row.isHighFee||row.isCoopV29475||row.isPrivateV29475||/中外|合作|高收费|民办/.test(txt));
    if(type==='A'){s+=delta>0?Math.min(delta/800,30):-Math.min(Math.abs(delta)/800,30); if(!high)s+=20; if(caseDef.input.rejects&&caseDef.input.rejects.indexOf('高收费')>=0&&high)s-=80; if(['electric','engineering','medical','computer','deep_engineering'].indexOf(p)>=0&&caseDef.input.load==='sensitive')s-=15;}
    if(type==='B'){if((caseDef.input.interests||[]).indexOf('computer_info')>=0&&p==='computer')s+=35; if((caseDef.input.interests||[]).indexOf('electric_energy')>=0&&['electric','electronic','engineering'].indexOf(p)>=0)s+=35; if((caseDef.input.interests||[]).indexOf('teacher_education')>=0&&p==='teacher')s+=35; if((caseDef.input.interests||[]).indexOf('humanities_law')>=0&&['public_service','liberal','teacher'].indexOf(p)>=0)s+=35; if((caseDef.input.interests||[]).indexOf('medical_health')>=0&&p==='medical')s+=35; if(caseDef.input.scenario==='exam'&&['public_service','teacher','accounting','liberal'].indexOf(p)>=0)s+=24; if(caseDef.input.rejects&&caseDef.input.rejects.indexOf('工地现场')>=0&&['electric','engineering'].indexOf(p)>=0)s-=45; if(caseDef.input.rejects&&caseDef.input.rejects.indexOf('夜班')>=0&&p==='medical'&&/临床|口腔|麻醉|护理/.test(txt))s-=35;}
    if(type==='C'){var seg=segment(caseDef.input.rank); if(seg==='high')s+=(row.schoolTier&&/985|211/.test(row.schoolTier.level||row.schoolTier.label||''))?35:0; if(seg==='low'||seg==='edge')s+=high?12:4; if(caseDef.input.rejects&&caseDef.input.rejects.indexOf('高收费')>=0&&high)s-=60; s+=delta<0?Math.min(Math.abs(delta)/1200,25):0;}
    return s;
  }
  function topPaths(rows,caseDef,type){return rows.slice().sort(function(a,b){return scoreRow(b,caseDef,type)-scoreRow(a,caseDef,type)}).slice(0,6).map(function(r){return {school:r.school,major:r.major||r.cleanMajor||r.admissionMajor,path:classifyPath(r),rank2025:r.rank2025,score2025:r.score2025,score:Math.round(scoreRow(r,caseDef,type))};});}
  async function loadAllData(progress){
    progress('读取 manifest / rank / chunks ...');
    var manifest=await fetchJson('./data/manifest.json');
    var chunks=manifest.chunks||[]; var rows=[];
    for(var i=0;i<chunks.length;i++){var c=chunks[i]; progress('加载 chunk '+(i+1)+'/'+chunks.length+'：'+c.id); var data=await fetchJson((/^data\//.test(c.file)?'./'+c.file:'./data/chunks/'+c.file)); rows=rows.concat(Array.isArray(data)?data:(data.rows||data.records||data.data||[]));}
    return {manifest:manifest,rows:rows};
  }
  function runCases(rows){
    var defs=(window.LN_FAMILY_SCENARIO_REGRESSION_V300RC&&window.LN_FAMILY_SCENARIO_REGRESSION_V300RC.cases)||[];
    return defs.map(function(c){
      var min=Math.max(0,Math.floor(c.input.rank*0.78)), max=Math.ceil(c.input.rank*1.55);
      var pool=rows.filter(function(r){var rr=Number(r.rank2025||r.rank||0); return rr&&rr>=min&&rr<=max;});
      var A=topPaths(pool,c,'A'), B=topPaths(pool,c,'B'), C=topPaths(pool,c,'C');
      var seg=segment(c.input.rank), cl=cLabel(seg), checks=[];
      checks.push({name:'segment',status:seg===c.expect.segment?'PASS':'FAIL',actual:seg,expect:c.expect.segment});
      checks.push({name:'cLabel',status:cl===c.expect.cLabel?'PASS':'FAIL',actual:cl,expect:c.expect.cLabel});
      if(c.expect.paths){var got=B.concat(C).map(function(x){return x.path}); var ok=c.expect.paths.some(function(p){return got.indexOf(p)>=0}); checks.push({name:'expected paths appear',status:ok?'PASS':'WARN',actual:got.slice(0,8),expect:c.expect.paths});}
      if(c.expect.avoidDominate){var top=B.slice(0,3).map(function(x){return x.path}); var bad=top.filter(function(p){return c.expect.avoidDominate.indexOf(p)>=0}); checks.push({name:'avoid path domination',status:bad.length?'WARN':'PASS',actual:top,avoid:c.expect.avoidDominate});}
      if(c.input.rejects&&c.input.rejects.indexOf('高收费')>=0){var risky=A.filter(function(x){return /中外|合作|高收费|民办/.test(String(x.major||'')+String(x.school||''));}); checks.push({name:'A not high-fee when rejected',status:risky.length?'FAIL':'PASS',actual:risky});}
      var status=checks.some(function(x){return x.status==='FAIL'})?'FAIL':checks.some(function(x){return x.status==='WARN'})?'WARN':'PASS';
      return {id:c.id,title:c.title,status:status,input:c.input,expect:c.expect,actual:{segment:seg,cLabel:cl,poolSize:pool.length,A:A,B:B,C:C},checks:checks};
    });
  }
  async function runFull(progress){
    var started=Date.now(), errors=[];
    var staticSuite=window.LN_FAMILY_SCENARIO_REGRESSION_V300RC?.runStaticSuite?.();
    var data={manifest:null,rows:[]};
    try{data=await loadAllData(progress||function(){});}catch(e){errors.push({stage:'loadData',message:String(e&&e.message||e)});}
    var cases=[]; if(data.rows.length){try{cases=runCases(data.rows);}catch(e){errors.push({stage:'runCases',message:String(e&&e.message||e)});}}
    var jsAssets=['family-decision-engine.v300rc.js','family-scenario-regression.v300rc.js','family-decision-engine.v300rc.css'];
    var assetChecks=await Promise.all(jsAssets.map(async function(f){try{var r=await fetch('./assets/'+f,{cache:'no-store'}); return {file:f,status:r.ok?'PASS':'FAIL',http:r.status,size:Number(r.headers.get('content-length')||0)||null};}catch(e){return {file:f,status:'FAIL',error:String(e)}}}));
    var summary={total:cases.length, PASS:0, WARN:0, FAIL:0}; cases.forEach(function(c){summary[c.status]=(summary[c.status]||0)+1;});
    var report={kind:'LN Fenxi V3.0RC One Click Debug Report',version:VERSION,generatedAt:now(),url:location.href,userAgent:navigator.userAgent,durationMs:Date.now()-started,assetChecks:assetChecks,dataSummary:{manifestVersion:data.manifest&&data.manifest.version,totalRecords:data.rows.length,chunks:data.manifest&&(data.manifest.chunks||[]).length},staticSuite:staticSuite&&staticSuite.summary,summary:summary,cases:cases,errors:errors,notes:['本报告不采集密码、Cookie、Secret。','复制整段日志发给我，我可以看到 12 个场景、A/B/C 模拟、资源加载、数据完整性和明显 FAIL/WARN。']};
    localStorage.setItem('ln_v300rc_debug_report',JSON.stringify(report));
    return report;
  }
  function renderReport(report){var el=$('report'); if(!el)return; el.textContent=safeJson(report); var sum=$('summary'); if(sum&&report){sum.innerHTML='<b>完成：</b>PASS '+(report.summary?.PASS||0)+' / WARN '+(report.summary?.WARN||0)+' / FAIL '+(report.summary?.FAIL||0)+' ｜ 数据 '+(report.dataSummary?.totalRecords||0)+' 条 ｜ 耗时 '+report.durationMs+'ms';}}
  async function copyReport(){var txt=$('report')?.textContent||localStorage.getItem('ln_v300rc_debug_report')||''; await navigator.clipboard.writeText(txt).catch(function(){}); var b=$('copyBtn'); if(b){b.textContent='已复制日志'; setTimeout(function(){b.textContent='复制一键测试日志'},1200);}}
  function bind(){var run=$('runBtn'); if(run)run.onclick=async function(){var progress=function(msg){var el=$('summary'); if(el)el.textContent=msg;}; try{var report=await runFull(progress); renderReport(report);}catch(e){renderReport({kind:'LN Fenxi V3.0RC One Click Debug Report',version:VERSION,generatedAt:now(),fatal:String(e&&e.stack||e)});}}; var copy=$('copyBtn'); if(copy)copy.onclick=copyReport; var old=localStorage.getItem('ln_v300rc_debug_report'); if(old){try{renderReport(JSON.parse(old));}catch(e){$('report').textContent=old;}} }
  window.LN_V300RC_DEBUG_SUITE={ready:true,version:VERSION,runFull:runFull,runCases:runCases};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
})();
