// V3.0RC｜12 个家庭场景回归样本定义与轻量规则检查
(function(){
  'use strict';
  var VERSION='300rc-family-scenario-regression-20260520';
  var cases=[
    {id:'case-600-female-medical-no-night',title:'600分女孩，医学兴趣，拒绝夜班长周期',input:{score:600,rank:13600,gender:'female',interests:['medical_health'],rejects:['夜班','长学制'],budget:'normal',scenario:'medical',priority:'medical'},expect:{segment:'high',cLabel:'C：争平台',mustWarn:['医学兴趣不等于临床医生路径','长学制','夜班']}},
    {id:'case-580-male-grid-accept-site',title:'580分男孩，电气电网，接受现场',input:{score:580,rank:21000,gender:'male',interests:['electric_energy'],rejects:[],scenario:'grid',priority:'grid',field:'accept'},expect:{segment:'high',cLabel:'C：争平台',paths:['electric','electronic','engineering']}},
    {id:'case-560-female-exam-expression-no-site',title:'560分女孩，考公体制，偏表达，拒绝现场',input:{score:560,rank:28500,gender:'female',interests:['humanities_law'],rejects:['工地现场'],scenario:'exam',priority:'exam',learning:'expression'},expect:{segment:'middle',cLabel:'C：看城市 / 层级',avoidDominate:['electric','engineering']}},
    {id:'case-540-male-computer-strong-code',title:'540分男孩，计算机兴趣，能接受强代码',input:{score:540,rank:38000,gender:'male',interests:['computer_info'],rejects:[],scenario:'employment',priority:'employment',load:'normal'},expect:{segment:'middle',cLabel:'C：看城市 / 层级',paths:['computer','electronic']}},
    {id:'case-520-public-local-normal-budget',title:'520分，普通家庭，省内公办优先',input:{score:520,rank:47500,gender:'unspecified',interests:[],rejects:['高收费'],scenario:'employment',priority:'employment',budget:'normal'},expect:{segment:'middle',cLabel:'C：看城市 / 层级',A:['普通学费','公办']}},
    {id:'case-500-female-teacher-normal-budget',title:'500分女孩，师范考编，普通预算',input:{score:500,rank:56500,gender:'female',interests:['teacher_education'],rejects:['高收费'],scenario:'exam',priority:'exam'},expect:{segment:'middle',cLabel:'C：看城市 / 层级',mustWarn:['是否师范类','教师资格','岗位']}},
    {id:'case-480-male-low-public-employment',title:'480分男孩，低分公办，就业优先',input:{score:480,rank:66500,gender:'male',interests:[],rejects:['高收费'],scenario:'publicLow',priority:'employment',budget:'normal'},expect:{segment:'low',cLabel:'C：机会对照',mustWarn:['本科机会','成本','可读性']}},
    {id:'case-460-female-law-teacher-no-high-fee',title:'460分女孩，法学/师范，拒绝高收费',input:{score:460,rank:76000,gender:'female',interests:['humanities_law','teacher_education'],rejects:['高收费'],scenario:'exam',priority:'exam'},expect:{segment:'low',cLabel:'C：机会对照',mustWarn:['法考','岗位','师范类']}},
    {id:'case-440-male-computer-private-compare',title:'440分男孩，计算机兴趣，民办可比较',input:{score:440,rank:85000,gender:'male',interests:['computer_info'],rejects:[],scenario:'privateMajor',priority:'employment',budget:'flexible'},expect:{segment:'low',cLabel:'C：机会对照',mustWarn:['低分段计算机','四年成本']}},
    {id:'case-420-edge-budget-sensitive',title:'420分，本科边缘，预算敏感',input:{score:420,rank:96100,gender:'unspecified',interests:[],rejects:['高收费'],scenario:'edgeBachelor',priority:'lowPublic',budget:'normal'},expect:{segment:'edge',cLabel:'C：成本换本科机会',mustWarn:['本科边缘','机会对照']}},
    {id:'case-390-specialist-bachelor-edge',title:'390分，本专科边缘，现实落点',input:{score:390,rank:115000,gender:'unspecified',interests:[],rejects:['高收费'],scenario:'edgeBachelor',priority:'lowPublic',budget:'normal'},expect:{segment:'edge',cLabel:'C：成本换本科机会',mustWarn:['不要为了本科字样','学费','办学质量']}},
    {id:'case-high-platform-major-city-conflict',title:'高分段，985/211、城市、专业冲突',input:{score:625,rank:7600,gender:'unspecified',interests:['computer_info'],rejects:[],scenario:'platformSprint',priority:'school'},expect:{segment:'high',cLabel:'C：争平台',mustWarn:['平台','专业','城市']}}
  ];
  function expectedSegment(rank){rank=Number(rank||0); if(!rank)return 'unknown'; if(rank<=25000)return 'high'; if(rank<=60000)return 'middle'; if(rank<=90000)return 'low'; return 'edge';}
  function expectedC(seg){return seg==='high'?'C：争平台':seg==='middle'?'C：看城市 / 层级':seg==='low'?'C：机会对照':'C：成本换本科机会';}
  function runStaticSuite(){
    var out=cases.map(function(c){var seg=expectedSegment(c.input.rank), cLabel=expectedC(seg), pass=seg===c.expect.segment&&cLabel===c.expect.cLabel;return {id:c.id,title:c.title,status:pass?'PASS':'FAIL',input:c.input,expect:c.expect,actual:{segment:seg,cLabel:cLabel},checks:[{name:'segment',status:seg===c.expect.segment?'PASS':'FAIL'},{name:'cLabel',status:cLabel===c.expect.cLabel?'PASS':'FAIL'}]};});
    return {version:VERSION,mode:'static-definition',generatedAt:new Date().toISOString(),summary:summarize(out),cases:out};
  }
  function summarize(rows){var s={total:rows.length,PASS:0,WARN:0,FAIL:0}; rows.forEach(function(r){s[r.status]=(s[r.status]||0)+1;}); return s;}
  window.LN_FAMILY_SCENARIO_REGRESSION_V300RC={ready:true,version:VERSION,cases:cases,runStaticSuite:runStaticSuite,summarize:summarize};
})();
