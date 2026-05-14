// V2.91RC0.rules-closure4.family-read1.frontfix1.export-md1｜Markdown复制与下载版
// 只增加 Markdown 复制/下载能力；不参与候选池、排序、A/B/C 业务计算。
(function(){
  if(window.LN_EXPORT_MD_OPT===false) return;
  var VERSION='v291rc0md1';
  var STAMP='291rc0md1-20260514';
  var FULL_VERSION='V2.91RC0.rules-closure4.family-read1.frontfix1.export-md1';
  var timer=null;
  function val(id){try{return document.getElementById(id)?.value||'';}catch(e){return '';}}
  function optText(id){try{var el=document.getElementById(id); return el?.selectedOptions?.[0]?.textContent?.trim()||el?.value||'';}catch(e){return '';}}
  function num(v){v=Number(v);return Number.isFinite(v)?v:0;}
  function fmt(n){n=Number(n);return Number.isFinite(n)&&n? n.toLocaleString('zh-CN') : '-';}
  function score(){return num(val('myScore'))||null;}
  function rank(){try{return window.currentRank || (typeof currentRank!=='undefined'?currentRank:null) || num(val('myRank')) || null;}catch(e){return num(val('myRank'))||null;}}
  function clean(s){return String(s==null?'':s).replace(/\s+/g,' ').trim();}
  function mdEsc(s){return clean(s).replace(/\|/g,'\\|');}
  function line(s){return clean(s)||'—';}
  function now(){try{return new Date().toLocaleString('zh-CN',{hour12:false});}catch(e){return new Date().toISOString();}}
  function closure(){try{return window.LN_RULES_CLOSURE_V291||null;}catch(e){return null;}}
  function dc(){try{return closure()?.debugContext?.()||{};}catch(e){return {};}}
  function ctx(){try{return closure()?.context?.()||{};}catch(e){return {};}}
  function scenarioLabel(id){return ({platformSprint:'高分平台冲刺',platformStable:'高分平台稳妥',highValue:'高分性价比',employment:'普通家庭稳就业',publicLow:'省内公办稳妥',privateMajor:'民办可比较',edgeBachelor:'本科机会边缘',budgetFlexible:'预算较宽',grid:'电网能源',medical:'医学方向',exam:'考公体制',broad:'先不设限'})[id]||id||'未选择';}
  function rankBand(r){r=Number(r); if(!r)return '待定位'; if(r<=7000)return '高分平台段'; if(r<=17000)return '学校专业平衡段'; if(r<=35000)return '专业路径比较段'; if(r<=70000)return '公办/专业取舍段'; return '本科机会边缘段';}
  function priorityLabel(c){var t=optText('priority'); return t || c.effectivePriority || c.priority || '未设置';}
  function regionLabel(){return optText('regionMode') || val('regionMode') || '未设置';}
  function budgetLabel(){return optText('budget') || val('budget') || '未设置';}
  function genderLabel(c){return c.gender==='female'?'女孩':c.gender==='male'?'男孩':'未设置';}
  function conclusion(){var r=rank(), s=score(), c=dc(), cc=ctx(), band=rankBand(r); var base=(s?String(s)+' 分':'当前分数')+(r?' / 约 '+fmt(r)+' 位':'')+'，大致属于“'+band+'”。';
    if(!r&&!s) return '先输入分数或位次，再生成 Markdown 报告。';
    if(c.scenarioEffective==='budgetFlexible') return base+' 预算较宽时，重点不是能不能花钱，而是这笔钱有没有换来学校层级、城市或专业质量的真实提升。';
    if(c.scenarioEffective==='exam') return base+' 当前按考公/体制路径看，重点比较岗位相关性、费用、公办属性和孩子能否长期准备。';
    if(c.scenarioEffective==='grid') return base+' 当前按电网/能源路径看，既要看电气能源正主，也要复核是否涉及设备、厂站或现场环境。';
    if(c.scenarioEffective==='medical') return base+' 当前按医学方向看，必须同时复核学制、夜班、规培、执业资格和家庭承受周期。';
    if(c.scenarioEffective==='broad') return base+' 当前是宽口径观察，不是最终推荐，建议看出大方向后再回到具体场景复核。';
    return base+' 建议先守住家庭底线，再比较孩子兴趣、专业路径和 A/B/C 三组取舍。';
  }
  function contradictions(){var c=dc(), cc=ctx(), out=[]; function add(t){out.push(t);} 
    if(c.scenarioPriorityConflict)add('我家情况和“当前优先考虑”不完全一致：系统会防止微调吞掉主场景，但建议确认是否需要恢复为场景默认。');
    if(c.scenarioEffective==='grid'&&c.fieldRejectEffective)add('想看电网/能源，但又不接受现场/设备环境：电气、能源、自动化方向需要重点复核培养方向和就业环境。');
    if(c.scenarioEffective==='medical'&&(c.rejectLongCycleEffective||c.rejectNightEffective))add('想看医学，但又拒绝长周期或夜班：临床、口腔、护理等方向不能当作普通稳妥项。');
    if(c.scenarioEffective==='exam'&&String(c.interestEffective||'').indexOf('medical_health')>=0)add('当前按考公/体制看，但孩子选择了医学方向：医学更偏执业资格和长期培养，不是典型考公主线。');
    if(c.regionSoft)add('当前是区域优先，不是严格排除外地；如果只想看辽宁，需要切换成严格区域。');
    if(c.scenarioEffective==='broad')add('当前是先不设限的观察模式，适合看大方向，不适合作为最终填报结论。');
    try{if((window.filtered||[]).length>0&&(window.filtered||[]).length<25)add('符合全部条件的候选较少，建议确认地域、学校性质、费用或专业方向哪一项可以适度放宽。');}catch(e){}
    if(!out.length)add('当前条件没有明显强冲突。建议重点看 B 组，再用 A 组守底线、C 组看机会。');
    return out.slice(0,6);
  }
  function getBuckets(){try{if(window.latestPlanBucketsV29475Fix2) return window.latestPlanBucketsV29475Fix2; var c=closure(); if(c&&c.makeBuckets){var b=c.makeBuckets(); window.latestPlanBucketsV29475Fix2=b; return b;}}catch(e){} return {A:[],B:[],C:[]};}
  function scoreRank(r){var s=r?.score2025||r?.score||r?.minScore||r?.score_2025||''; var rk=r?.rank2025||r?.rank||r?.minRank||r?.rank_2025||''; var arr=[]; if(s)arr.push(String(s)+'分'); if(rk)arr.push(String(fmt(rk))+'位'); return arr.join(' / ')||'分数位次待复核';}
  function evidence(r){var a=[]; if(r?.score2025||r?.rank2025)a.push('2025：'+scoreRank(r)); if(r?.score2024||r?.rank2024){var s=[]; if(r.score2024)s.push(String(r.score2024)+'分'); if(r.rank2024)s.push(String(fmt(r.rank2024))+'位'); a.push('2024：'+s.join(' / '));} return a.length?a.join('；'):'投档证据待复核';}
  function tagsFor(r,type,i){try{var e=closure()?.evaluate?.(r,type)||{}; var f=closure()?.closureFields?.(r,type,i)||{}; var parts=[]; if(f.tags)parts=parts.concat(String(f.tags).split('|')); if(e.tags)parts=parts.concat(e.tags); if(r?._level)parts.push(r._level); return Array.from(new Set(parts.map(clean).filter(Boolean))).slice(0,8);}catch(e){return []}}
  function fieldsFor(r,type,i){try{return closure()?.closureFields?.(r,type,i)||{};}catch(e){return {};}}
  function evalFor(r,type){try{return closure()?.evaluate?.(r,type)||{};}catch(e){return {};}}
  function candidateMd(r,type,i,brief){var f=fieldsFor(r,type,i), e=evalFor(r,type); var school=line(r?.school), major=line(r?.major||r?.cleanMajor||r?.admissionMajor); var title='### '+type+(i+1)+' '+line(f.role||'候选项')+'｜'+school+'｜'+major; var arr=[title,''];
    arr.push('- 风险层：'+line(f.riskLayer));
    arr.push('- 2025参考：'+line(scoreRank(r)));
    arr.push('- 取舍点：'+line(f.tradeoff));
    if(!brief){
      arr.push('- 就业环境：'+line(f.environment));
      arr.push('- 毕业出口：'+line(f.exit));
      arr.push('- 下一步复核：'+line(f.review));
      var tg=tagsFor(r,type,i); if(tg.length)arr.push('- 标签：'+tg.join(' / '));
      var notes=line(f.notes || (e.notes||[]).join('；')); if(notes&&notes!=='—')arr.push('- 提醒：'+notes);
      var conflicts=line(f.conflicts || (e.conflicts||[]).join(' / ')); if(conflicts&&conflicts!=='—')arr.push('- 冲突识别：'+conflicts);
      arr.push('- 证据：'+line(evidence(r)));
    }else{
      arr.push('- 下一步：'+line(f.review));
    }
    return arr.join('\n');}
  function sectionMd(type,title,desc,rows,brief){var arr=['## '+title,'',desc,'']; var list=(rows||[]).slice(0, brief?3:6); if(!list.length)arr.push('暂无合适候选。'); else list.forEach(function(r,i){arr.push(candidateMd(r,type,i,brief),'');}); return arr.join('\n');}
  function mentorReviewBlock(){return ['## 名师式复核口径（克制版）','','这里不冒充任何人，也不替家里拍板。只按“网报名师式复核口径”提醒三件事：','','1. 先定可行集，再谈冲稳保，别一上来只看学校名。','2. 普通家庭要看成本、周期和能不能兑现；预算宽也要看钱到底换来了什么。','3. A/B/C 是家庭讨论方案，不是最终志愿顺序。高分保可以有，但不能排在前面。',''].join('\n');}
  function orderBlock(){return ['## 重要说明：报告展示顺序 ≠ 最终志愿顺序','','A/B/C 是家庭讨论方案，不是最终志愿填报顺序。','','如果后续整理正式志愿草案，建议按：','','1. 前段：小冲','2. 中段：匹配 / 稳妥','3. 后段：保底','4. 最后：强保底','','高分保和强保底可以存在，但不能排在前面，只能作为后段兜底。',''].join('\n');}
  function reviewChecklist(){return ['## 必须复核清单','','- 招生章程','- 当年招生计划','- 学费和收费方式','- 校区','- 专业培养方向','- 大类分流规则','- 转专业规则','- 体检和单科限制','- 中外合作证书与是否必须出国','- 考公岗位专业限制',''].join('\n');}
  function metaLines(){var c=dc(), cc=ctx(); return ['生成时间：'+now(),'版本：'+FULL_VERSION,'输入：'+(score()?score()+' 分':'分数待填')+(rank()?' / 约 '+fmt(rank())+' 位':''),'分数段：'+rankBand(rank()),'我家情况：'+scenarioLabel(c.scenarioEffective||cc.scenario||''),'当前优先考虑：'+priorityLabel(c),'地域：'+regionLabel(),'预算：'+budgetLabel(),'孩子：'+genderLabel(cc)].join('  \n');}
  function fullMarkdown(){var b=getBuckets(); var arr=['# 辽宁物理类高考志愿初选报告（Markdown 复核版）','',metaLines(),'','> 这是一份家庭初选讨论稿，不替代招生章程、官方计划、学费、校区和培养方向复核。','','## 1. 当前结论','',conclusion(),'','## 2. 我家主要矛盾','']; contradictions().forEach(function(x){arr.push('- '+x);}); arr.push('',mentorReviewBlock(),sectionMd('A','3. A 先守住底线','这组先看家庭底线：费用、学校性质、地域和孩子能否接受。',b.A,false),sectionMd('B','4. B 重点拿出来讨论','这组是家庭重点讨论区：学校、专业、孩子兴趣和未来路径要一起看。',b.B,false),sectionMd('C','5. C 想看看机会','这组是机会对照，不是稳妥建议。要重点复核位次、学费、校区和培养方向。',b.C,false),orderBlock(),reviewChecklist(),'## 最后提醒','','本报告用于家庭初选和复核讨论，不替代正式志愿填报。最终请以辽宁招生考试之窗、学校招生章程、当年招生计划、学费、校区和专业培养方向为准。'); return arr.join('\n');}
  function briefMarkdown(){var b=getBuckets(); var arr=['# 辽宁物理类志愿初选家庭讨论稿','',metaLines(),'','## 当前一句话结论','',conclusion(),'','## 我家主要矛盾','']; contradictions().slice(0,3).forEach(function(x){arr.push('- '+x);}); arr.push('',sectionMd('A','A 先守住底线','先看家庭能接受、风险相对低的方案。',b.A,true),sectionMd('B','B 重点拿出来讨论','最适合一家人重点讨论的方案。',b.B,true),sectionMd('C','C 想看看机会','机会对照，不是稳妥建议。',b.C,true),'## 填报顺序提醒','','正式志愿草案建议：前段小冲，中段匹配/稳妥，后段保底，最后强保底。高分保不要排在前面。'); return arr.join('\n');}
  function copyText(t){if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(t); var ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();return Promise.resolve();}
  function toast(msg){var el=document.getElementById('exportMdToastV291'); if(el)el.textContent=msg; setTimeout(function(){if(el&&el.textContent===msg)el.textContent='';},2600);}
  function download(name,text){var blob=new Blob([text],{type:'text/markdown;charset=utf-8'}); var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},1000);}
  function filename(){var s=score()?score()+'分':'未填分'; var r=rank()?fmt(rank())+'位':'未定位'; return '辽宁物理类志愿初选报告_'+s+'_'+r+'_md复核版.md'.replace(/[\\/:*?"<>|]/g,'_');}
  function inject(){var area=document.querySelector('.family-read-actions-v291'); if(!area||area.querySelector('[data-export-md="full"]'))return; var btn1=document.createElement('button'); btn1.type='button'; btn1.className='export-md-action-v291'; btn1.dataset.exportMd='brief'; btn1.textContent='复制家庭群 MD'; var btn2=document.createElement('button'); btn2.type='button'; btn2.className='export-md-action-v291'; btn2.dataset.exportMd='full'; btn2.textContent='复制 Markdown 完整版'; var btn3=document.createElement('button'); btn3.type='button'; btn3.className='export-md-action-v291 download'; btn3.dataset.exportMd='download'; btn3.textContent='下载 .md 文件'; var sp=document.createElement('span'); sp.id='exportMdToastV291'; sp.className='export-md-toast-v291'; area.appendChild(btn1); area.appendChild(btn2); area.appendChild(btn3); area.appendChild(sp);}
  function bind(){document.addEventListener('click',function(e){var b=e.target.closest('[data-export-md]'); if(!b)return; var mode=b.dataset.exportMd; if(mode==='brief')copyText(briefMarkdown()).then(function(){toast('已复制家庭群 Markdown');}).catch(function(){toast('复制失败，请手动选择文本');}); if(mode==='full')copyText(fullMarkdown()).then(function(){toast('已复制 Markdown 完整版');}).catch(function(){toast('复制失败，请手动选择文本');}); if(mode==='download'){download(filename(),fullMarkdown()); toast('已生成 .md 文件');}});}
  function refreshDebug(){try{window.LN_DEBUG_V2983?.setFlags?.({exportMd:VERSION,exportMdStamp:STAMP,markdownCopy:true,markdownDownload:true,mentorStyleCopy:'neutral_web_mentor',doesModifyFormula:false,doesChangeCandidatePool:false,doesChangeSorting:false});}catch(e){} try{window.__LN_EXPORT_MD_STATE__={version:VERSION,stamp:STAMP,ready:true};}catch(e){}}
  function apply(){inject(); refreshDebug();}
  function schedule(){clearTimeout(timer); timer=setTimeout(apply,120);} 
  function boot(){bind(); apply(); try{new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});}catch(e){} setInterval(apply,1500);}
  window.LN_EXPORT_MD_V291={ready:true,version:VERSION,stamp:STAMP,briefMarkdown:briefMarkdown,fullMarkdown:fullMarkdown,downloadMarkdown:function(){download(filename(),fullMarkdown());}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot); else boot();
})();
