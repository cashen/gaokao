// V2.9.7.5 child intent translator: translates plain wishes into discussion paths, not recommendations.
(function(){
  const STORAGE_KEY='ln_child_intent_state_v2975';
  function esc(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));}
  const intents=[
    {id:'want_medical',label:'我想学医药健康',short:'医药健康',concernTags:['医疗健康','路径分叉','长期学习'],directionKeywords:['临床','口腔','药学','医学检验','医学影像','护理','公共卫生','康复'],possibleDirections:['临床医学','口腔医学','药学','医学技术','护理学','公共卫生'],misreadWarnings:['药学不等同于临床医生。','医学技术不等同于临床医学。'],reviewQuestions:['孩子是想做临床诊疗，还是想进入医疗健康行业？','家庭是否接受较长学习周期？','是否接受读研、规培、考证等后续路径？'],message:'孩子关注医疗健康方向，但医学内部差异较大，建议先分清临床、药学、医学技术和护理。'},
    {id:'like_animals',label:'我喜欢动物 / 生命科学',short:'动物生命',concernTags:['动物生命','实践环境','职业接受度'],directionKeywords:['动物医学','动物药学','动植物检疫','生物','农学','食品'],possibleDirections:['动物医学','动物药学','动植物检疫','生物科学','生物工程','农学相关'],misreadWarnings:['喜欢动物不等于一定适合动物医学。'],reviewQuestions:['孩子是否接受动物接触、实验和实践环境？','是喜欢宠物，还是能接受医疗和临床场景？','是否接受城市资源差异？'],message:'喜欢动物不等于一定适合动物医学，建议复核实践环境、城市资源和职业接受度。'},
    {id:'want_stable',label:'我想稳定一点',short:'稳定路径',concernTags:['路径清楚','考试证书','家庭安全感'],directionKeywords:['师范','法学','药学','医学技术','电气','计算机','财会','管理'],possibleDirections:['师范类','法学','药学','医学技术','国企相关工科','计算机/财会/管理类考公方向'],misreadWarnings:['稳定不是专业名称本身决定的。'],reviewQuestions:['孩子理解的稳定是考编、考证、本科就业、离家近，还是收入波动小？','能否接受长期备考？','是否接受地区岗位竞争？'],message:'稳定通常来自考试、证书、地区岗位、学校平台和长期投入，不是专业名称本身。'},
    {id:'teacher_exam',label:'我想以后当老师 / 考编',short:'教师考编',concernTags:['考编路径','师范属性','岗位限制'],directionKeywords:['师范','汉语言','数学','物理学','化学','生物科学','英语','小学教育','教育技术','法学','计算机','财务'],possibleDirections:['汉语言文学','数学与应用数学','物理学','化学','生物科学','英语','小学教育','教育技术学','法学','计算机','财会类'],misreadWarnings:['汉语言文学不等于一定是师范方向。'],reviewQuestions:['是否明确想走教师招聘？','是否能接受公费或定向履约？','目标地区教师招聘是否认可该专业？'],message:'想当老师要先确认是否师范类、公费、定向或有履约要求；考编要看岗位表和专业限制。'},
    {id:'law_expression',label:'我想学法学 / 表达 / 文字',short:'法学表达',concernTags:['表达写作','法考公考','学校层次'],directionKeywords:['法学','知识产权','汉语言','新闻','传播','政治','社会','公共管理'],possibleDirections:['法学','知识产权','汉语言文学','汉语言','新闻传播','政治学','社会学','公共管理'],misreadWarnings:['法学不等于天然稳定。','汉语言文学不等于一定是师范方向。'],reviewQuestions:['孩子是喜欢表达写作，还是想走法考、公务员、教师路径？','是否能接受长期阅读、写作和考试？','学校层次和城市资源是否会影响后续路径？'],message:'法学、汉语言、新闻传播、知识产权都和表达有关，但后续路径差异很大。'},
    {id:'tech_engineering',label:'我想做技术 / 工程',short:'技术工程',concernTags:['工程技术','课程强度','工科替代'],directionKeywords:['计算机','软件','电子','通信','自动化','电气','测控','仪器','能源','机械','食品','生物工程','制药','环境'],possibleDirections:['计算机','电子信息','自动化','电气','仪器测控','能源动力','机械','食品科学','生物工程','制药工程','环境工程'],misreadWarnings:['技术工程不只有计算机和电气。','仪器测控不等同于电气工程。'],reviewQuestions:['孩子是否接受数学、物理、实验和工程课程？','是想做软件信息，还是硬件设备、自动化、能源、制造？','是否接受工科课程强度？'],message:'技术工程方向不只有计算机和电气，仪器、自动化、电子信息、能源、食品、生工等也需要分层比较。'},
    {id:'city_development',label:'我想去大城市发展',short:'城市发展',concernTags:['城市资源','实习就业','机会代价'],directionKeywords:['城市','沈阳','大连','北京','上海','天津','杭州','南京','广州','深圳'],possibleDirections:['城市优先候选','省会城市','沿海城市','医药产业城市','信息技术城市','法政资源城市'],misreadWarnings:['城市资源可能伴随学校层级、专业热度或学费代价。'],reviewQuestions:['家庭是否接受为城市牺牲学校层级？','是否接受高收费或中外合作？','城市资源是否真的和该专业相关？'],message:'城市会带来资源机会，但也可能换来学校层级、专业热度或学费成本的代价。'},
    {id:'unclear',label:'我还不确定',short:'暂不确定',concernTags:['先看底线','路径清楚','综合推荐'],directionKeywords:[],possibleDirections:['综合推荐','路径清楚型','公办底线型','专业可读性较强方向'],misreadWarnings:['暂不确定很正常，不宜急着锁死专业。'],reviewQuestions:['孩子明确不接受什么？','家庭不能承受什么？','哪些方向只是听过名字，还没真正理解？'],message:'暂不确定很正常，建议先按家庭底线和路径清楚度筛一轮，再让孩子表达排斥和偏好。'}
  ];
  function defaultState(){return {selectedIntentIds:[],updatedAt:'',schemaVersion:1};}
  function readState(){try{const raw=localStorage.getItem(STORAGE_KEY); const s=raw?JSON.parse(raw):{}; return Object.assign(defaultState(), s||{}, {selectedIntentIds:Array.isArray(s.selectedIntentIds)?s.selectedIntentIds:[]});}catch(e){return defaultState();}}
  function saveState(s){const next=Object.assign(defaultState(),s||{}); next.selectedIntentIds=[...new Set((next.selectedIntentIds||[]).filter(id=>intents.some(x=>x.id===id)))].slice(0,3); next.updatedAt=new Date().toISOString(); try{localStorage.setItem(STORAGE_KEY,JSON.stringify(next));}catch(e){} window.LN_STATE_SNAPSHOT_V296?.reset?.(); window.LN_CANDIDATE_CACHE_V296?.reset?.(); return next;}
  function byId(id){return intents.find(x=>x.id===id)||null;}
  function selected(){const s=readState(); return s.selectedIntentIds.map(byId).filter(Boolean);}
  function toggle(id){const s=readState(); const set=new Set(s.selectedIntentIds); if(set.has(id)) set.delete(id); else { if(set.size>=3) return {ok:false,reason:'max'}; set.add(id); } s.selectedIntentIds=[...set]; saveState(s); return {ok:true,state:s};}
  function clear(){return saveState(defaultState());}
  function summary(){const list=selected(); if(!list.length) return {title:'孩子想法未整理',text:'可选填，系统会按家庭底线和综合规则先看。',names:[]}; return {title:'已整理：'+list.map(x=>x.short).join('、'),text:'这些想法只用于解释和提醒，不会排除其他专业。',names:list.map(x=>x.label)};}
  function translate(){const list=selected(); return {intents:list, concernTags:[...new Set(list.flatMap(x=>x.concernTags||[]))], possibleDirections:[...new Set(list.flatMap(x=>x.possibleDirections||[]))], misreadWarnings:[...new Set(list.flatMap(x=>x.misreadWarnings||[]))], reviewQuestions:[...new Set(list.flatMap(x=>x.reviewQuestions||[]))], messages:list.map(x=>x.message), hardExclude:false};}
  function candidateIntentMessages(r){
    const text=[r?.major,r?.majorText,r?.cleanMajor,r?.mainMajorV29475,r?.undergradMajorName,r?.undergradCategoryName,r?.gradAcademicText,r?.schoolCity,r?.schoolProvince].filter(Boolean).join(' ');
    const out=[];
    selected().forEach(intent=>{
      const hit=(intent.directionKeywords||[]).some(k=>k && text.includes(k));
      if(hit && intent.id!=='unclear') out.push(intent.message);
    });
    return [...new Set(out)].slice(0,2);
  }
  window.LN_CHILD_INTENT_TRANSLATOR_V2975={intents, esc, readState, saveState, byId, selected, toggle, clear, summary, translate, candidateIntentMessages, ready:true};
})();
