// V2.9.8.2 advisor diagnosis: explanation layer over the unified decision context.
(function(){
  function fmt(v){try{return window.fmt?window.fmt(v):Number(v||0).toLocaleString('zh-CN');}catch(e){return String(v??0);}}
  function esc(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));}
  function fallbackFunnel(){
    // V2.9.8.3.fix2: do not call legacy buildFunnelV29473 here.
    // The old funnel rebuilt DATA and ran profileScore for every row, causing multi-second scenario/render delays.
    try{
      const b=window.LN_COMPUTE_PIPELINE_V2983?.state?.lastBaseStats || window.LN_DEBUG_V2983?.state?.details?.baseFilterStats || null;
      const rows=Number(b?.rows||0), out=Number(b?.out||0);
      const f=[{step:'位次分段加载',count:rows,drop:0,before:rows}];
      const ex=b?.exclusionStats||{};
      Object.keys(ex).forEach(k=>{const d=Number(ex[k]||0); if(d>0) f.push({step:k,count:Math.max(0,out),drop:d,before:out+d});});
      f.push({step:'当前基础候选池',count:out,drop:Math.max(0,rows-out),before:rows,note:'来自漏斗式基础过滤缓存'});
      return f;
    }catch(e){return [];}
  }
  function topPressure(funnel){return (funnel||[]).filter(x=>x.drop>0).sort((a,b)=>b.drop-a.drop).slice(0,3);}
  function diagnose(){
    window.LN_LEGACY_PREFERENCE_ADAPTER_V2982?.syncLegacyDom?.();
    const c=window.LN_DECISION_CONTEXT_V2982?.build?.()||{};
    const list=(typeof filtered!=='undefined'&&Array.isArray(filtered))?filtered:[];
    const tDiag=(window.performance&&performance.now)?performance.now():Date.now(); const funnel=fallbackFunnel(); const top=topPressure(funnel); const count=list.length; const conflicts=[];
    function add(id,title,diagnosis,relax,avoid,review,schemes){conflicts.push({id,title,diagnosis,relax,avoid,review,schemes});}
    if(c.rank && count<20 && c.strongProvince && c.hotMajor){add('province_hot','强区域 + 热门方向压缩','当前省内/城市范围与热门方向同时较强，候选容易变少。',['先把城市/区域硬筛改成软偏好','把正主专业扩展到相近方向','保留 A/B 中稳妥候选后再看 C 组'],['不建议先放开资格型入口','不建议先接受未核验高收费','不建议把弱相关专业当正主'],['专业代码','培养方案','实际校区','资格入口'],['A 守底线','B 看专业','C 近省/平台扩展']);}
    if(c.normalFamily && c.strongCity){add('ordinary_city','普通家庭 + 城市偏好','城市偏好会挤压公办、普通学费和专业匹配空间。',['城市硬条件改为软提醒','省内扩展到近省','先看费用可控的公办候选'],['不建议为了城市直接接受高收费','不建议忽略就读校区'],['学费','校区','学校性质','生活成本'],['A 成本可控','B 专业路径','C 城市软筛']);}
    if(c.student?.path==='work_first' && c.hotMajor){add('work_hot','本科就业优先 + 热门方向','如果更希望本科就业，要重点看本科出口和课程强度，不宜只看热门专业名。',['优先比较路径清楚、培养方案可读的专业','把热门词拆成本科目录专业类复核'],['不建议用“考研兜底”解释所有冷门或弱相关方向'],['本科就业出口','课程结构','读研依赖'],['A 出口清楚','B 专业正主','C 平台上限']);}
    if(c.qualification?.specialStatus!=='approved'){
      const hidden=(window.exclusionStats&&((window.exclusionStats['资格入口隐藏']||0)+(window.exclusionStats['高校专项隐藏']||0)))||0;
      if(hidden>0) add('qualification','资格入口默认保护','高校专项、预科/民族班、定向培养等默认按普通考生口径隐藏，避免混入普通批比较。',['确有资格时再到“管理资格入口”放开','不确定时继续按未审核处理'],['不建议用资格型入口缓解普通批候选偏少'],['资格审核','公示名单','招生章程'],['普通候选 A/B/C','资格候选单独复核']);
    }
    if(!conflicts.length){const p=top.map(x=>x.step).join('、')||'暂无明显压缩点';add('general','当前口径基本可用',count<20?`候选偏少，主要压缩点可能是：${p}。`:'结果数量基本可用，建议先看 A/B/C，再看详细卡家长必读。',['若结果偏少，先放宽压缩最大的非底线条件','若结果偏多，先明确地域、预算和兴趣方向'],['不要先放宽家庭成本底线','不要忽略专业代码和校区'],['招生章程','专业代码','学费','校区'],['A 守底线','B 看专业','C 争上限']);}
    const out={snapshot:Object.assign({},c,{provinces:c.family?.provinces||[],cities:c.family?.cities||[],budget:c.family?.budget,priority:c.priority,regionMode:c.family?.regionMode,cityMode:c.family?.cityMode}), funnel, top, conflicts:conflicts.slice(0,3)}; try{window.LN_DEBUG_V2983?.detail?.('advisorDiagnosis',{ms:Math.round(((window.performance&&performance.now)?performance.now():Date.now())-tDiag),funnelSteps:funnel.length,conflicts:out.conflicts.length,source:'v2983fix2-light'});}catch(e){} return out;
  }
  function render(diag){
    const box=document.getElementById('conflictDiagnosisV29473'); if(!box)return; if(!(typeof currentRank!=='undefined'?currentRank:window.currentRank)){box.innerHTML='';return;}
    const main=(diag?.conflicts||[])[0]||{}; const snap=diag?.snapshot||{};
    const pressure=(diag?.top||[]).slice(0,3).map(x=>`<span>${esc(x.step)}：减少 ${fmt(x.drop)}</span>`).join('') || '<span>暂无明显压缩点</span>';
    const funnel=(diag?.funnel||[]).map(x=>`<div class="funnel-step"><b>${esc(x.step)}</b><span>${fmt(x.count)} 条</span>${x.drop?`<em>−${fmt(x.drop)}</em>`:''}</div>`).join('');
    const relax=(main.relax||[]).slice(0,4).map(x=>`<li>${esc(x)}</li>`).join(''); const avoid=(main.avoid||[]).slice(0,4).map(x=>`<li>${esc(x)}</li>`).join('');
    box.innerHTML=`<div class="diagnosis-v29473 diagnosis-compact-v2981fix1 diagnosis-v2982"><div class="diag-main"><div><span class="diag-kicker">高报师诊断</span><h3>${esc(main.title||'当前候选范围摘要')}</h3><p>${esc(main.diagnosis||'诊断只解释同一套筛选口径，不另起一套高级规则。')}</p></div><div class="diag-band">${esc(snap.scoreBand||'位次段待计算')}</div></div><div class="pressure-tags-v29473"><b>候选压缩：</b>${pressure}</div><details class="diag-details-v29473"><summary>展开诊断说明</summary><div class="funnel-grid-v29473">${funnel}</div><div class="diag-advice-grid" style="display:grid"><div><h4>建议优先放宽</h4><ol>${relax}</ol></div><div><h4>不建议先放宽</h4><ol>${avoid}</ol></div></div></details></div>`;
  }
  window.diagnoseV29473=diagnose; window.renderDiagnosisV29473=render;
  window.LN_ADVISOR_DIAGNOSIS_ENGINE_V2982={diagnose,render,ready:true};
})();
