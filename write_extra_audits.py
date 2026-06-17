from pathlib import Path
import json, subprocess
root=Path('/mnt/data/lnrank_v3941_work'); ln=root/'ln-rank'
ver='v3.9.41'; asset='v3941_0'; release='v3.9.41-ln-rank-serious-color-balance-responsive-contract-12-role-no-fenxi'
# dynamic API audit based on executed output values (rerun just to be precise)
script="""
import { onRequest as selfCheck } from './functions/api/ln-rank-self-check.js';
import { onRequest as kbHealth } from './functions/api/kb-health.js';
const mk=(path)=>new Request('https://example.com'+path);
const out=[];
for (const [name,path,fn] of [['ln-rank-self-check','/api/ln-rank-self-check',selfCheck],['kb-health','/api/kb-health',kbHealth]]) {
  const res=await fn({request:mk(path), env:{}, params:{}, waitUntil(){}, next(){}});
  const text=await res.text();
  let parsed=null; try{parsed=JSON.parse(text)}catch(e){}
  out.push({name,status:res.status,contentType:res.headers.get('content-type'),json:!!parsed,version:parsed?.version,assetVersion:parsed?.assetVersion,release:parsed?.release,ok:res.status>=200&&res.status<300&&!!parsed});
}
console.log(JSON.stringify(out));
"""
r=subprocess.run(['node','--input-type=module','-e',script],cwd=str(root),text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
try: api=json.loads(r.stdout)
except Exception: api=[]
(ln/'v3.9.41-api-json-local-audit.json').write_text(json.dumps({'version':ver,'assetVersion':asset,'release':release,'ok':r.returncode==0 and all(x.get('ok') for x in api),'executed':'local Node onRequest invocation for self-check and kb-health','results':api,'stderr':r.stderr[-1000:]},ensure_ascii=False,indent=2),encoding='utf-8')
# dynamic report audit
script2="""
import { buildSelectionPoolStyledBlocks } from './functions/_lib/feishu-selection-pool-styled-builder.js';
import { buildSelectionPoolFeishuReport } from './functions/_lib/feishu-selection-pool-report-builder.js';
const payload={candidateScore:600, selectedMajors:[{schoolName:'测试大学',majorName:'测试专业',year2025Score:600,year2025Rank:20000,band:'主要参考',city:'沈阳',province:'辽宁'}], computed:{items:[]}, bottomLineMode:'all'};
const a=buildSelectionPoolStyledBlocks(payload);
const b=buildSelectionPoolFeishuReport(payload);
const text=JSON.stringify([a,b]);
const sections=['一、概要判断','二、当前方案怎么看','三、前中后段快速确认','四、最终排序清单','五、本方案确认清单','六、数据和使用边界'];
console.log(JSON.stringify({styledBlocks:Array.isArray(a)?a.length:null, reportVersion:b.version, ok:sections.every(s=>text.includes(s)), found:Object.fromEntries(sections.map(s=>[s,text.includes(s)]))}));
"""
r2=subprocess.run(['node','--input-type=module','-e',script2],cwd=str(root),text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
try: rep=json.loads(r2.stdout)
except Exception: rep={}
(ln/'v3.9.41-report-six-section-runtime-audit.json').write_text(json.dumps({'version':ver,'assetVersion':asset,'release':release,'ok':r2.returncode==0 and rep.get('ok') is True,'executed':'local Node report builder invocation','result':rep,'stderr':r2.stderr[-1000:]},ensure_ascii=False,indent=2),encoding='utf-8')
# browser smoke attempt report
log=Path('/tmp/chromium3941.log').read_text(errors='ignore')[-4000:] if Path('/tmp/chromium3941.log').exists() else ''
(ln/'v3.9.41-browser-smoke-attempt-audit.json').write_text(json.dumps({'version':ver,'assetVersion':asset,'release':release,'ok':False,'executed':True,'result':'not completed','reason':'Chromium headless timed out in sandbox before screenshot was produced. This is not marked as passed.','viewportAttempted':['390x900 index page'],'logTail':log},ensure_ascii=False,indent=2),encoding='utf-8')
# function regression matrix
matrix=[
 {'area':'查询页','checks':['成绩输入','范围选择','筛选入口','结果卡片','加入自选入口','单卡诊断入口'],'status':'static gate only'},
 {'area':'自选池','checks':['已选数量','结构状态条','报告预览','复制文字版','飞书报告入口'],'status':'static gate + report builder runtime'},
 {'area':'辅助页','checks':['211 低权重','省内背景低权重','趋势页不做预测'],'status':'static gate'},
 {'area':'响应式','checks':['375','390','414','430','768','1024','1366'],'status':'CSS static gate; real browser screenshot not completed'},
 {'area':'工程边界','checks':['no /fenxi','no functions/fenxi','no functions/_middleware.js','keep fenxi-session'],'status':'passed'}
]
(ln/'v3.9.41-function-regression-matrix.json').write_text(json.dumps({'version':ver,'assetVersion':asset,'release':release,'matrix':matrix},ensure_ascii=False,indent=2),encoding='utf-8')
