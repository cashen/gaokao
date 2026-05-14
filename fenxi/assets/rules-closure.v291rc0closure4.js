// V2.91RC0.rules-closure4｜家庭讨论输出闭环完整版
// 目标：把性别、学习特点、拒绝项、兴趣、我家情况、当前优先考虑接入同一套 A/B/C 业务闭环。
// 边界：不改原始数据、不改地域 hard、不改兴趣真实命中模型、不改分数位次计算。
(function(){
  if(window.LN_RULES_CLOSURE_OPT===false) return;
  var VERSION='v291rc0closure4';
  var STAMP='291rc0closure4-20260514';
  var perf=function(){return window.performance&&performance.now?performance.now():Date.now();};
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(s){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s];});}
  function txt(r){return String((r&&(r.majorText||r.cleanMajor||r.major||r.admissionMajor))||'').replace(/\s+/g,'');}
  function schoolText(r){return String((r&&(r.school||''))||'');}
  function val(id){try{return document.getElementById(id)?.value||'';}catch(e){return '';}}
  function rejects(){try{return (typeof selectedRejects==='function'?selectedRejects():[]).filter(Boolean);}catch(e){return [];}}
  function profile(){try{return window.LN_STUDENT_PROFILE_RULES_V298?.readState?.()||{};}catch(e){return {};}}
  function interestIds(){try{return window.LN_CHILD_INTEREST_RUNTIME_V296?.effectiveGroupIds?.()||[];}catch(e){return [];}}
  function hasInterest(id){return interestIds().indexOf(id)>=0;}
  function currentScenario(){
    try{var st=window.LN_PARENT_TRUST_V291RC0?.getState?.(); if(st?.scenarioEffective)return st.scenarioEffective;}catch(e){}
    try{if(typeof currentStrategy!=='undefined'&&currentStrategy)return currentStrategy;}catch(e){}
    return window.currentStrategy||'employment';
  }
  function priorityValue(){return val('priority') || 'employment';}
  function prioritySource(){try{return window.LN_PARENT_TRUST_V291RC0?.getState?.().prioritySource||'';}catch(e){return '';} }
  function ctx(){
    var p=profile();
    var r=rejects();
    var gender=p.gender || val('studentGender') || 'unspecified';
    var scenario=currentScenario();
    var priority=priorityValue();
    var ids=interestIds();
    var field=val('fieldWorkAcceptance') || (p.learning==='practice'?'accept':'unknown');
    var load=p.load || (val('mathTolerance')==='low'?'sensitive':'unknown');
    var path=p.path || 'unknown';
    var learning=p.learning || 'unclear';
    var hardSite=r.indexOf('工地现场')>=0 || field==='reject';
    var fieldCaution=field==='caution' || hardSite;
    return {
      gender:gender, learning:learning, load:load, path:path, fieldAcceptance:field,
      rejects:r, fieldReject:hardSite, fieldCaution:fieldCaution,
      scenario:scenario, priority:priority, prioritySource:prioritySource(),
      scenarioDefaultPriority: scenarioDefaultPriority(scenario),
      scenarioPriorityConflict: !!(scenarioDefaultPriority(scenario)!==priority && prioritySource()==='user-tuned'),
      priorityConflictLevel: (function(){var d=scenarioDefaultPriority(scenario); if(d===priority||prioritySource()!=='user-tuned')return 'none'; if((scenario==='exam'&&priority==='grid')||(scenario==='grid'&&hardSite)||(scenario==='medical'&&(r.indexOf('长学制')>=0||r.indexOf('夜班')>=0)))return 'strong'; return 'medium';})(),
      rejectLongCycle:r.indexOf('长学制')>=0,
      rejectNight:r.indexOf('夜班')>=0,
      rejectSales:r.indexOf('销售')>=0,
      regionSoft: val('regionMode')==='soft',
      rankBand: rankBand(),
      interests:ids,
      interestElectric: ids.indexOf('electric_energy')>=0,
      interestMechanical: ids.indexOf('mechanical_instrument')>=0,
      interestComputer: ids.indexOf('computer_info')>=0,
      interestTeacher: ids.indexOf('teacher_education')>=0,
      interestAnimal: ids.indexOf('animal_life_science')>=0,
      interestMedical: ids.indexOf('medical_health')>=0 || ids.indexOf('pharmacy_pharma')>=0,
      interestHumanities: ids.indexOf('humanities_law')>=0,
      interestFinance: ids.indexOf('finance_manage')>=0,
      budget: val('budget')||'normal',
      gradPlan: val('gradPlan') || (path==='grad_ok'?'yes':path==='work_first'?'no':'maybe'),
      timePressure: val('timePressure') || (path==='work_first'?'fast':'normal')
    };
  }
  function pathInfo(r){
    var m=txt(r), s=schoolText(r); var raw=String((r&&(r.majorText||r.cleanMajor||r.major||r.admissionMajor||''))||'');
    var key='unknown', label='专业路径待复核', layer='unknown';
    function ret(k,l,ly){key=k;label=l;layer=ly||k;}
    var isTeacher=/师范|定向师范|公费师范/.test(raw+m);
    var isEdu=/小学教育|学前教育|特殊教育|教育技术|教育学/.test(m);
    if(/公安|思想政治|社会工作|行政管理|公共事业管理|公共管理|马克思主义/.test(m)) ret('public_service','考公 / 体制路径','exam_public');
    else if(/法学/.test(m)) ret('public_service','考公 / 法学路径','exam_law');
    else if(isTeacher || isEdu) ret('teacher','师范 / 考编路径',isTeacher?'teacher_core':'teacher_edu');
    else if(/会计|审计|财务|财政|税收|资产评估|统计学|应用统计|经济统计/.test(m)) ret('accounting','财会 / 统计路径','accounting_core');
    else if(/计算机科学与技术|软件工程|人工智能/.test(m)) ret('computer','计算机 / 强代码路径','strong_code');
    else if(/计算机|网络工程|信息安全|网络空间|数据科学|智能科学|物联网|大数据/.test(m)) ret('computer','计算机 / 数字技术路径','medium_code');
    else if(/信息管理|大数据管理|数字媒体|电子商务/.test(m)) ret('computer','数字化应用路径','applied_digital');
    else if(/能源化学|化学工程|化学工艺|化工|材料化学|应用化学|高分子|制药|材料|环境|食品|生物工程|轻化/.test(m)) ret('deep_engineering','深造依赖 / 实验工科路径','lab_engineering');
    else if(/电气工程及其自动化|智能电网|电力|能源与动力|新能源|储能|核工程|能源科学与工程/.test(m)) ret('electric','电气 / 能源路径',/电气工程及其自动化|智能电网|电力/.test(m)?'electric_core':'electric_related');
    else if(/机械|自动化|机器人工程|车辆|交通运输|轨道|工业工程|物流工程|智能制造|测控|过程装备/.test(m)) ret('engineering','机械 / 自动化 / 交通路径',/自动化|机器人工程|测控/.test(m)?'automation_device':'factory_engineering');
    else if(/电子信息|通信|微电子|集成电路|光电|电子科学|信息工程|测控技术与仪器/.test(m)) ret('electronic','电子信息 / 通信路径','electronic_device');
    else if(/临床|口腔|麻醉|儿科|医学影像|医学检验|护理|康复|药学|预防医学|中医学|针灸|公共卫生|动物医学/.test(m)){
      var ly=/临床|口腔|麻醉|儿科/.test(m)?'medical_clinical':/护理|助产/.test(m)?'medical_nursing':/药学|临床药学/.test(m)?'medical_pharmacy':/医学检验|医学影像技术|康复/.test(m)?'medical_tech':'medical_public';
      ret('medical','医学 / 医学技术路径',ly);
    }
    else if(/金融|经济|国际经济与贸易|保险/.test(m)) ret('business','财经商科路径','finance_econ');
    else if(/工商管理|市场营销|人力资源|旅游管理|酒店管理/.test(m)) ret('business','管理 / 营销路径',/市场营销|旅游|酒店/.test(m)?'sales_service':'management');
    else if(/工程造价|工程管理|供应链|物流管理/.test(m)) ret('business','工程管理 / 供应链路径','operation_management');
    else if(/物理学|应用物理|化学|应用化学|生物科学|数学|信息与计算科学/.test(m)) ret('basic_science','基础理学 / 深造路径','basic_science');
    else if(/材料|环境|生物工程|食品|农学|制药|高分子|轻化|化工/.test(m)) ret('deep_engineering','深造依赖 / 实验工科路径','lab_engineering');
    else if(/汉语言文学|汉语言|汉语国际|新闻|传播|外语|英语|日语|俄语|法语|德语|西班牙|历史|哲学|档案|图书馆/.test(m)) ret('liberal','人文表达路径',/汉语言文学|汉语言/.test(m)?'chinese_liberal':'liberal_general');
    var core=false, related=false;
    if(key==='electric') core=/电气工程及其自动化|智能电网|电力/.test(m), related=!core;
    if(key==='computer') core=/计算机科学与技术|软件工程|网络工程|信息安全/.test(m), related=!core;
    if(key==='public_service') core=/法学|汉语言文学|思想政治教育|公安|行政管理/.test(m), related=!core;
    if(key==='teacher') core=/师范|小学教育|学前教育|思想政治教育/.test(m), related=!core;
    if(key==='accounting') core=/会计|审计|财务|统计/.test(m), related=!core;
    var isMajorClass=/类|试验班|实验班|大类/.test(raw) && !/一类|二类/.test(raw);
    return {key:key,label:label,layer:layer,text:m,raw:raw,school:s,isCore:core,isRelated:related,isTeacher:isTeacher,isMajorClass:isMajorClass};
  }
  function siteRisk(r,path){
    var m=path?.text||txt(r);
    if(/土木|建筑环境|采矿|矿物|石油|油气|地质|测绘|资源勘查|勘查技术|安全工程/.test(m)) return {level:4,key:'hardSite',label:'工地/艰苦现场风险'};
    if(/机械|车辆|过程装备|智能制造|机器人工程|工业工程|材料成型|焊接|冶金|船舶|交通运输|轨道/.test(m)) return {level:3,key:'factorySite',label:'工厂/设备现场风险'};
    if(/电气|智能电网|电力|能源与动力|新能源|储能|核工程|自动化/.test(m)) return {level:3,key:'powerSite',label:'电力/能源/设备现场需复核'};
    if(/测控|仪器|电子信息|通信|电子科学|化工|材料|环境|食品|生物|制药|轻化/.test(m)) return {level:2,key:'deviceLabSite',label:'实验/设备环境需复核'};
    return {level:0,key:'none',label:''};
  }
  function hasReject(c,name){return (c.rejects||[]).indexOf(name)>=0;}
  function currentRankValue(){try{return Number(window.currentRank||currentRank||val('myRank')||0)||0;}catch(e){return Number(val('myRank')||0)||0;}}
  function rankBand(){var r=currentRankValue(); if(!r)return 'unknown'; if(r<=7000)return 'top'; if(r<=14000)return 'high'; if(r<=25000)return 'balance'; if(r<=60000)return 'middle'; if(r<=100000)return 'low'; return 'edge';}
  function scenarioDefaultPriority(sc){return ({employment:'employment',exam:'exam',grid:'grid',medical:'medical',platformSprint:'school',platformStable:'school',highValue:'employment',publicLow:'lowPublic',edgeBachelor:'lowPublic',budgetFlexible:'city',privateMajor:'employment',broad:'employment'})[sc]||'employment';}
  function medicalRisk(path){
    if(path.key!=='medical')return {longCycle:false,night:false,label:''};
    var m=path.text;
    if(/临床|口腔|麻醉|儿科/.test(m)) return {longCycle:true,night:true,label:'医学长周期/高压力'};
    if(/护理|助产/.test(m)) return {longCycle:false,night:true,label:'护理夜班风险'};
    if(/医学影像学/.test(m)) return {longCycle:true,night:true,label:'医学影像长周期'};
    if(/药学|临床药学/.test(m)) return {longCycle:false,night:false,label:'药学资格与就业复核'};
    return {longCycle:false,night:false,label:'医学技术/公共卫生复核'};
  }
  function costRisk(r){var high=!!(r&&(r.isHighFee||r.isCoopV29475||r.isPrivateV29475)); var label=''; if(r?.isCoopV29475)label='中外合作/合作办学成本复核'; else if(r?.isPrivateV29475)label='民办/独立学院成本复核'; else if(r?.isHighFee)label='高收费专业成本复核'; return {high:high,label:label};}
  function schoolRisk(r,path){var raw=String((r&&(r.majorText||r.cleanMajor||r.major||r.admissionMajor||''))||''); var risks=[]; if(path?.isMajorClass)risks.push('大类招生，需复核分流规则'); if(/中外|合作|校企|单列|高收费|只招有志愿/.test(raw))risks.push('招生备注需复核'); if(/校区|分校|盘锦|威海|秦皇岛|荣成/.test(raw+r?.school))risks.push('校区需复核'); return risks;}
  function regionSoftNotice(){return val('regionMode')==='soft';}
  function isTypicalExamPath(path){return ['public_service','teacher','accounting','computer'].indexOf(path.key)>=0;}
  function isFieldHeavy(path){return ['electric','engineering','electronic','deep_engineering'].indexOf(path.key)>=0;}
  function isHighLoad(path){return ['computer','electric','engineering','electronic','medical','deep_engineering'].indexOf(path.key)>=0;}
  function explicitFocus(c,path){
    if(c.priority==='grid'||c.scenario==='grid'||c.interestElectric) return path.key==='electric'||path.key==='electronic'||path.key==='engineering';
    if(c.interestMechanical) return path.key==='engineering'||path.key==='electronic';
    if(c.interestComputer) return path.key==='computer'||path.key==='electronic';
    if(c.interestMedical) return path.key==='medical';
    if(c.interestTeacher) return path.key==='teacher';
    if(c.interestHumanities) return path.key==='public_service'||path.key==='liberal'||path.key==='teacher';
    if(c.interestFinance) return path.key==='accounting'||path.key==='business';
    return false;
  }
  function evalRecord(r,type){
    var c=ctx(), path=pathInfo(r), risk=siteRisk(r,path), med=medicalRisk(path), cost=costRisk(r), srisks=schoolRisk(r,path);
    var delta=0, tags=[], notes=[], reasons=[], conflicts=[];
    function add(d,tag,note){delta+=d; if(tag)tags.push(tag); if(note)notes.push(note); reasons.push({delta:d,tag:tag||'',note:note||''});}
    function conflict(k,n){conflicts.push(k); if(n)notes.push(n);}
    var female=c.gender==='female', male=c.gender==='male';
    var examLike=c.scenario==='exam'||c.priority==='exam'||c.path==='exam_ok';
    var gridLike=c.scenario==='grid'||c.priority==='grid'||c.interestElectric;
    var medicalLike=c.scenario==='medical'||c.priority==='medical'||c.interestMedical;
    var employmentLike=['employment','publicLow','edgeBachelor','privateMajor','broad'].indexOf(c.scenario)>=0 || c.priority==='employment';
    var fieldBlocked=c.fieldReject || c.rejects.indexOf('工地现场')>=0;
    var focus=explicitFocus(c,path);

    // 硬成本和学校备注风险
    if(cost.high){
      if(hasReject(c,'高收费')) add(type==='C'?-40:-65,'成本底线冲突','已明确不接受高收费，这类候选不应作为稳妥项。');
      else if(type==='C') add(0,'机会对照','涉及费用或办学形式差异，适合作为机会对照，不是稳妥建议。');
      else add(-10,'成本需复核',cost.label||'费用需复核');
    }
    if(srisks.length){
      if(type==='C') add(-2,'招生备注复核',srisks[0]); else add(-5,'招生备注复核',srisks[0]);
    }

    // 现场风险闭环
    if(fieldBlocked && risk.level>0){
      var base={A:{4:-52,3:-34,2:-18},B:{4:-62,3:-42,2:-22},C:{4:-38,3:-24,2:-14}}[type]||{};
      add(base[risk.level]||0,'现场风险已降权',risk.label+'；已选择不接受工地/现场，需重点复核实际工作环境。');
      if((female||c.load==='sensitive') && risk.level>=3) add(type==='B'?-16:-9,'孩子承受度复核','孩子情况与现场/设备环境存在冲突，不能只看就业口径。');
    }else if(c.fieldCaution && risk.level>=3){
      add(type==='B'?-13:-7,'现场谨慎','工程/设备现场属性较强，建议把培养方向和岗位环境问清楚。');
    }else if(c.fieldAcceptance==='accept' && risk.level>=3 && (male||c.learning==='practice') && employmentLike){
      add(type==='B'?8:4,'能接受现场','孩子能接受一定工程/设备现场，可作为就业路径比较。');
    }

    // 电网 vs 不接受现场强冲突
    if((c.scenario==='grid'||c.priority==='grid') && fieldBlocked){
      conflict('grid_vs_site_reject','已选择电网/能源，又不接受现场/设备环境，两者存在冲突。');
      if(!c.interestElectric && (path.key==='electric'||path.key==='engineering'||path.key==='electronic')) add(type==='B'?-26:-14,'电网与现场底线冲突','无明确电气兴趣时，不能让电气/工程路径压住家庭底线。');
      else if(c.interestElectric && (path.key==='electric'||path.key==='engineering'||path.key==='electronic')) add(type==='B'?-6:-4,'电网兴趣需复核现场','孩子有电气兴趣，但仍要确认是否接受厂站、设备、调试或运行环境。');
    }

    // 医学内部闭环
    if(path.key==='medical'){
      if(c.rejectLongCycle && med.longCycle) add(type==='B'?-34:-22,'医学长周期冲突','已拒绝长学制/长周期，临床、口腔、麻醉等需明显降权。');
      if(c.rejectNight && med.night) add(type==='B'?-30:-18,'夜班风险冲突','已拒绝夜班，临床/护理等岗位环境需重点复核。');
      if(medicalLike && !c.rejectLongCycle && !c.rejectNight) add(type==='B'?20:8,'医学方向','当前按医学方向看，保留医学主线候选。');
      if(medicalLike && (c.rejectLongCycle||c.rejectNight)) conflict('medical_vs_reject','选择医学方向，但又拒绝长周期或夜班，需要在医学内部重新分层。');
    }

    // 考公与医学兴趣冲突：尊重孩子兴趣，但不把医学当典型考公主线。
    if(c.scenario==='exam' && c.interestMedical){
      conflict('exam_vs_medical_interest','当前按考公/体制看，但孩子选择了医学方向；医学更偏执业资格和长期培养，不是典型考公路径。');
      if(path.key==='medical'){
        add(type==='A'?-10:type==='B'?-6:0,'医学兴趣保留项','因孩子有医学兴趣，保留为可讨论项，但不能当作典型考公主线。');
      }else if(isTypicalExamPath(path)){
        add(type==='B'?8:4,'考公主线对照','考公场景下仍优先岗位相关路径，与医学兴趣形成对照。');
      }
    }

    // 学习强度和计算机/强工科闭环
    if(c.load==='sensitive' && isHighLoad(path)){
      var loadDelta={computer:-16,electric:-16,engineering:-20,electronic:-12,medical:-18,deep_engineering:-22,basic_science:-16}[path.key]||-10;
      if(path.layer==='strong_code') loadDelta-=10;
      if(path.layer==='applied_digital') loadDelta+=8;
      add(type==='B'?loadDelta:Math.round(loadDelta*.65),'学习强度需复核','该方向学习强度、数学/代码/实验要求较高，需确认孩子能否长期承受。');
      if(path.key==='computer' && path.layer==='applied_digital') add(type==='B'?10:4,'数字化应用对照','孩子有计算机兴趣但学习强度敏感，可把数字化应用方向作为对照。');
    }

    // 考公路径闭环
    if(examLike){
      if(isTypicalExamPath(path)){
        var boost=path.key==='public_service'?36:path.key==='accounting'?30:path.key==='teacher'?24:18;
        if(path.key==='teacher' && !path.isTeacher && path.layer!=='teacher_edu') boost-=12;
        add(type==='B'?boost:Math.round(boost*.45),'考公/考编相关','当前按考公体制看，优先岗位相关性和备考兼容度。');
      }else if(path.key==='liberal') add(type==='B'?16:7,'表达类考公对照','表达类方向可作为考公/考编对照，但要复核岗位限制。');
      else if(path.key==='basic_science') add(type==='B'?-8:-4,'非师范理学复核','基础理学不等同于师范，若目标考编需复核是否师范类。');
      else if(isFieldHeavy(path) && !focus){
        add(type==='B'?-32:type==='A'?-15:-18,'非典型考公路径','这条更偏行业/国企/工程就业，不是典型考公路径，不能压过岗位相关专业。');
      }
      if(['low','edge'].indexOf(c.rankBand)>=0 && (path.layer==='exam_law'||path.layer==='chinese_liberal')){
        add(type==='A'?-8:0,'低分段考公需长期准备','法学/汉语言对考公友好，但低分段不能只看专业名，需要长期备考和就业复核。');
      }
    }

    // 性别组合规则：只做组合，不做硬排。
    if(female && !focus){
      if(fieldBlocked && isFieldHeavy(path)) add(type==='B'?-13:-8,'女孩+现场拒绝组合','不是因为性别排除，而是孩子情况与现场类路径同时冲突。');
      if(examLike && (path.key==='public_service'||path.key==='teacher'||path.key==='accounting'||path.key==='computer'||path.key==='liberal')) add(type==='B'?9:4,'女孩考公路径友好','偏表达/考编/岗位相关方向可优先讨论。');
      if(c.learning==='expression' && ['public_service','teacher','accounting','liberal'].indexOf(path.key)>=0) add(type==='B'?11:5,'偏表达匹配','孩子偏表达，法政、师范、财会、人文方向更便于家庭讨论。');
    }
    if(male && c.learning==='expression' && examLike && ['public_service','teacher','accounting','liberal','computer'].indexOf(path.key)>=0){
      add(type==='B'?12:5,'男孩偏表达考公','男孩偏表达且考虑体制，不应默认被工科路径覆盖。');
    }
    if(male && focus && (path.key==='electric'||path.key==='engineering'||path.key==='computer') && !fieldBlocked){
      add(type==='B'?9:4,'兴趣与路径一致','孩子兴趣与专业路径相对一致，可作为主线比较。');
    }

    // 就业、低分公办、候选不足口径
    if(employmentLike){
      if(['computer','electric','accounting','teacher','business'].indexOf(path.key)>=0 && !(fieldBlocked&&isFieldHeavy(path))) add(type==='B'?10:5,'就业路径清楚','当前按就业口径看，优先路径能解释清楚的专业。');
      if(path.key==='deep_engineering' && c.gradPlan==='no') add(type==='B'?-22:-12,'本科就业冲突','该方向本科就业弹性偏弱，通常更依赖读研或行业积累。');
    }
    if((c.scenario==='publicLow'||c.scenario==='edgeBachelor') && c.load==='sensitive' && (isHighLoad(path)||risk.level>=3)){
      add(type==='A'?-16:-8,'低分公办也要看可读性','不能只为公办忽视孩子是否能读下来。');
    }

    // 当前优先考虑和我家情况冲突
    if(c.scenarioPriorityConflict && c.prioritySource==='user-tuned'){
      var msg='当前优先考虑与我家情况不完全一致，系统已避免微调吞掉主场景。';
      if(c.priorityConflictLevel==='strong') conflict('scenario_priority_strong',msg);
      if(c.scenario==='exam' && c.priority==='grid' && !c.interestElectric && (path.key==='electric'||path.key==='engineering'||path.key==='electronic')) add(type==='B'?-28:-14,'优先考虑与我家情况冲突','当前我家情况是考公，但仍残留电网/能源优先；已防止电气能源霸屏。');
    }

    // 明确兴趣：尊重但冲突要解释。
    if(focus){
      add(type==='B'?14:6,'孩子兴趣方向','孩子兴趣与该专业方向有关，保留为可讨论项。');
      if(fieldBlocked && risk.level>=3) add(type==='B'?-8:-4,'兴趣与底线冲突','孩子兴趣和家庭现场底线有冲突，保留但必须复核岗位环境。');
      if(path.key==='computer' && c.load==='sensitive' && path.layer==='strong_code') conflict('interest_vs_load','孩子有计算机兴趣，但学习强度敏感，需要区分强代码和数字化应用。');
    }

    // 销售/服务压力
    if(c.rejectSales && (path.layer==='sales_service'||/市场营销|电子商务|保险|国际经济与贸易|旅游管理|酒店管理/.test(path.text))){
      add(type==='B'?-24:-14,'销售压力冲突','已拒绝销售/强营销，该方向需要复核岗位性质。');
    }

    // broad观察模式、地域soft、C机会项
    if(c.scenario==='broad') add(type==='C'?0:-2,'观察模式','当前是宽口径观察，不代表最终推荐。');
    if(c.regionSoft) add(0,'地域软优先','当前是区域优先，不是严格排除外地。');
    if(type==='C') add(0,'机会对照','C 是机会对照，不是稳妥建议；需复核位次波动、学费、校区和培养方式。');

    tags=[...new Set(tags)].slice(0,7); notes=[...new Set(notes)].slice(0,5); conflicts=[...new Set(conflicts)];
    return {delta:Math.round(delta),tags:tags,notes:notes,reasons:reasons,path:path,siteRisk:risk,medicalRisk:med,costRisk:cost,schoolRisks:srisks,conflicts:conflicts,context:c,explicitFocus:focus};
  }
  function scoreAdjustment(r,type){return evalRecord(r,type).delta;}
  function tagLine(r,type){var e=evalRecord(r,type);return e.tags||[];}
  function debugContext(){
    var c=ctx(); return {studentGenderEffective:c.gender,studentLearningEffective:c.learning,studentLoadEffective:c.load,studentPathEffective:c.path,rejectsEffective:c.rejects,fieldRejectEffective:c.fieldReject,rejectLongCycleEffective:c.rejectLongCycle,rejectNightEffective:c.rejectNight,rejectSalesEffective:c.rejectSales,scenarioEffective:c.scenario,priorityEffective:c.priority,prioritySource:c.prioritySource,scenarioDefaultPriority:c.scenarioDefaultPriority,scenarioPriorityConflict:c.scenarioPriorityConflict,priorityConflictLevel:c.priorityConflictLevel,interestEffective:c.interests,regionSoft:c.regionSoft,rankBand:c.rankBand};
  }
  function refreshDebug(extra){
    var dc=debugContext();
    try{window.LN_DEBUG_V2983?.setFlags?.({rulesClosure:VERSION,rulesClosureStamp:STAMP,closureOpt:true,studentGenderEffective:dc.studentGenderEffective,fieldRejectEffective:dc.fieldRejectEffective,scenarioPriorityConflict:dc.scenarioPriorityConflict,priorityConflictLevel:dc.priorityConflictLevel,rejectLongCycleEffective:dc.rejectLongCycleEffective,rejectNightEffective:dc.rejectNightEffective});}catch(e){}
    try{window.LN_DEBUG_V2983?.detail?.('rulesClosureContext',Object.assign({},dc,extra||{}));}catch(e){}
  }

  // Patch full plan score: keep old engine, add closure signal with cache key including context.
  function patchPlanScore(){
    if(typeof window.planScoreV29475!=='function' || window.planScoreV29475.__closure4) return;
    var old=window.planScoreV29475.__original || window.planScoreV29475;
    var wrapped=function(r,type,chosen){
      var base=old.apply(this,arguments);
      var adj=scoreAdjustment(r,type);
      return base+adj;
    };
    wrapped.__closure4=true; wrapped.__original=old; window.planScoreV29475=wrapped; try{planScoreV29475=wrapped;}catch(e){} if(window.LN_PLAN_ENGINE){window.LN_PLAN_ENGINE.planScoreV29475=wrapped;}
  }

  function levelWeight(l){return ({'保底':20,'稳妥':18,'匹配':15,'可冲':9,'观察':6}[l]||5);}
  function rowKey(r){return [r.school||'',r.major||'',r.rank2025||'',r.score2025||''].join('|');}
  function geo(r){try{return window.geoDisplayV29472?geoDisplayV29472(r):(r.schoolCity||r.schoolProvince||'');}catch(e){return r.schoolCity||r.schoolProvince||'';}}
  function fmt(v){try{return window.fmt?window.fmt(v):String(v??'-');}catch(e){return String(v??'-');}}
  function safety(r){try{return window.LN_ADMISSION_SAFETY_RULES_V2981?.classify?.(r)||{};}catch(e){return {};}}
  function evidence(r){try{return window.LN_ADMISSION_EVIDENCE_RULES_V2981?.build?.(r)||{};}catch(e){return {};}}
  function lightScore(r,type){
    var tier=r.schoolTier?.level||'', pub=['public','publicSoft'].indexOf(r.schoolTier?.level)>=0, high=!!(r.isHighFee||r.isCoopV29475||r.isPrivateV29475), p=Number(r._profile||50), fit=Number(r._fit||9999999), interest=Number(r._interestSortScore||0), s=0;
    if(type==='A'){s+=levelWeight(r._level)*3; if(pub)s+=35; if(!high)s+=25; s+=p*.25; s-=Math.min(fit/1000,20);} 
    else if(type==='B'){s+=interest*2.2; s+=p*.45; s+=levelWeight(r._level)*1.4; if(high)s-=8;}
    else {if(tier==='985')s+=50; else if(tier==='211')s+=34; s+=levelWeight(r._level)*1.8; if(['可冲','匹配'].indexOf(r._level)>=0)s+=10; if(high)s+=6; s+=p*.15;}
    return s+scoreAdjustment(r,type);
  }
  function cluster(r,type){
    var p=pathInfo(r);
    if(type==='A')return [r.schoolProvince||'',r.schoolNature?.label||'',r._level||'',p.key].join('/');
    if(type==='B')return p.key;
    if(type==='C')return r.schoolTier?.level||r.schoolCity||r.schoolProvince||p.key||'';
    return 'x';
  }
  function pick(type,avoid){
    avoid=avoid||new Set(); var t=perf(); var rows=(window.filtered||[]).filter(function(r){return !(r._excludes||[]).length;});
    var ranked=rows.map(function(r){return [r,lightScore(r,type)];}).sort(function(a,b){return b[1]-a[1];});
    var sample=ranked.slice(0,960).map(function(x){return x[0];});
    var scored=ranked.slice(0,960);
    var out=[],seen=new Set(),clusters=new Set();
    for(var pass=0;pass<2;pass++){
      var strict=pass===0;
      for(var i=0;i<scored.length;i++){
        var r=scored[i][0], k=rowKey(r); if(seen.has(k))continue; if(strict&&avoid.has(k))continue;
        var c=cluster(r,type); if(strict&&clusters.has(c)&&out.length<4)continue;
        if(type==='A'&&strict&&(r.isHighFee||r.isCoopV29475||r.isPrivateV29475)&&out.length<3)continue;
        out.push(r); seen.add(k); clusters.add(c); if(out.length>=6){try{window.LN_DEBUG_V2983?.detail?.('closurePick_'+type,{rows:rows.length,sample:sample.length,out:out.length,ms:Math.round(perf()-t)});}catch(e){};return out;}
      }
    }
    try{window.LN_DEBUG_V2983?.detail?.('closurePick_'+type,{rows:rows.length,sample:sample.length,out:out.length,ms:Math.round(perf()-t)});}catch(e){}
    return out;
  }
  function pathKey(r){return pathInfo(r).key;}
  function focusAllowsDominance(key){
    var c=ctx();
    if(key==='electric')return c.scenario==='grid'||c.priority==='grid'||c.interestElectric;
    if(key==='engineering')return c.interestMechanical || (c.priority==='grid'&&c.interestElectric);
    if(key==='computer')return c.interestComputer;
    if(key==='medical')return c.scenario==='medical'||c.priority==='medical'||c.interestMedical;
    if(key==='public_service'||key==='teacher'||key==='accounting')return c.scenario==='exam'||c.priority==='exam'||c.path==='exam_ok'||c.interestTeacher||c.interestHumanities||c.interestFinance;
    return false;
  }
  function diversifyBuckets(b){
    var top=[b.A?.[0],b.B?.[0],b.C?.[0]].filter(Boolean); var counts={}; top.forEach(function(r){var k=pathKey(r); counts[k]=(counts[k]||0)+1;});
    var dom=Object.keys(counts).sort(function(a,b){return counts[b]-counts[a];})[0]||''; var domCount=counts[dom]||0;
    var changed=false;
    if(dom&&domCount>=2&&!focusAllowsDominance(dom)){
      var used=new Set([...(b.A||[]),...(b.B||[]),...(b.C||[])].map(rowKey));
      function alt(type){
        var rows=(window.filtered||[]).filter(function(r){return !(r._excludes||[]).length && pathKey(r)!==dom && !used.has(rowKey(r));});
        rows.sort(function(a,b){return lightScore(b,type)-lightScore(a,type);});
        return rows[0]||null;
      }
      if(b.C&&b.C[0]&&pathKey(b.C[0])===dom){var a=alt('C'); if(a){b.C[0]=a; used.add(rowKey(a)); changed=true;}}
      top=[b.A?.[0],b.B?.[0],b.C?.[0]].filter(Boolean); counts={}; top.forEach(function(r){var k=pathKey(r); counts[k]=(counts[k]||0)+1;}); dom=Object.keys(counts).sort(function(a,b){return counts[b]-counts[a];})[0]||''; domCount=counts[dom]||0;
      if(dom&&domCount>=2&&!focusAllowsDominance(dom)&&b.B&&b.B[0]&&pathKey(b.B[0])===dom){var bb=alt('B'); if(bb){b.B[0]=bb; changed=true;}}
    }
    var dist={A:(b.A||[]).map(pathKey),B:(b.B||[]).map(pathKey),C:(b.C||[]).map(pathKey),dominantPath:dom,dominantCount:domCount,dominanceAllowed:!!(dom&&focusAllowsDominance(dom)),changed:changed,context:debugContext()};
    window.LN_RULES_CLOSURE_LAST_DIST=dist;
    try{window.LN_DEBUG_V2983?.detail?.('abcPathDistribution',dist);}catch(e){}
    return b;
  }
  function makeBuckets(){var A=pick('A'); var a=new Set(A.map(rowKey)); var B=pick('B',a); var ab=new Set([].concat(A,B).map(rowKey)); var C=pick('C',ab); return diversifyBuckets({A:A,B:B,C:C});}
  function tagLineHtml(r,type){
    var arr=[], sf=safety(r), ev=evidence(r), e=evalRecord(r,type);
    if(sf.label)arr.push(sf.label); if(r._level)arr.push(r._level); if(ev.tag)arr.push(ev.tag);
    if(type==='A')arr.push('守底线'); if(type==='B')arr.push(pathInfo(r).label); if(type==='C')arr.push('看机会');
    (e.tags||[]).slice(0,2).forEach(function(x){arr.push(x);});
    return [...new Set(arr)].slice(0,5).map(function(x){return '<span>'+esc(x)+'</span>';}).join('');
  }
  function warningHtml(r,type){
    var e=evalRecord(r,type), ns=(e.notes||[]).slice(0,3);
    if(type==='C') ns.unshift('C 是机会对照，不是稳妥建议。请复核位次波动、学费、校区、培养方式和录取规则。');
    if(!ns.length)return '';
    return '<p class="closure-note-v291">'+esc([...new Set(ns)].slice(0,4).join('；'))+'</p>';
  }
  function exportClosureSummary(rows){
    var list=(rows||[]).slice(0,18).map(function(r,i){var e=evalRecord(r,'B'), p=e.path, f=closureFields(r,'B',i%6); return [i+1,r.school||'',r.major||'',p.key,p.layer,f.role,f.riskLayer,f.tradeoff,f.environment,f.exit,f.review,(e.tags||[]).join('|'),(e.notes||[]).join('；'),(e.conflicts||[]).join('|')];});
    return {version:VERSION,stamp:STAMP,context:debugContext(),pathDistribution:window.LN_RULES_CLOSURE_LAST_DIST||null,rows:list};
  }
  function closureCsvFields(r,type){
    var e=evalRecord(r,type||'B'), p=e.path;
    var f=closureFields(r,type||'B',0); return {path:p.key, layer:p.layer, role:f.role, riskLayer:f.riskLayer, tradeoff:f.tradeoff, environment:f.environment, exit:f.exit, review:f.review, tags:(e.tags||[]).join('|'), notes:(e.notes||[]).join('；'), conflicts:(e.conflicts||[]).join('|')};
  }


  function riskLayer(r,type){
    var lv=String(r&&r._level||'');
    if(type==='C')return /保底|稳妥/.test(lv)?'稳妥对照':'机会对照';
    if(/超冲|可冲/.test(lv))return '小冲';
    if(/匹配/.test(lv))return '匹配';
    if(/稳妥/.test(lv))return '稳妥';
    if(/保底/.test(lv))return '保底';
    return type==='A'?'稳妥':type==='B'?'匹配':'机会对照';
  }
  function planRole(type,i){
    var A=['稳妥主项','稳妥主项','稳妥替代','保底对照','保底对照','底线内小冲'];
    var B=['最匹配主项','最匹配主项','兴趣匹配项','家庭路径匹配项','稳妥对照','小冲对照'];
    var C=['小冲平台','小冲专业','小冲城市','匹配边缘','风险机会项','稳妥对照'];
    return (type==='A'?A:type==='B'?B:C)[i] || (i<4?'补充比较':'展开补充');
  }
  function environmentLabel(path){
    if(path.key==='accounting'||path.key==='business'||path.key==='public_service'||path.key==='liberal')return '办公室/表达管理型';
    if(path.key==='computer')return path.layer==='strong_code'?'强代码/项目型':path.layer==='applied_digital'?'数字化应用型':'代码/系统数据型';
    if(path.key==='electric')return '电力/设备环境需复核';
    if(path.key==='engineering')return '工厂/设备/工程现场需复核';
    if(path.key==='electronic')return '设备/电子/通信环境需复核';
    if(path.key==='medical')return path.layer==='medical_nursing'?'医院/夜班风险型':path.layer==='medical_clinical'?'医院/执业长周期型':'医药/技术资格型';
    if(path.key==='deep_engineering'||path.key==='basic_science')return '实验/深造依赖型';
    if(path.key==='teacher')return '教育/考编路径';
    return '就业环境待复核';
  }
  function exitLabel(path){
    if(path.key==='public_service')return '考公/体制/公共服务';
    if(path.key==='teacher')return '教师资格/考编/教育';
    if(path.key==='accounting')return '财会审计/考证/考公';
    if(path.key==='computer')return '企业就业/项目能力/考研';
    if(path.key==='electric')return '电网/能源/国企或设备方向';
    if(path.key==='engineering')return '制造/设备/行业就业';
    if(path.key==='medical')return '执业资格/医院或医药行业';
    if(path.key==='business')return '企业管理/运营/市场需复核';
    if(path.key==='liberal')return '表达写作/考公考编/文职';
    if(path.key==='basic_science')return '考研深造/教师路径需复核';
    if(path.key==='deep_engineering')return '实验工科/读研或行业积累';
    return '毕业出口待复核';
  }
  function tradeoffLabel(r,type,e){
    var path=e.path, cost=e.costRisk, risk=e.siteRisk;
    if(type==='A'){
      if(cost.high)return '换机会，牺牲费用确定性';
      if(risk.level>=3)return '保学校/位次，现场风险需复核';
      return '稳底线，专业上限需比较';
    }
    if(type==='B'){
      if(e.explicitFocus)return '尊重孩子兴趣，复核承受度';
      if(path.key==='public_service'||path.key==='accounting'||path.key==='teacher')return '稳路径，学校层级需比较';
      if(path.key==='computer'||path.key==='electric')return '看就业路径，复核学习/环境压力';
      return '看专业匹配，复核学校资源';
    }
    if(cost.high)return '冲平台/城市，费用风险较高';
    return '看机会，不当稳妥项';
  }
  function reviewActions(r,type,e){
    var arr=[]; var p=e.path;
    if(e.costRisk&&e.costRisk.high)arr.push('复核学费/办学形式');
    if(e.siteRisk&&e.siteRisk.level>=2)arr.push('复核就业环境/培养方向');
    if(e.medicalRisk&&(e.medicalRisk.longCycle||e.medicalRisk.night))arr.push('复核学制/夜班/执业资格');
    if(e.schoolRisks&&e.schoolRisks.length)arr.push(e.schoolRisks[0]);
    if(p.isMajorClass)arr.push('复核大类分流');
    if(p.key==='public_service'||p.key==='teacher'||p.key==='liberal')arr.push('复核考公/考编岗位限制');
    if(p.key==='basic_science'||p.key==='deep_engineering')arr.push('复核读研依赖和转专业规则');
    if(type==='C')arr.push('复核位次波动');
    if(!arr.length)arr.push('复核招生章程/校区/学费');
    return [...new Set(arr)].slice(0,2);
  }
  function closureFields(r,type,i){
    var e=evalRecord(r,type), p=e.path;
    return {role:planRole(type,i||0),riskLayer:riskLayer(r,type),tradeoff:tradeoffLabel(r,type,e),environment:environmentLabel(p),exit:exitLabel(p),review:reviewActions(r,type,e).join('；'),path:p.key,layer:p.layer,tags:(e.tags||[]).join('|'),notes:(e.notes||[]).join('；'),conflicts:(e.conflicts||[]).join('|')};
  }
  function card(r,type,i){
    if(!r)return '<article class="plan-decision-card-v2981 empty"><b>'+type+(i+1)+'</b><p>暂无合适候选。</p></article>';
    var sf=safety(r), ev=evidence(r), e=evalRecord(r,type), f=closureFields(r,type,i), role=f.role;
    var p=e.path;
    return '<article class="plan-decision-card-v2981 '+type.toLowerCase()+' safety-'+esc(sf.tone||'unknown')+' closure-card-v291">'
      +'<div class="decision-card-head-v2981"><span>'+type+(i+1)+'｜'+esc(role)+'</span><b>'+esc(f.riskLayer)+'</b></div>'
      +'<div class="closure-role-row-v291"><span>'+esc(f.tradeoff)+'</span><span>'+esc(f.environment)+'</span><span>'+esc(f.exit)+'</span></div>'
      +'<h4>'+esc(r.school)+'</h4><div class="decision-major-v2981">'+esc(r.major)+'</div>'
      +'<small>'+esc(geo(r))+'｜'+esc(r.schoolNature?.label||'性质待核验')+'｜'+esc(r.schoolTier?.label||'层级待核验')+'</small>'
      +'<div class="candidate-lite-tags-v2983">'+tagLineHtml(r,type)+'</div>'
      +'<div class="decision-evidence-grid-v2981"><div><b>'+esc(ev.y2025||('2025：'+fmt(r.score2025)+'分｜'+fmt(r.rank2025)+'位'))+'</b><span>主参考</span></div><div><b>'+esc(ev.y2024||'2024：暂无可比记录')+'</b><span>对照</span></div></div>'
      +'<p class="decision-trend-v2981 tone-'+esc(ev.tone||'unknown')+'">'+esc(ev.trend||'建议复核投档证据')+'</p>'
      +'<div class="decision-tradeoff-v2981"><p><b>本卡先看</b>'+(type==='A'?'家庭底线、费用和孩子能否接受':type==='B'?'专业路径、孩子情况和毕业方向':'学校平台、城市和不确定性')+'</p><p><b>闭环判断</b>'+esc(p.label)+'｜'+esc((e.tags||[])[0]||'按当前条件排序')+'</p><p><b>下一步复核</b>'+esc(f.review)+'</p></div>'
      +warningHtml(r,type)
      +'<div class="decision-actions-v2981"><button class="ghost slim" onclick="addPlanOneV29475Fix2(\''+esc(r.id||'')+'\',\''+type+'\',\''+(i===0?'优先看':'补充比较')+'\')">加入</button></div></article>';
  }
  function meta(type){return window.LN_ABC_DECISION_CARD_MODEL_V2981?.groupMeta?.(type)||({A:{title:'A：守底线',view:'先守住家庭底线。'},B:{title:'B：重点讨论',view:'看专业路径和孩子适配。'},C:{title:'C：看机会',view:'比较平台、城市和上限。'}}[type]);}
  function panel(active,b){var m=meta(active), rows=(b&&b[active])||[]; return '<div class="abc-active-panel-v296 abc-decision-panel-v2981"><div class="abc-active-head-v296 abc-head-v2981"><b>'+esc(m.title||active)+'</b><span>'+esc(m.view||'')+'</span></div><div class="abc-decision-list-v2981">'+(rows.slice(0,6).map(function(r,i){return card(r,active,i);}).join('')||card(null,active,0))+'</div></div>';}
  function renderABC(viewOnly){
    var t=perf(), box=document.getElementById('planABC'); if(!box)return; var rank=window.currentRank; try{if(!rank&&typeof currentRank!=='undefined')rank=currentRank;}catch(e){}
    if(!rank){box.innerHTML='<div class="abc-empty-v2950">先填写分数或位次，再看 A/B/C 三条路径。</div>';return;}
    refreshDebug(); var b=makeBuckets(); window.latestPlanBucketsV29475Fix2=b; try{latestPlanBucketsV29475Fix2=b;}catch(e){}
    var view=window.LN_ABC_VIEW_V296, active=(view?.get?.()||'A');
    if(viewOnly){var p=document.getElementById('abcPanelV296'); if(p){p.innerHTML=panel(active,b); view?.updateTabState?.(); try{window.LN_DEBUG_V2983?.detail?.('abcRenderBreakdown',{mode:'closure-viewOnly',ms:Math.round(perf()-t),filtered:(window.filtered||[]).length});}catch(e){} return;}}
    box.className='abc-board-v296 abc-board-v2981 abc-board-light-v2983 abc-board-closure-v291';
    var tabs=view?.renderTabs?.(b)||'';
    var dc=debugContext();
    var notes=[]; var dist=window.LN_RULES_CLOSURE_LAST_DIST||{};
    if(dc.scenarioPriorityConflict)notes.push('当前优先考虑与我家情况不完全一致，已避免微调吞掉主场景。');
    if(dc.regionSoft)notes.push('当前是“区域优先”，不是“只看该区域”；如只想看辽宁，请切换为“只看辽宁”。');
    if(dc.scenarioEffective==='grid'&&dc.fieldRejectEffective)notes.push('你选择了电网/能源，同时不接受现场/设备环境，需要确认是继续按电网看，还是改按普通就业/考公看。');
    if(dc.scenarioEffective==='medical'&&(dc.rejectLongCycleEffective||dc.rejectNightEffective))notes.push('医学方向与长周期/夜班拒绝存在冲突，系统会优先提示医学内部风险。');
    if(dc.scenarioEffective==='exam'&&dc.interestEffective&&dc.interestEffective.indexOf('medical_health')>=0)notes.push('当前按考公/体制看，但孩子选择了医学方向；医学更偏执业资格和长期培养，不是典型考公主线。');
    if(dc.scenarioEffective==='broad')notes.push('当前是宽口径观察模式，不是最终推荐；建议先看大方向，再回到就业、考公、平台、电网、医学等具体场景复核。');
    if(dist.dominantPath&&dist.dominantCount>=2){
      if(dist.dominanceAllowed)notes.push('当前 A/B/C 集中在“'+dist.dominantPath+'”方向，是因为孩子兴趣或当前优先考虑明确指向该路径；如家庭想分散风险，可加入第二路径对照。');
      else if(dist.changed)notes.push('系统发现 A/B/C 过度集中在同一路径，已尝试换入其他路径作为家庭讨论对照。');
    }
    if((window.filtered||[]).length<25)notes.push('符合全部条件的候选较少，建议确认地域、学校性质、费用或专业方向哪一项可以适度放宽。');
    var notice=notes.length?'<div class="closure-conflict-banner-v291">'+notes.map(function(x){return '<p>'+esc(x)+'</p>';}).join('')+'</div>':'';
    var toolbar='<div class="abc-toolbar-v296"><div><b>A/B/C 方案视角</b><span>A/B/C 是家庭策略层；每组内部显示 6 个角色，并带小冲/匹配/稳妥/保底/机会对照、取舍点、就业环境、毕业出口和复核动作。</span></div><button class="execute-secondary" onclick="addAllPlansV29475Fix2()">加入全部 A/B/C 候选</button></div>';
    box.innerHTML=toolbar+notice+tabs+'<div id="abcPanelV296">'+panel(active,b)+'</div>'; view?.updateTabState?.();
    try{window.LN_DEBUG_V2983?.detail?.('abcRenderBreakdown',{mode:'closure-full',ms:Math.round(perf()-t),filtered:(window.filtered||[]).length});}catch(e){}
  }
  function patchABC(){
    window.renderPlanABC=function(){return renderABC(false);};
    window.renderPlanABCViewOnly=function(){return renderABC(true);};
    if(window.LN_PLAN_ENGINE){window.LN_PLAN_ENGINE.renderPlanABC=window.renderPlanABC; window.LN_PLAN_ENGINE.renderPlanABCViewOnly=window.renderPlanABCViewOnly;}
    window.LN_ABC_LIGHT_UI_V2983FIX3={renderPlanABC:window.renderPlanABC,renderPlanABCViewOnly:window.renderPlanABCViewOnly,ready:true,closure:true};
  }
  function bind(){
    ['change','input','click'].forEach(function(evt){document.addEventListener(evt,function(){setTimeout(refreshDebug,30);},true);});
  }
  function boot(){patchPlanScore();patchABC();bind();refreshDebug({policy:{doesChangeABC:true,doesChangeCandidatePool:false,doesChangeInterestFilter:false}});setTimeout(function(){patchPlanScore();patchABC();refreshDebug();},300);}
  window.LN_RULES_CLOSURE_V291={ready:true,version:VERSION,stamp:STAMP,context:ctx,debugContext:debugContext,pathInfo:pathInfo,siteRisk:siteRisk,evaluate:evalRecord,scoreAdjustment:scoreAdjustment,makeBuckets:makeBuckets,renderABC:renderABC,refreshDebug:refreshDebug,exportClosureSummary:exportClosureSummary,closureCsvFields:closureCsvFields,closureFields:closureFields};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
