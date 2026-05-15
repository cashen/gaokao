// V2.9.6 fix3 export-engine: CSV/PNG export helpers
window.__LN_EXPORT_SCRIPT_STARTED__ = true;
function csvEscape(v){if(v==null)v='';v=String(v);return/[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}function rowsToCsv(rows){
  const head=['学校','省份','城市','区域','学校地域来源','地域置信度','学校性质','院校层级','专业','标准专业','学科门类','专业类代码','本科专业类','专业代码','学硕一级/跨门类参考','专硕类别/领域参考','二级学科示例','目录可信度','招生名复核','易混主题','2025分','2025位次','2024分','2024位次','层级','画像分','风险','地域说明'];
  const body=(rows||[]).map(r=>{
    r=enrich(r);
    return [r.school,r.schoolProvince||'',r.schoolCity||'',r.schoolRegion||'',r.schoolGeoSourceMethod||'',confidenceLabel(r.schoolGeoConfidence||'low'),r.schoolNature?.label||'',r.schoolTier?.label||'',r.major,r.cleanMajor,r.undergradDisciplineName,r.officialCategoryCode,r.undergradCategoryName,r.officialMajorCode,r.gradAcademicText,r.gradProfessionalText,r.gradSecondaryText,confidenceLabel(r.gradReferenceConfidence||r.taxonomyConfidence),r.admissionReviewTags||'', confusablePairsForRecordV2946(r).map(p=>p.group_name).join('|'), r.score2025,r.rank2025,r.score2024,r.rank2024,r._level||'',Math.round(r._profile||0),(r.riskFlags||[]).join('|'),CITY_GEO_NOTE_V29472]
      .map(x=>`"${String(x??'').replace(/"/g,'""')}"`).join(',');
  });
  return [head.join(','),...body].join('\n');
}function download(name,text){const b=new Blob([text],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;a.click();URL.revokeObjectURL(a.href)}function exportFiltered(){download('辽宁物理类_V2.9.6_筛选结果_高报师方案.csv',rowsToCsv(filtered))}function exportCandidates(){download('辽宁物理类_V2.9.6_候选清单_高报师方案.csv',rowsToCsv(candidates.map(enrich)))}

function textVal(id){return document.getElementById(id)?.value||''}
function activeStrategyText(){
  return document.querySelector('#strategyCards .strategy-card.active .title')?.textContent?.trim()
      || document.querySelector('#strategyCards .strategy-card.active')?.textContent?.trim()
      || currentStrategy || '-';
}
function activeChips(boxId){
  return [...document.querySelectorAll(`#${boxId} .chip.active`)].map(x=>x.textContent.trim()).filter(Boolean);
}
function pickedSummary(){
  const provinces=selectedProvinces();
  return {
    score:textVal('myScore')||'-',
    rank: currentRank || resolveRank() || '-',
    strategy: activeStrategyText(),
    priority: textVal('priority')||'-',
    model: textVal('model')||'-',
    budget: textVal('budget')||'-',
    regionMode: textVal('regionMode')||'-',
    provinces: provinces.length ? (provinces.length<=8 ? provinces.join('、') : provinces.slice(0,8).join('、')+' 等'+provinces.length+'省') : '未限定',
    mentorMode: textVal('mentorMode')||'-',
    familyTolerance: textVal('familyTolerance')||'-',
    gradPlan: textVal('gradPlan')||'-',
    timePressure: textVal('timePressure')||'-',
    rejects: activeChips('rejectChips').join('、') || '无',
    schoolKeyword: textVal('qSchool')||'无',
    majorKeyword: textVal('qMajor')||'无',
    subjectGroup: textVal('filterSubjectGroup')||'全部',
    primary: textVal('filterPrimary')||'无',
    taxConfidence: textVal('filterTaxConfidence')||'全部',
    schoolTier: textVal('filterSchoolTier')||'全部',
    feeType: textVal('filterFeeType')||'全部',
    level: textVal('filterLevel')||'全部'
  };
}
function pickPlanRows(){
  const usable=(filtered||[]).filter(r=>!r._excludes?.length);
  const pick=(ls)=>usable.filter(r=>ls.includes(r._level)).sort((a,b)=>(b._profile-a._profile)||(a._fit-b._fit))[0]||null;
  return {
    A: pick(['可冲','超冲']),
    B: pick(['匹配','稳妥']),
    C: pick(['保底','稳妥'])
  };
}
function formatLevelText(r){return r?`${r._level||'-'}｜画像${Math.round(r._profile||0)}分｜2025位次${fmt(r.rank2025)}`:'暂无';}
function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, color='#1f2d3d', font='28px sans-serif', maxLines=999){
  ctx.fillStyle=color; ctx.font=font;
  const raw=String(text??'');
  const paragraphs=raw.split(/\n/);
  let lines=[];
  paragraphs.forEach(p=>{
    let line='';
    for(const ch of p){
      const test=line+ch;
      if(ctx.measureText(test).width>maxWidth && line){ lines.push(line); line=ch; }
      else line=test;
    }
    if(line) lines.push(line);
    if(!p) lines.push('');
  });
  let drawn=0;
  for(let i=0;i<lines.length && drawn<maxLines;i++){
    let txt=lines[i];
    if(drawn===maxLines-1 && i<lines.length-1) txt=txt.replace(/.$/,'')+'…';
    ctx.fillText(txt,x,y+drawn*lineHeight);
    drawn++;
  }
  return drawn;
}
function roundRect(ctx,x,y,w,h,r,fill,stroke){
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
  if(fill){ctx.fillStyle=fill;ctx.fill();}
  if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}
}
function levelColor(level){
  return level==='匹配'?'#2e7d32':level==='稳妥'?'#1976d2':level==='保底'?'#f57c00':level==='可冲'?'#8e24aa':level==='超冲'?'#d32f2f':'#607d8b';
}
function drawTag(ctx,x,y,text,bg='#eef4ff',fg='#234'){ ctx.font='24px sans-serif'; const w=ctx.measureText(text).width+26; roundRect(ctx,x,y,Math.min(w,520),36,18,bg,null); ctx.fillStyle=fg; ctx.fillText(text,x+13,y+24); return Math.min(w,520)+10; }

function exportSummaryPng(kind='filtered'){
  const rows=(kind==='candidates' ? (candidates||[]).map(enrich) : (filtered||[]).map(enrich));
  if(!rows.length){
    alert(kind==='candidates'?'候选清单为空，无法导出 PNG。':'当前筛选结果为空，无法导出 PNG。');
    return;
  }

  const info=pickedSummary();
  const plan=pickPlanRows();
  const topRows=(kind==='candidates' ? rows : rows.slice(0,12));

  const W=1600, M=64, contentW=W-M*2;
  const rowH=128;
  const headerH=170;
  const summaryH=306;
  const planH=236;
  const statsH=96;
  const listH=92 + topRows.length*rowH;
  const footerH=120;
  const H=M + headerH + 24 + summaryH + 24 + planH + 24 + statsH + 24 + listH + footerH;

  const canvas=document.createElement('canvas');
  canvas.width=W;
  canvas.height=H;
  const ctx=canvas.getContext('2d');

  const grad=ctx.createLinearGradient(0,0,W,H);
  grad.addColorStop(0,'#f7fbff');
  grad.addColorStop(1,'#eef5ff');
  ctx.fillStyle=grad;
  ctx.fillRect(0,0,W,H);

  function safeText(v){return String(v??'').replace(/\s+/g,' ').trim();}
  function drawSectionTitle(title,x,y){
    ctx.fillStyle='#17324d';
    ctx.font='bold 30px sans-serif';
    ctx.fillText(title,x,y);
  }
  function drawInfoCard(x,y,w,h,label,value,opts={}){
    const bg=opts.bg||'#ffffff';
    const border=opts.border||'rgba(47,91,176,.12)';
    roundRect(ctx,x,y,w,h,18,bg,border);
    ctx.fillStyle='#7a8ca3';
    ctx.font='21px sans-serif';
    ctx.fillText(label,x+18,y+30);
    ctx.fillStyle=opts.valueColor||'#17324d';
    ctx.font=opts.valueFont||'bold 25px sans-serif';
    wrapCanvasText(ctx,value||'-',x+18,y+64,w-36,30,opts.valueColor||'#17324d',opts.valueFont||'bold 25px sans-serif',2);
  }
  function drawKVGrid(items,x,y,w,colCount,rowH){
    const gap=14;
    const colW=(w-gap*(colCount-1))/colCount;
    items.forEach((it,i)=>{
      const cx=x+(i%colCount)*(colW+gap);
      const cy=y+Math.floor(i/colCount)*rowH;
      drawInfoCard(cx,cy,colW,rowH-12,it[0],it[1],it[2]||{});
    });
  }

  let y=M;
  roundRect(ctx,M,y,contentW,headerH,30,'#183153',null);
  ctx.fillStyle='#fff';
  ctx.font='bold 44px sans-serif';
  ctx.fillText(kind==='candidates'?'辽宁物理类志愿工具｜候选清单 PNG 摘要':'辽宁物理类志愿工具｜当前筛选 PNG 摘要',M+38,y+58);
  ctx.font='24px sans-serif';
  ctx.fillStyle='rgba(255,255,255,.92)';
  ctx.fillText(`版本：V2.9.4.7.5｜生成时间：${new Date().toLocaleString('zh-CN')}`,M+38,y+100);
  wrapCanvasText(ctx,'说明：PNG 为当前页面摘要图，便于转发沟通；正式填报仍需复核招生计划、专业实际校区、体检、学费与专业组。',M+38,y+136,contentW-76,30,'rgba(255,255,255,.88)','23px sans-serif',1);
  y += headerH + 24;

  roundRect(ctx,M,y,contentW,summaryH,26,'#ffffff','rgba(47,91,176,.12)');
  drawSectionTitle('一、筛选条件摘要',M+26,y+42);

  const summaryItems=[
    ['成绩',`${info.score} 分`,{bg:'#f3f7ff'}],
    ['位次',`${fmt(info.rank)} 位`,{bg:'#f3f7ff'}],
    ['策略',safeText(info.strategy),{bg:'#f8fbff'}],
    ['优先级',safeText(info.priority),{bg:'#f8fbff'}],
    ['预算',safeText(info.budget),{bg:'#fffaf2'}],
    ['区域模式',safeText(info.regionMode),{bg:'#f8fbff'}],
    ['目标省份',safeText(info.provinces),{bg:'#f8fbff'}],
    ['目标城市',safeText(info.targetCities),{bg:'#f8fbff'}],
    ['规则强度',safeText(info.mentorMode),{bg:'#f8fbff'}]
  ];
  drawKVGrid(summaryItems,M+26,y+62,contentW-52,4,86);

  const longY=y+62+86*2+10;
  roundRect(ctx,M+26,longY,contentW-52,92,18,'#f9fbff','rgba(47,91,176,.10)');
  ctx.fillStyle='#7a8ca3';
  ctx.font='21px sans-serif';
  ctx.fillText('已启用细化条件',M+46,longY+30);
  const condText=[
    `拒绝项：${safeText(info.rejects)||'无'}`,
    `学科群：${safeText(info.subjectGroup)||'全部'}`,
    `专业类/研一级：${safeText(info.primary)||'无'}`,
    `学科可信度：${safeText(info.taxConfidence)||'全部'}`,
    `院校层级：${safeText(info.schoolTier)||'全部'}`,
    `层级：${safeText(info.level)||'全部'}`,
    `城市方式：${safeText(info.cityMode)||'不限'}`,
    `学校关键词：${safeText(info.schoolKeyword)||'无'}`,
    `专业关键词：${safeText(info.majorKeyword)||'无'}`,
    `办学/收费：${safeText(info.feeType)||'全部'}`
  ].join(' ｜ ');
  wrapCanvasText(ctx,condText,M+46,longY+62,contentW-92,28,'#314762','22px sans-serif',2);
  y += summaryH + 24;

  roundRect(ctx,M,y,contentW,planH,26,'#ffffff','rgba(47,91,176,.12)');
  drawSectionTitle('二、A / B / C 方案概览',M+26,y+42);
  const cols=[['A：稳妥公办',plan.A,'#fff4e6','#ef6c00'],['B：专业路径',plan.B,'#eaf3ff','#1565c0'],['C：城市/层级',plan.C,'#f4e9ff','#7b1fa2']];
  cols.forEach((it,idx)=>{
    const x=M+26+idx*((contentW-52)/3), yy=y+66, w=(contentW-92)/3;
    roundRect(ctx,x,yy,w,150,20,it[2],'rgba(0,0,0,.03)');
    ctx.fillStyle=it[3];
    ctx.font='bold 27px sans-serif';
    ctx.fillText(it[0],x+20,yy+36);
    const r=it[1];
    wrapCanvasText(ctx,r?String(r.school):'暂无合适候选',x+20,yy+72,w-40,28,'#183153','bold 24px sans-serif',1);
    wrapCanvasText(ctx,r?`${r.major}`:'可放宽区域或条件再筛选。',x+20,yy+104,w-40,26,'#334b68','22px sans-serif',1);
    wrapCanvasText(ctx,formatLevelText(r),x+20,yy+134,w-40,24,'#627b97','20px sans-serif',1);
  });
  y += planH + 24;

  roundRect(ctx,M,y,contentW,statsH,26,'#ffffff','rgba(47,91,176,.12)');
  drawSectionTitle('三、结果概况',M+26,y+40);
  const statItems=[
    ['当前结果',fmt((filtered||[]).length)],
    ['可冲',fmt((filtered||[]).filter(r=>r._level==='可冲').length)],
    ['匹配',fmt((filtered||[]).filter(r=>r._level==='匹配').length)],
    ['稳妥',fmt((filtered||[]).filter(r=>r._level==='稳妥').length)],
    ['保底',fmt((filtered||[]).filter(r=>r._level==='保底').length)]
  ];
  let statX=M+210;
  statItems.forEach(([k,v])=>{
    statX += drawTag(ctx,statX,y+20,`${k} ${v}`,'#f5f8fd','#38506a');
  });
  y += statsH + 24;

  roundRect(ctx,M,y,contentW,listH,26,'#ffffff','rgba(47,91,176,.12)');
  drawSectionTitle(kind==='candidates'?'四、候选清单':'四、前排结果摘要',M+26,y+42);
  wrapCanvasText(ctx,kind==='candidates'?'展示当前候选清单全部条目（若过多建议先清理）。':'为保证易读性，PNG 默认展示当前排序下前 12 条。',M+26,y+74,contentW-52,28,'#61778e','22px sans-serif',1);

  let yy=y+94;
  topRows.forEach((r,i)=>{
    const color=levelColor(r._level);
    roundRect(ctx,M+22,yy,contentW-44,rowH-14,18,'#fbfdff','rgba(23,49,83,.08)');
    roundRect(ctx,M+40,yy+18,92,32,16,color,null);
    ctx.fillStyle='#fff';
    ctx.font='bold 20px sans-serif';
    ctx.fillText(r._level||'-',M+60,yy+40);

    wrapCanvasText(ctx,`${i+1}. ${r.school}｜${geoDisplayV29472(r)}｜${r.schoolTier?.label||'层级待核验'}`,M+154,yy+36,560,28,'#17324d','bold 25px sans-serif',1);
    wrapCanvasText(ctx,`${r.major}`,M+154,yy+70,640,26,'#334b68','22px sans-serif',1);
    wrapCanvasText(ctx,`2025：${fmt(r.score2025)}分 / ${fmt(r.rank2025)}位｜2024：${fmt(r.score2024)}分 / ${fmt(r.rank2024)}位｜画像 ${Math.round(r._profile||0)}分`,M+154,yy+100,700,24,'#5f7691','20px sans-serif',1);

    wrapCanvasText(ctx,`本科类：${r.officialCategoryCode||''}${r.undergradCategoryName||'待复核'}｜研一级：${r.primaryDisciplineNames||'待复核'}｜招生名：${r.admissionReviewTags||'已校准'}`,M+900,yy+40,contentW-980,24,'#24507b','20px sans-serif',2);
    wrapCanvasText(ctx,`判断：${judge(r)||'—'}`,M+900,yy+92,contentW-980,23,'#6b7f93','19px sans-serif',2);
    yy += rowH;
  });
  y += listH + 24;

  wrapCanvasText(ctx,'注：本摘要图用于初选沟通，不替代正式志愿表。中外合作、高收费、专业类分流、一级学科映射置信度低等情况，正式使用前请再做人工核验。',M,y+26,contentW,28,'#627b97','20px sans-serif',2);

  const name=kind==='candidates'?'辽宁物理类_V2.9.6_候选清单摘要.png':'辽宁物理类_V2.9.6_筛选摘要.png';
  const a=document.createElement('a');
  a.href=canvas.toDataURL('image/png');
  a.download=name;
  a.click();
}
function exportFilteredPng(){ exportSummaryPng('filtered'); }
function exportCandidatesPng(){ exportSummaryPng('candidates'); }

function openExportSheet(){document.getElementById('exportSheet')?.classList.remove('hide');document.getElementById('exportSheetMask')?.classList.remove('hide')}
function closeExportSheet(){document.getElementById('exportSheet')?.classList.add('hide');document.getElementById('exportSheetMask')?.classList.add('hide')}
rowsToCsv = function(rows){
  const head=['来源方案','方案角色','路径标签','路径提醒','孩子想法提醒','分段解释','学校','省份','城市','区域','学校地域来源','地域置信度','学校性质','院校层级','专业','主专业名','办学类型','标准专业','学科门类','专业类代码','本科专业类','专业代码','学硕一级/跨门类参考','专硕类别/领域参考','二级学科示例','目录可信度','招生名复核','易混主题','2025分','2025位次','2024分','2024位次','层级','画像分','风险','复核项','地域说明'];
  const body=(rows||[]).map(row=>{
    const meta=row||{}; const r=enrich(DATA.find(x=>x.id===meta.id)||meta);
    const reviews=[...new Set([...(planReviewTagsV29473?planReviewTagsV29473(r,meta._selectedSourcePlanV29476||'')||[]:[]),...(meta._selectedSourcePlanV29476?[meta._selectedSourcePlanV29476]:[])])].join('|');
    const px=window.LN_PATH_EXPLAIN_ENGINE_V2975?.explain?.(r)||{};
    return [meta._selectedSourcePlanV29476||'',meta._selectedPlanRoleV29476||'',meta._selectedPathLabelV29476||window.LN_PATH_EXPLAIN_ENGINE_V2975?.exportTags?.(r)||'',window.LN_PATH_EXPLAIN_ENGINE_V2975?.exportMessage?.(r)||'',px.intentMessage||'',px.bandMessage||'',r.school,r.schoolProvince||'',r.schoolCity||'',r.schoolRegion||'',r.schoolGeoSourceMethod||'',confidenceLabel(r.schoolGeoConfidence||'low'),r.schoolNature?.label||'',r.schoolTier?.label||'',r.major,r.mainMajorV29475||'',r.feeTypeLabelV29475||feeTypeLabelV29475(r),r.cleanMajor,r.undergradDisciplineName,r.officialCategoryCode,r.undergradCategoryName,r.officialMajorCode,r.gradAcademicText,r.gradProfessionalText,r.gradSecondaryText,confidenceLabel(r.gradReferenceConfidence||r.taxonomyConfidence),r.admissionReviewTags||'', confusablePairsForRecordV2946(r).map(p=>p.group_name).join('|'), r.score2025,r.rank2025,r.score2024,r.rank2024,r._level||'',Math.round(r._profile||0),(r.riskFlags||[]).join('|'),reviews,CITY_GEO_NOTE_V29472]
      .map(x=>`"${String(x??'').replace(/"/g,'""')}"`).join(',');
  });
  return [head.join(','),...body].join('\n');
};
exportFiltered = function(){download('辽宁物理类_V2.9.7.5_筛选结果_路径解释版.csv',rowsToCsv(filtered));};
exportCandidates = function(){download('辽宁物理类_V2.9.7.5_候选清单_路径解释版.csv',rowsToCsv(candidates));};

window.LN_EXPORT = {
  ready: true,
  exportSummaryPng, exportFilteredPng, exportCandidatesPng,
  exportFiltered, exportCandidates, openExportSheet, closeExportSheet,
  rowsToCsv, csvEscape
};
