import{createSchoolNameResolver}from'../../tongxue/data/school-name-resolver.js';
import{createEntityAwareResolver}from'../../tongxue/data/school-entities-v130.js';
import{isInitialQuery,normalizeInitialQuery,toPinyinInitials}from'../../tongxue/data/school-pinyin-initials-v140.js';

const rows=[
 ['辽宁科技大学','辽宁省','本科'],['辽宁科技学院','辽宁省','本科'],['东北大学','辽宁省','本科'],
 ['河南大学','河南省','本科'],['湖南大学','湖南省','本科'],['海南大学','海南省','本科'],
 ['河北工业大学','天津市','本科'],['湖北工业大学','湖北省','本科'],['吉林大学','吉林省','本科'],
 ['哈尔滨工业大学','黑龙江省','本科'],['大连理工大学','辽宁省','本科'],['华北电力大学','北京市','本科'],
 ['中国石油大学（北京）','北京市','本科'],['中国石油大学（华东）','山东省','本科'],
 ['中国地质大学（北京）','北京市','本科'],['中国地质大学（武汉）','湖北省','本科'],
 ['中国矿业大学','江苏省','本科'],['中国矿业大学（北京）','北京市','本科'],['电子科技大学','四川省','本科']
];
const base=createSchoolNameResolver(rows),resolver=createEntityAwareResolver(base,base.metadata),failures=[],checks=[];
const check=(label,passed,detail='')=>{checks.push({label,passed,detail});if(!passed)failures.push(label+(detail?'：'+detail:''));};
const resolved=(input,expected,entityId='')=>{const result=resolver.resolve(input,{limit:10});check(input,result.status==='resolved'&&result.resolvedName===expected&&(!entityId||result.entityId===entityId),JSON.stringify(result));};
const ambiguous=(input,expectedNames)=>{const result=resolver.resolve(input,{limit:10}),names=result.candidates.map(item=>item.officialName);check(input,result.status==='ambiguous'&&expectedNames.every(name=>names.includes(name)),JSON.stringify(result));};

resolved('hgw','哈尔滨工业大学（威海）','hit-weihai');
resolved('HGW','哈尔滨工业大学（威海）','hit-weihai');
resolved('h g w','哈尔滨工业大学（威海）','hit-weihai');
resolved('dgpj','大连理工大学（盘锦校区）','dlut-panjin');
resolved('lnkj','辽宁科技大学');
resolved('lnkjdx','辽宁科技大学');
resolved('lnkjxy','辽宁科技学院');
resolved('dbdx','东北大学','neu-main');
resolved('hgs','哈尔滨工业大学（深圳）','hit-shenzhen');
resolved('cdsh','电子科技大学（沙河校区）','uestc-shahe');
ambiguous('hgd',['哈尔滨工业大学','哈尔滨工业大学（威海）','哈尔滨工业大学（深圳）']);
ambiguous('hd',['华北电力大学（北京）','华北电力大学（保定）']);
ambiguous('zsd',['中国石油大学（北京）','中国石油大学（华东）']);
ambiguous('dd',['中国地质大学（北京）','中国地质大学（武汉）']);
ambiguous('kd',['中国矿业大学','中国矿业大学（北京）']);
ambiguous('hndx',['河南大学','湖南大学','海南大学']);
ambiguous('hbgydx',['河北工业大学','湖北工业大学']);
const prefix=resolver.resolve('dgp',{limit:10});check('首字母前缀不自动选择',prefix.status==='ambiguous'&&prefix.candidates.some(item=>item.officialName==='大连理工大学（盘锦校区）'),JSON.stringify(prefix));
const unknown=resolver.resolve('zzzzzz',{limit:10});check('未知代码不猜测',unknown.status==='not_found',JSON.stringify(unknown));
check('全角和分隔符标准化',normalizeInitialQuery('Ｈ-Ｇ Ｗ')==='hgw');
check('纯字母识别',isInitialQuery('h g w')&&!isInitialQuery('哈工威'));
check('常用学校首字母',toPinyinInitials('辽宁科技大学')==='lnkjdx'&&toPinyinInitials('东北大学')==='dbdx');
check('多音地名词组',toPinyinInitials('重庆大学')==='cqdx'&&toPinyinInitials('长沙学院')==='csxy'&&toPinyinInitials('厦门大学')==='xmdx');
console.log('TONGXUE_INITIAL_RESULTS '+JSON.stringify({checks,failures}));
if(failures.length)process.exitCode=1;
