// V2.91RC0.rules-closure4.family-read1.frontfix1.export-md2｜Markdown位次明细与复核增强版
// 只增加 Markdown 复制/下载与明细复核输出；不参与候选池、排序、A/B/C 业务计算。
(function(){
  if(window.LN_EXPORT_MD_OPT===false) return;
  var VERSION='v291rc0md2';
  var STAMP='291rc0md2-20260514';
  var FULL_VERSION='V2.91RC0.rules-closure4.family-read1.frontfix1.export-md2';
  var timer=null;
  function val(id){try{return document.getElementById(id)?.value||'';}catch(e){return '';}}
  function optText(id){try{var el=document.getElementById(id); return el?.selectedOptions?.[0]?.textContent?.trim()||el?.value||'';}catch(e){return '';}}
  function num(v){v=Number(v);return Number.isFinite(v)?v:0;}
  function fmt(n){n=Number(n);return Number.isFinite(n)&&n? n.toLocaleString('zh-CN') : '-';}
  function signedFmt(n){n=Number(n); if(!Number.isFinite(n)||!n)return '0'; return (n>0?'+':'')+n.toLocaleString('zh-CN');}
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
  function rowRank(r){return num(r?.rank2025||r?.rank||r?.minRank||r?.rank_2025)||null;}
  function rowScore(r){return num(r?.score2025||r?.score||r?.minScore||r?.score_2025)||null;}
  function rowRank24(r){return num(r?.rank2024||r?.rank_2024)||null;}
  function rowScore24(r){return num(r?.score2024||r?.score_2024)||null;}
  function scoreRank(r){var s=rowScore(r)||''; var rk=rowRank(r)||''; var arr=[]; if(s)arr.push(String(s)+'分'); if(rk)arr.push(String(fmt(rk))+'位'); return arr.join(' / ')||'分数位次待复核';}
  function scoreRank24(r){var s=rowScore24(r)||''; var rk=rowRank24(r)||''; var arr=[]; if(s)arr.push(String(s)+'分'); if(rk)arr.push(String(fmt(rk))+'位'); return arr.join(' / ')||'2024数据待复核';}
  function childGap(r){var cr=rank(), rr=rowRank(r); if(!cr||!rr)return {text:'位次差待复核',gap:null,kind:'unknown'}; var gap=rr-cr; if(gap>=0)return {gap:gap,kind:'lead',text:'孩子领先约 '+fmt(gap)+' 位'}; return {gap:gap,kind:'behind',text:'孩子落后约 '+fmt(Math.abs(gap))+' 位'};}
  function riskByGap(r, f){var g=childGap(r); var risk=line(f?.riskLayer); if(g.gap==null)return risk||'需复核'; if(g.gap>=10000)return '强保底/分数利用偏低'; if(g.gap>=5000)return '保底'; if(g.gap>=1800)return '稳妥'; if(g.gap>=-1500)return '匹配边缘'; if(g.gap>=-4500)return '小冲'; return '位次风险高';}
  function yearlyChange(r){var r25=rowRank(r), r24=rowRank24(r); if(!r25||!r24)return {text:'2024/2025位次变化：数据不完整，需复核。',delta:null,label:'需复核',brief:'需复核'}; var delta=r25-r24; var abs=Math.abs(delta); var label='基本接近', brief='基本持平'; if(abs<800){label='近两年位次基本接近'; brief='基本持平';}
    else if(delta<0){label='2025 比 2024 收紧约 '+fmt(abs)+' 位，更难进'; brief='收紧 '+fmt(abs)+' 位';}
    else {label='2025 比 2024 放宽约 '+fmt(abs)+' 位，更好进'; brief='放宽 '+fmt(abs)+' 位';}
    var extra=r?.rankChangeLabel?('（系统标记：'+clean(r.rankChangeLabel)+'）'):'';
    return {delta:delta,label:label+extra,brief:brief,text:'2025：'+scoreRank(r)+'；2024：'+scoreRank24(r)+'；变化判断：'+label+extra};}
  function planChange(r){var p25=r?.plan2025||r?.plan_2025||r?.enrollPlan2025||r?.招生计划2025; var p24=r?.plan2024||r?.plan_2024||r?.enrollPlan2024||r?.招生计划2024; if(p25||p24){var txt=[]; if(p25)txt.push('2025计划：'+p25); if(p24)txt.push('2024计划：'+p24); if(p25&&p24){var d=num(p25)-num(p24); if(Number.isFinite(d)&&d)txt.push('计划变化：'+(d>0?'增加':'减少')+fmt(Math.abs(d))+' 人'); else txt.push('计划变化：基本持平');} return txt.join('；');}
    return '招生计划变化：当前数据未完整接入，需以当年招生计划复核。';}
  function natureCostCampus(r){var n=r?.schoolNatureLabel||r?.nature||r?.schoolNature||'需核验'; var fee=r?.tuition2025||r?.tuition||r?.fee||'需复核'; var area=[r?.schoolProvince,r?.schoolCity].filter(Boolean).join('·') || r?.lnArea || '地域待复核'; var flags=[]; if(r?.isHighFee)flags.push('高收费/中外需复核'); if(/中外|合作|高收费|国际/i.test(String(r?.major||'')+String(r?.riskFlags||'')))flags.push('疑似中外/合作/高收费'); return '办学性质：'+line(n)+'；学费：'+line(fee)+'；地域/校区：'+line(area)+(flags.length?'；'+flags.join('；'):'');}
  function majorMeta(r){var parts=[]; if(r?.schoolCode2025)parts.push('院校代码/代号：'+r.schoolCode2025); if(r?.majorCode2025)parts.push('招生专业代号：'+r.majorCode2025); parts.push('本科专业目录代码：需复核'); parts.push('门类/专业类：需按本科专业目录复核'); return parts.join('；');}
  function majorClassRisk(r){var m=clean(r?.major||r?.admissionMajor||''); if(/类|试验班|大类|工科试验|理科试验/.test(m))return '大类招生提醒：疑似大类/试验班，不等同于最终专业，需复核分流专业、分流规则和转专业政策。'; return '大类招生：未识别为明显大类；仍建议复核招生章程中的培养方向。';}
  function whyInGroup(type,f,e){if(type==='A')return '进入 A 组：主要用于守家庭底线，重点看费用、学校性质、地域、位次安全和孩子能否接受。'; if(type==='B')return '进入 B 组：主要用于家庭重点讨论，重点看专业路径、孩子兴趣、家庭目标和未来出口。'; return '进入 C 组：主要用于机会对照，不是稳妥建议，重点复核位次风险、学费、校区和培养方式。';}
  function gainSacrifice(f,r){var t=line(f?.tradeoff); if(t&&t!=='—')return t; var risk=String(f?.riskLayer||''); if(/机会|小冲|位次风险/.test(risk))return '得到：学校层级、城市或专业机会；牺牲：位次安全度和复核成本。'; if(/保底|强保底/.test(risk))return '得到：安全垫；牺牲：分数利用效率和学校/专业上限。'; return '得到：学校、专业和风险相对均衡；牺牲：需要继续复核培养方向和当年计划。';}
  function volunteerBand(r,type,f){var risk=String(riskByGap(r,f)||f?.riskLayer||''); if(/位次风险高|超冲/.test(risk))return '机会观察：风险过高，原则上不宜进入正式志愿前段。'; if(/小冲|机会/.test(risk))return '前段：小冲'; if(/匹配|稳妥/.test(risk))return '中段：匹配/稳妥'; if(/强保底|分数利用偏低/.test(risk))return '最后：强保底'; if(/保底/.test(risk))return '后段：保底'; return type==='C'?'前段/机会对照：需复核':'中段：匹配/稳妥';}
  function conclusion(){var r=rank(), s=score(), c=dc(), band=rankBand(r); var base=(s?String(s)+' 分':'当前分数')+(r?' / 约 '+fmt(r)+' 位':'')+'，大致属于“'+band+'”。';
    if(!r&&!s) return '先输入分数或位次，再生成 Markdown 报告。';
    if(c.scenarioEffective==='budgetFlexible') return base+' 预算较宽时，重点不是能不能花钱，而是这笔钱有没有换来学校层级、城市或专业质量的真实提升。';
    if(c.scenarioEffective==='exam') return base+' 当前按考公/体制路径看，重点比较岗位相关性、费用、公办属性和孩子能否长期准备。';
    if(c.scenarioEffective==='grid') return base+' 当前按电网/能源路径看，既要看电气能源正主，也要复核是否涉及设备、厂站或现场环境。';
    if(c.scenarioEffective==='medical') return base+' 当前按医学方向看，必须同时复核学制、夜班、规培、执业资格和家庭承受周期。';
    if(c.scenarioEffective==='broad') return base+' 当前是宽口径观察，不是最终推荐，建议看出大方向后再回到具体场景复核。';
    return base+' 建议先守住家庭底线，再比较孩子兴趣、专业路径和 A/B/C 三组取舍。';}
  function contradictions(){var c=dc(), out=[]; function add(t){out.push(t);}
    if(c.scenarioPriorityConflict)add('我家情况和“当前优先考虑”不完全一致：系统会防止微调吞掉主场景，但建议确认是否需要恢复为场景默认。');
    if(c.scenarioEffective==='grid'&&c.fieldRejectEffective)add('想看电网/能源，但又不接受现场/设备环境：电气、能源、自动化方向需要重点复核培养方向和就业环境。');
    if(c.scenarioEffective==='medical'&&(c.rejectLongCycleEffective||c.rejectNightEffective))add('想看医学，但又拒绝长周期或夜班：临床、口腔、护理等方向不能当作普通稳妥项。');
    if(c.scenarioEffective==='exam'&&String(c.interestEffective||'').indexOf('medical_health')>=0)add('当前按考公/体制看，但孩子选择了医学方向：医学更偏执业资格和长期培养，不是典型考公主线。');
    if(c.regionSoft)add('当前是区域优先，不是严格排除外地；如果只想看辽宁，需要切换成严格区域。');
    if(c.scenarioEffective==='broad')add('当前是先不设限的观察模式，适合看大方向，不适合作为最终填报结论。');
    try{if((window.filtered||[]).length>0&&(window.filtered||[]).length<25)add('符合全部条件的候选较少，建议确认地域、学校性质、费用或专业方向哪一项可以适度放宽。');}catch(e){}
    if(!out.length)add('当前条件没有明显强冲突。建议重点看 B 组，再用 A 组守底线、C 组看机会。');
    return out.slice(0,6);}
  function getBuckets(){try{if(window.latestPlanBucketsV29475Fix2) return window.latestPlanBucketsV29475Fix2; var c=closure(); if(c&&c.makeBuckets){var b=c.makeBuckets(); window.latestPlanBucketsV29475Fix2=b; return b;}}catch(e){} return {A:[],B:[],C:[]};}
  function evidence(r){var yc=yearlyChange(r); return yc.text;}
  function tagsFor(r,type,i){try{var e=closure()?.evaluate?.(r,type)||{}; var f=closure()?.closureFields?.(r,type,i)||{}; var parts=[]; if(f.tags)parts=parts.concat(String(f.tags).split('|')); if(e.tags)parts=parts.concat(e.tags); if(r?._level)parts.push(r._level); return Array.from(new Set(parts.map(clean).filter(Boolean))).slice(0,10);}catch(e){return [];}}
  function fieldsFor(r,type,i){try{return closure()?.closureFields?.(r,type,i)||{};}catch(e){return {};}}
  function evalFor(r,type){try{return closure()?.evaluate?.(r,type)||{};}catch(e){return {};}}
  function candidateMd(r,type,i,brief){var f=fieldsFor(r,type,i), e=evalFor(r,type); var school=line(r?.school), major=line(r?.major||r?.cleanMajor||r?.admissionMajor); var role=line(f.role||'候选项'); var risk=riskByGap(r,f); var title='### '+type+(i+1)+' '+role+'｜'+school+'｜'+major; var arr=[title,''];
    arr.push('- 风险层：'+line(risk));
    arr.push('- 我家位次对比：我家约 '+(rank()?fmt(rank())+' 位':'待定位')+'；2025最低位次 '+(rowRank(r)?fmt(rowRank(r))+' 位':'待复核')+'；'+childGap(r).text+'。');
    arr.push('- 近两年投档：'+line(evidence(r)));
    arr.push('- 变化提醒：'+planChange(r));
    arr.push('- 在最终志愿草案中的位置：'+volunteerBand(r,type,f));
    arr.push('- 得到/牺牲：'+gainSacrifice(f,r));
    arr.push('- 为什么进 '+type+' 组：'+whyInGroup(type,f,e));
    if(!brief){
      arr.push('- 办学/费用/校区：'+natureCostCampus(r));
      arr.push('- 专业代码与门类：'+majorMeta(r));
      arr.push('- 大类/分流：'+majorClassRisk(r));
      arr.push('- 就业环境：'+line(f.environment));
      arr.push('- 毕业出口：'+line(f.exit));
      arr.push('- 下一步复核：'+line(f.review));
      var tg=tagsFor(r,type,i); if(tg.length)arr.push('- 标签：'+tg.join(' / '));
      var notes=line(f.notes || (e.notes||[]).join('；')); if(notes&&notes!=='—')arr.push('- 提醒：'+notes);
      var conflicts=line(f.conflicts || (e.conflicts||[]).join(' / ')); if(conflicts&&conflicts!=='—')arr.push('- 冲突识别：'+conflicts);
    }else{
      arr.push('- 下一步：'+line(f.review));
    }
    return arr.join('\n');}
  function sectionMd(type,title,desc,rows,brief){var arr=['## '+title,'',desc,'']; var list=(rows||[]).slice(0, brief?3:6); if(!list.length)arr.push('暂无合适候选。'); else list.forEach(function(r,i){arr.push(candidateMd(r,type,i,brief),'');}); return arr.join('\n');}
  function flatBuckets(){var b=getBuckets(), seen=new Set(), out=[]; ['A','B','C'].forEach(function(t){(b[t]||[]).slice(0,6).forEach(function(r,i){var id=r?.id||[r?.school,r?.major,rowRank(r)].join('|'); if(seen.has(id))return; seen.add(id); out.push({type:t,index:i,row:r,fields:fieldsFor(r,t,i)});});}); return out;}
  function volunteerOrderBlock(){var groups={'前段：小冲':[],'中段：匹配/稳妥':[],'后段：保底':[],'最后：强保底':[],'机会观察：暂不进正式前段':[]}; flatBuckets().forEach(function(x){var vb=volunteerBand(x.row,x.type,x.fields); var key=/机会观察/.test(vb)?'机会观察：暂不进正式前段':/前段/.test(vb)?'前段：小冲':/后段/.test(vb)?'后段：保底':/最后/.test(vb)?'最后：强保底':'中段：匹配/稳妥'; groups[key].push(x);});
    var arr=['## 最终志愿草案排序建议（讨论版）','','注意：以下不是正式志愿表，只是把 A/B/C 候选按辽宁“专业+学校”平行志愿思路重新整理。报告展示顺序不等于最终志愿顺序。',''];
    Object.keys(groups).forEach(function(k){arr.push('### '+k); if(!groups[k].length){arr.push('暂无。',''); return;} groups[k].slice(0,10).forEach(function(x,i){var r=x.row; arr.push((i+1)+'. '+line(r?.school)+'｜'+line(r?.major||r?.cleanMajor||r?.admissionMajor)+'｜'+scoreRank(r)+'｜'+childGap(r).text+'｜来源：'+x.type+(x.index+1));}); arr.push('');});
    arr.push('原则：高分保和强保底可以存在，但不能排在前面；超冲只作机会观察，不应伪装成小冲。');
    return arr.join('\n');}
  function comparisonSummaryBlock(){var arr=['## 近两年位次变化汇总','','| 方案 | 学校 | 专业 | 2025位次 | 2024位次 | 变化 | 判断 |','|---|---|---|---:|---:|---:|---|']; flatBuckets().forEach(function(x){var r=x.row, yc=yearlyChange(r); arr.push('| '+x.type+(x.index+1)+' | '+mdEsc(r?.school)+' | '+mdEsc(r?.major||r?.cleanMajor||r?.admissionMajor)+' | '+fmt(rowRank(r))+' | '+fmt(rowRank24(r))+' | '+mdEsc(yc.brief)+' | '+mdEsc(yc.label)+' |');});
    arr.push('','位次变化只能作为初步参考。若变化较大，必须复核当年招生计划、专业名称、学费、校区和是否单列代码。'); return arr.join('\n');}
  function riskSummaryBlock(){var rows=flatBuckets(), rs={rush:0,match:0,safe:0,strong:0,cost:0,site:0,medical:0,classMajor:0}; rows.forEach(function(x){var f=x.fields, r=x.row, risk=riskByGap(r,f), text=[risk,f.notes,f.conflicts,f.review,r?.major,r?.riskFlags].join(' '); if(/小冲|位次风险|机会/.test(risk))rs.rush++; else if(/匹配|稳妥/.test(risk))rs.match++; else if(/强保底|分数利用/.test(risk))rs.strong++; else if(/保底/.test(risk))rs.safe++; if(/中外|合作|高收费|民办|学费/.test(text))rs.cost++; if(/现场|设备|厂站|工厂/.test(text))rs.site++; if(/医学|临床|护理|夜班|长周期/.test(text))rs.medical++; if(/类|试验班|大类|分流/.test(text))rs.classMajor++;});
    return ['## 风险汇总','','- 位次风险/机会项：'+rs.rush+' 个','- 匹配/稳妥项：'+rs.match+' 个','- 保底项：'+rs.safe+' 个','- 强保底/分数利用偏低：'+rs.strong+' 个','- 成本/中外/高收费需复核：'+rs.cost+' 个','- 现场/设备环境需复核：'+rs.site+' 个','- 医学长周期/夜班/资格需复核：'+rs.medical+' 个','- 大类招生/分流需复核：'+rs.classMajor+' 个',''].join('\n');}
  function notSelectedBlock(){return ['## 没放到主方案里的常见原因','','- 部分高层级学校：位次风险过高，不适合当主方案。','- 部分高收费/中外合作：可以做机会对照，但要先复核学费、证书、校区和培养方式。','- 部分热门专业：位次风险高，或与孩子学习强度、家庭底线存在冲突。','- 部分保底项：安全性高，但分数利用偏低，只适合放在后段或最后兜底。',''].join('\n');}
  function nextStepBlock(){return ['## 下一步建议','','1. 先从 B 组挑 3–5 个重点讨论。','2. A 组保留 2–3 个底线选择，但不要把强保底排在前面。','3. C 组只作为机会对照，不要直接当前排志愿。','4. 对中外合作、高收费、校区、大类招生，必须查招生章程。','5. 最终志愿草案不要按报告顺序填，要按“小冲—匹配/稳妥—保底—强保底”重新排序。',''].join('\n');}
  function mentorReviewBlock(){return ['## 名师式复核口径（克制版）','','这里不冒充任何人，也不替家里拍板。只按“网报名师式复核口径”提醒三件事：','','1. 先定可行集，再谈冲稳保，别一上来只看学校名。','2. 普通家庭要看成本、周期和能不能兑现；预算宽也要看钱到底换来了什么。','3. A/B/C 是家庭讨论方案，不是最终志愿顺序。高分保可以有，但不能排在前面。',''].join('\n');}
  function orderBlock(){return ['## 重要说明：报告展示顺序 ≠ 最终志愿顺序','','A/B/C 是家庭讨论方案，不是最终志愿填报顺序。','','如果后续整理正式志愿草案，建议按：','','1. 前段：小冲','2. 中段：匹配 / 稳妥','3. 后段：保底','4. 最后：强保底','','高分保和强保底可以存在，但不能排在前面，只能作为后段兜底。',''].join('\n');}
  function reviewChecklist(){return ['## 必须复核清单','','- 招生章程','- 当年招生计划','- 学费和收费方式','- 校区','- 专业培养方向','- 大类分流规则','- 转专业规则','- 体检和单科限制','- 中外合作证书与是否必须出国','- 考公岗位专业限制',''].join('\n');}
  function dataScopeBlock(){return ['## 数据口径说明','','- 分数位次：按当前系统内置一分一段口径换算。','- 投档数据：基于系统内置 2024/2025 辽宁物理类投档数据。','- 位次变化：用于初步复核冷热和安全垫，不代表 2026 年必然趋势。','- 报告用途：家庭初选和讨论，不替代正式志愿填报。','- 最终复核：以辽宁招生考试之窗、学校招生章程、当年招生计划、学费、校区和培养方向为准。',''].join('\n');}
  function metaLines(){var c=dc(), cc=ctx(); return ['生成时间：'+now(),'版本：'+FULL_VERSION,'输入：'+(score()?score()+' 分':'分数待填')+(rank()?' / 约 '+fmt(rank())+' 位':''),'分数段：'+rankBand(rank()),'我家情况：'+scenarioLabel(c.scenarioEffective||cc.scenario||''),'当前优先考虑：'+priorityLabel(c),'地域：'+regionLabel(),'预算：'+budgetLabel(),'孩子：'+genderLabel(cc)].join('  \n');}
  function fullMarkdown(){var b=getBuckets(); var arr=['# 辽宁物理类高考志愿初选报告（Markdown 明细复核版）','',metaLines(),'','> 这是一份家庭初选讨论稿，不替代招生章程、官方计划、学费、校区和培养方向复核。','','## 1. 当前结论','',conclusion(),'','## 2. 我家主要矛盾','']; contradictions().forEach(function(x){arr.push('- '+x);}); arr.push('',mentorReviewBlock(),sectionMd('A','3. A 先守住底线','这组先看家庭底线：费用、学校性质、地域和孩子能否接受。',b.A,false),sectionMd('B','4. B 重点拿出来讨论','这组是家庭重点讨论区：学校、专业、孩子兴趣和未来路径要一起看。',b.B,false),sectionMd('C','5. C 想看看机会','这组是机会对照，不是稳妥建议。要重点复核位次、学费、校区和培养方向。',b.C,false),comparisonSummaryBlock(),riskSummaryBlock(),volunteerOrderBlock(),notSelectedBlock(),nextStepBlock(),orderBlock(),reviewChecklist(),dataScopeBlock(),'## 最后提醒','','本报告用于家庭初选和复核讨论，不替代正式志愿填报。最终请以辽宁招生考试之窗、学校招生章程、当年招生计划、学费、校区和专业培养方向为准。'); return arr.join('\n');}
  function briefMarkdown(){var b=getBuckets(); var arr=['# 辽宁物理类志愿初选家庭讨论稿','',metaLines(),'','## 当前一句话结论','',conclusion(),'','## 我家主要矛盾','']; contradictions().slice(0,3).forEach(function(x){arr.push('- '+x);}); arr.push('',sectionMd('A','A 先守住底线','先看家庭能接受、风险相对低的方案。',b.A,true),sectionMd('B','B 重点拿出来讨论','最适合一家人重点讨论的方案。',b.B,true),sectionMd('C','C 想看看机会','机会对照，不是稳妥建议。',b.C,true),'## 填报顺序提醒','','正式志愿草案建议：前段小冲，中段匹配/稳妥，后段保底，最后强保底。高分保不要排在前面。'); return arr.join('\n');}
  function copyText(t){if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(t); var ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();return Promise.resolve();}
  function toast(msg){var el=document.getElementById('exportMdToastV291'); if(el)el.textContent=msg; setTimeout(function(){if(el&&el.textContent===msg)el.textContent='';},2600);}
  function download(name,text){var blob=new Blob([text],{type:'text/markdown;charset=utf-8'}); var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},1000);}
  function filename(){var s=score()?score()+'分':'未填分'; var r=rank()?fmt(rank())+'位':'未定位'; return ('辽宁物理类志愿初选报告_'+s+'_'+r+'_md明细复核版.md').replace(/[\\/:*?"<>|]/g,'_');}
  function inject(){var area=document.querySelector('.family-read-actions-v291'); if(!area||area.querySelector('[data-export-md="full"]'))return; var btn1=document.createElement('button'); btn1.type='button'; btn1.className='export-md-action-v291'; btn1.dataset.exportMd='brief'; btn1.textContent='复制家庭群 MD'; var btn2=document.createElement('button'); btn2.type='button'; btn2.className='export-md-action-v291'; btn2.dataset.exportMd='full'; btn2.textContent='复制 Markdown 明细版'; var btn3=document.createElement('button'); btn3.type='button'; btn3.className='export-md-action-v291 download'; btn3.dataset.exportMd='download'; btn3.textContent='下载 .md 文件'; var sp=document.createElement('span'); sp.id='exportMdToastV291'; sp.className='export-md-toast-v291'; area.appendChild(btn1); area.appendChild(btn2); area.appendChild(btn3); area.appendChild(sp);}
  function bind(){document.addEventListener('click',function(e){var b=e.target.closest('[data-export-md]'); if(!b)return; var mode=b.dataset.exportMd; if(mode==='brief')copyText(briefMarkdown()).then(function(){toast('已复制家庭群 Markdown');}).catch(function(){toast('复制失败，请手动选择文本');}); if(mode==='full')copyText(fullMarkdown()).then(function(){toast('已复制 Markdown 明细版');}).catch(function(){toast('复制失败，请手动选择文本');}); if(mode==='download'){download(filename(),fullMarkdown()); toast('已生成 .md 文件');}});}
  function refreshDebug(){try{window.LN_DEBUG_V2983?.setFlags?.({exportMd:VERSION,exportMdStamp:STAMP,markdownCopy:true,markdownDownload:true,markdownRankDetail:true,markdownVolunteerOrder:true,mentorStyleCopy:'neutral_web_mentor',doesModifyFormula:false,doesChangeCandidatePool:false,doesChangeSorting:false});}catch(e){} try{window.__LN_EXPORT_MD_STATE__={version:VERSION,stamp:STAMP,ready:true,rankDetail:true,volunteerOrder:true};}catch(e){}}
  function apply(){inject(); refreshDebug();}
  function schedule(){clearTimeout(timer); timer=setTimeout(apply,120);} 
  function boot(){bind(); apply(); try{new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});}catch(e){} setInterval(apply,1500);}
  window.LN_EXPORT_MD_V291={ready:true,version:VERSION,stamp:STAMP,briefMarkdown:briefMarkdown,fullMarkdown:fullMarkdown,downloadMarkdown:function(){download(filename(),fullMarkdown());}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot); else boot();
})();
