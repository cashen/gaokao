import {findCatalogMajorExact,resolveCatalogEntity,getCatalogStats} from '../kb/catalog-accessor.js';
import {GRADUATE_CATALOG_2022_META,resolveGraduateCatalogEntity,graduateCatalogStats} from '../kb/graduate-catalog-2022.js';
import {VOCATIONAL_CATALOG_GOVERNANCE,vocationalCatalogGovernanceSnapshot} from '../kb/vocational-catalog-governance.js';
import {knowledgeQuestionKind,stripKnowledgeQuestionFrame} from './knowledge-language.js';

export const AI_EDUCATION_KNOWLEDGE_CENTER_VERSION='ai-education-knowledge-center-v0.03';

export const KNOWLEDGE_TEMPERATURES=Object.freeze({
  T0:'stable',T1:'versioned_canonical',T2:'cycle_bound',T3:'school_bound',T4:'dynamic'
});

export const KNOWLEDGE_TAXONOMY=Object.freeze([
  'higher_education_structure','institution_identity','undergraduate_major','graduate_discipline','vocational_education',
  'admissions_mechanism','score_rank','special_admissions','targeted_training','sino_foreign','subject_requirements',
  'physical_exam','training_process','postgraduate_path','quality_label','financial_aid','occupation','industry_technology'
]);

export const EDUCATION_AUTHORITY_REGISTRY=Object.freeze({
  moe_undergraduate_2026:Object.freeze({key:'moe_undergraduate_2026',issuer:'教育部',sourceClass:'national_education_authority',authorityLevel:'A0',title:'《普通高等学校本科专业目录（2026年）》',sourceUrl:'https://www.moe.gov.cn/srcsite/A08/moe_1034/s3882/202604/t20260427_1434931.html',publishedAt:'2026-04-28',effectiveYear:2026,jurisdiction:'全国',temperature:'T1'}),
  moe_graduate_2022:Object.freeze({key:'moe_graduate_2022',issuer:'国务院学位委员会、教育部',sourceClass:'national_education_authority',authorityLevel:'A0',title:'《研究生教育学科专业目录（2022年）》',sourceUrl:'https://www.moe.gov.cn/srcsite/A22/moe_833/202209/t20220914_660828.html',publishedAt:'2022-09-14',effectiveFrom:'2023',jurisdiction:'全国',temperature:'T1'}),
  chsi_gaokao_policy:Object.freeze({key:'chsi_gaokao_policy',issuer:'教育部学生服务与素质发展中心（阳光高考）',sourceClass:'national_admissions_platform',authorityLevel:'A1',title:'阳光高考政策与报考公开信息',sourceUrl:'https://gaokao.chsi.com.cn/gkxx/',jurisdiction:'全国',temperature:'T2'}),
  liaoning_special_2026:Object.freeze({key:'liaoning_special_2026',issuer:'辽宁省教育厅',sourceClass:'provincial_education_authority',authorityLevel:'A0',title:'2026年我省继续实施高校招生专项计划',sourceUrl:'https://jyt.ln.gov.cn/jyt/gk/gsgg/2026041315573560394/index.shtml',publishedAt:'2026-04-13',effectiveYear:2026,jurisdiction:'辽宁',temperature:'T2'}),
  physical_exam_guidance:Object.freeze({key:'physical_exam_guidance',issuer:'教育部、卫生部、中国残疾人联合会',sourceClass:'national_admissions_policy',authorityLevel:'A0',title:'普通高等学校招生体检工作指导意见',sourceUrl:'https://www.moe.gov.cn/jyb_xxgk/gk_gbgg/moe_0/moe_9/moe_34/tnull_40.html',jurisdiction:'全国',temperature:'T1'}),
  sino_foreign_registry:Object.freeze({key:'sino_foreign_registry',issuer:'教育部中外合作办学监管工作信息平台',sourceClass:'national_dynamic_registry',authorityLevel:'A0',title:'中外合作办学监管工作信息平台',sourceUrl:'https://www.crs.jsj.edu.cn/',jurisdiction:'全国',temperature:'T4'}),
  occupation_2022:Object.freeze({key:'occupation_2022',issuer:'人力资源社会保障部等',sourceClass:'national_occupation_authority',authorityLevel:'A0',title:'《中华人民共和国职业分类大典（2022年版）》',sourceUrl:'https://www.mohrss.gov.cn/wap/xw/rsxw/202207/t20220714_457800.html',publishedAt:'2022-07-14',jurisdiction:'全国',temperature:'T1'}),
  engineering_accreditation:Object.freeze({key:'engineering_accreditation',issuer:'教育部',sourceClass:'professional_accreditation_authority',authorityLevel:'A0',title:'教育部关于工程教育专业认证有关情况的公开信息',sourceUrl:'https://www.moe.gov.cn/s78/A08/tongzhi/202512/t20251222_1424176.html',publishedAt:'2025-12-22',jurisdiction:'全国',temperature:'T2'}),
  double_first_class_2022:Object.freeze({key:'double_first_class_2022',issuer:'教育部、财政部、国家发展改革委',sourceClass:'national_education_authority',authorityLevel:'A0',title:'第二轮“双一流”建设高校及建设学科名单',sourceUrl:'https://www.moe.gov.cn/srcsite/A22/s7065/202202/t20220211_598710.html',publishedAt:'2022-02-11',jurisdiction:'全国',temperature:'T1'}),
  liaoning_admissions_2026:Object.freeze({key:'liaoning_admissions_2026',issuer:'辽宁省招生考试相关主管部门（阳光高考发布）',sourceClass:'provincial_admissions_authority',authorityLevel:'A0',title:'2026年辽宁省普通高等学校招生简章',sourceUrl:'https://gaokao.chsi.com.cn/gkxx/zc/ss/202603/20260304/2293449167.html',publishedAt:'2026-03-04',effectiveYear:2026,jurisdiction:'辽宁',temperature:'T2'}),
  moe_vocational_setting_2026:Object.freeze({key:'moe_vocational_setting_2026',issuer:'教育部',sourceClass:'national_vocational_authority',authorityLevel:'A0',title:'关于做好2026年职业教育拟招生专业设置管理工作的通知',sourceUrl:'https://hudong.moe.gov.cn/srcsite/A07/moe_737/s3876_qt/202601/t20260105_1425685.html',publishedAt:'2025-12-01',effectiveYear:2026,jurisdiction:'全国',temperature:'T2'}),
  moe_general:Object.freeze({key:'moe_general',issuer:'教育部',sourceClass:'national_education_authority',authorityLevel:'A0',title:'教育部政府公开信息',sourceUrl:'https://www.moe.gov.cn/',jurisdiction:'全国',temperature:'T2'})
});

function clean(value,max=240){return String(value==null?'':value).normalize('NFKC').trim().slice(0,max);}
function norm(value){return clean(value,180).replace(/[\s·•（）()【】\[\]“”"'‘’，,。；;：:!！?？_—-]+/g,'').toLowerCase();}
function unique(values,max=20){return [...new Set((values||[]).map(value=>clean(value,180)).filter(Boolean))].slice(0,max);}
function c(id,name,aliases,type,taxonomy,temperature,definition,{sourceKey='moe_general',practicalImpact='',confusions=[],relations=[],jurisdiction='全国',liveRequired=false}={}){
  return Object.freeze({id,name,aliases:Object.freeze(unique(aliases,16)),type,taxonomy,temperature,definition,sourceKey,practicalImpact,confusions:Object.freeze(unique(confusions,10)),relations:Object.freeze(relations),jurisdiction,liveRequired});
}

const CONCEPTS=Object.freeze([
  c('admission:投档','投档',['投档机制'],'admissions_concept','admissions_mechanism','T0','招生考试机构按投档规则把符合条件的考生电子档案投给高校；投档本身不等于最终录取。',{sourceKey:'chsi_gaokao_policy',practicalImpact:'填志愿时要把“能投进去”和“最终被某专业录取”分开理解。',confusions:['录取','退档']}),
  c('admission:录取','录取',['高校录取'],'admissions_concept','admissions_mechanism','T0','高校在招生规则和投档范围内完成专业安排、审核等程序后形成录取结果。',{sourceKey:'chsi_gaokao_policy',confusions:['投档','退档']}),
  c('admission:退档','退档',['被退档'],'admissions_concept','admissions_mechanism','T0','考生档案已经投到高校后，因不满足招生章程规定条件等原因没有被该校录取并退出本次投档流程；具体风险必须结合当年省级规则和高校章程判断。',{sourceKey:'chsi_gaokao_policy',practicalImpact:'不能把“投档成功”理解成必然录取；体检、单科、语种和专业安排等学校规则需要逐条核验。',confusions:['滑档','调剂']}),
  c('admission:滑档','滑档',['志愿滑档'],'admissions_concept','admissions_mechanism','T0','常用报考口语，通常指所填志愿未形成预期投档或录取结果；它不是一个可以脱离具体省份投档规则单独判断的统一法律术语。',{sourceKey:'chsi_gaokao_policy',confusions:['退档']}),
  c('admission:调剂','专业调剂',['调剂','服从调剂'],'admissions_concept','admissions_mechanism','T2','是否存在、如何执行专业调剂取决于当年省级志愿模式和高校招生章程，不能用旧高考模式的经验直接套用。',{sourceKey:'chsi_gaokao_policy',liveRequired:true,confusions:['大类分流','转专业']}),
  c('admission:征集志愿','征集志愿',['征集'],'admissions_concept','admissions_mechanism','T2','某录取阶段按当年规则出现未完成计划等情况时，招生考试机构再次组织符合条件考生填报的志愿机会；时间和范围必须看当年官方公告。',{sourceKey:'chsi_gaokao_policy',liveRequired:true}),
  c('admission:平行志愿','平行志愿',[],'admissions_concept','admissions_mechanism','T2','一种志愿投档组织方式；具体志愿单位、排序和投档规则由当年省级招生政策决定，不能只凭“平行”二字推断没有顺序或没有风险。',{sourceKey:'chsi_gaokao_policy',liveRequired:true}),
  c('admission:招生计划','招生计划',['招生名额','计划数'],'admissions_concept','admissions_mechanism','T2','高校面向特定省份、科类/选科、专业和招生类型公布的当年招生安排。',{sourceKey:'chsi_gaokao_policy',liveRequired:true,practicalImpact:'历史分数只能作参照；当年计划变化会改变可比性。'}),
  c('score:本科线','本科批控制线',['本科线','本科批线','省控线'],'score_concept','score_rank','T2','省级招生考试机构按当年招生录取安排公布的相应控制分数线之一；适用批次和口径以当年省级文件为准。',{sourceKey:'chsi_gaokao_policy',liveRequired:true,confusions:['特殊类型招生录取控制分数线','投档线']}),
  c('score:特控线','特殊类型招生录取控制分数线',['特控线','特殊类型控制线'],'score_concept','score_rank','T2','为特定招生类型等设置的控制分数参考口径；它不是普通意义上的“重点大学录取线”，具体用途看当年省级招生规则。',{sourceKey:'chsi_gaokao_policy',liveRequired:true,confusions:['本科线','投档线']}),
  c('score:投档线','投档线',['院校投档线'],'score_concept','score_rank','T2','某次实际投档完成后形成的最低投档成绩等结果口径，受当年计划、考生志愿和投档规则共同影响；它不是高校预先承诺的固定门槛。',{sourceKey:'chsi_gaokao_policy',liveRequired:true,confusions:['录取线','专业最低分']}),
  c('score:专业最低分','专业最低分',['专业录取最低分','专业线'],'score_concept','score_rank','T2','某高校某专业/项目在特定省份和年度实际录取或投档结果中的最低成绩口径；必须同时保留年份、省份、科类/选科和项目属性。',{sourceKey:'chsi_gaokao_policy',liveRequired:true,confusions:['投档线']}),
  c('score:位次','位次',['排名','高考位次'],'score_concept','score_rank','T2','考生高考成绩在相应省份、类别和统计口径中的位置。跨年份比较时通常比只看分数更有信息，但仍要结合计划和政策变化。',{sourceKey:'chsi_gaokao_policy',liveRequired:true}),

  c('special:高校专项','高校专项计划',['高校专项','教育部高校专项计划'],'policy_concept','special_admissions','T2','面向符合条件的农村地区学生实施的专项招生安排之一；具体实施地区、资格、流程和录取要求必须按当年教育部和省级官方政策核验。',{sourceKey:'liaoning_special_2026',jurisdiction:'辽宁',liveRequired:true,confusions:['辽宁省高校专项计划','地方专项计划']}),
  c('special:辽宁省高校专项','辽宁省高校专项计划',['辽宁省高校专项','辽宁高校专项','辽宁省专项计划'],'policy_concept','special_admissions','T2','辽宁省重点高校面向符合辽宁当年规定条件的农村学生实施的专项招生计划；它与“教育部高校专项计划”是两个不同计划。',{sourceKey:'liaoning_special_2026',jurisdiction:'辽宁',liveRequired:true,practicalImpact:'是否能报取决于当年辽宁公布的实施区域、户籍、学籍和报名资格；不能只看分数。',confusions:['高校专项计划']}),
  c('special:国家专项','国家专项计划',['国家专项'],'policy_concept','special_admissions','T2','国家层面的专项招生类型之一，是否在某省实施、资格范围和志愿安排必须以当年省级及国家官方文件为准。',{sourceKey:'chsi_gaokao_policy',liveRequired:true,confusions:['地方专项计划','高校专项计划']}),
  c('special:地方专项','地方专项计划',['地方专项'],'policy_concept','special_admissions','T2','由省级招生政策具体组织的专项招生类型，招生对象、学校范围和资格条件具有地区与年度差异。',{sourceKey:'chsi_gaokao_policy',liveRequired:true,confusions:['国家专项计划','高校专项计划']}),
  c('special:强基','强基计划',['强基'],'policy_concept','special_admissions','T2','国家基础学科拔尖创新人才选拔培养相关招生类型；招生高校、专业、报名与考核方式按当年教育部和高校官方简章执行。',{sourceKey:'chsi_gaokao_policy',liveRequired:true}),
  c('special:综合评价','综合评价招生',['综合评价'],'policy_concept','special_admissions','T2','部分地区和高校采用多维材料或考核参与录取的招生方式；并非全国统一模板，必须核对所在省份和目标高校当年规则。',{sourceKey:'chsi_gaokao_policy',liveRequired:true}),
  c('target:公费师范','公费师范生',['公费师范','公费师范生项目'],'training_concept','targeted_training','T2','带有特定培养、就业或履约安排的师范生培养类型；部属与地方项目、当年政策和履约要求需分别核验。',{sourceKey:'moe_general',liveRequired:true}),
  c('target:优师','优师计划',['优师专项','优师'],'training_concept','targeted_training','T2','面向相关地区教师培养需求的专项培养安排；报考资格、培养学校和履约政策以当年官方文件为准。',{sourceKey:'moe_general',liveRequired:true}),
  c('target:定向医学生','农村订单定向医学生',['定向医学生','免费医学生'],'training_concept','targeted_training','T2','服务基层医疗卫生人才需求的定向培养类型，通常伴随特定培养和履约安排；省份、年度和专业规则需实时核验。',{sourceKey:'moe_general',liveRequired:true}),

  c('institution:985','985工程高校',['985','985大学'],'institution_label','institution_identity','T0','“985工程”是历史上的国家重点建设工程称谓。今天判断学校当前建设身份应优先使用现行官方名单和“双一流”等当前制度，而不是把历史标签当成全部专业实力。',{sourceKey:'moe_general',confusions:['211工程高校','双一流']}),
  c('institution:211','211工程高校',['211','211大学'],'institution_label','institution_identity','T0','“211工程”是历史上的国家重点建设工程称谓。它可以描述学校历史身份，但不能据此推出某个专业当前一定强。',{sourceKey:'moe_general',confusions:['985工程高校','双一流']}),
  c('institution:双一流','双一流',['世界一流大学和一流学科建设','双一流建设'],'institution_label','institution_identity','T2','现行国家高等教育重点建设体系相关称谓；具体建设高校和建设学科以最新官方名单为准。',{sourceKey:'double_first_class_2022',liveRequired:true,confusions:['985工程高校','211工程高校','国家级一流本科专业建设点']}),
  c('quality:一流本科专业','国家级一流本科专业建设点',['国家一流本科专业','一流本科专业'],'quality_label','quality_label','T2','面向本科专业建设的官方建设项目/名单标签，评价对象是具体本科专业建设，不等同于学校整体层次或研究生学科排名。',{sourceKey:'moe_general',liveRequired:true,confusions:['双一流','工程教育认证']}),
  c('quality:工程认证','工程教育专业认证',['工程教育认证','工程认证'],'quality_label','quality_label','T2','针对具体工程类专业培养质量与相关标准开展的专业认证，认证对象是专业而不是整所学校；是否通过及有效状态应查官方认证名单。',{sourceKey:'engineering_accreditation',liveRequired:true,confusions:['国家级一流本科专业建设点']}),
  c('quality:学科评估','学科评估',['教育部学科评估'],'quality_label','quality_label','T2','面向学科建设的评价活动，评价对象和口径不同于本科专业建设标签；使用结果时必须保留轮次和学科口径。',{sourceKey:'moe_general',liveRequired:true,confusions:['国家级一流本科专业建设点','双一流']}),
  c('quality:硕士点','硕士学位授权点',['硕士点'],'graduate_label','graduate_discipline','T2','学校获得硕士学位授予相关授权的学科或专业学位类别/领域，需要按官方学位授权名单理解；它不自动等价于同名本科专业“排名高”。',{sourceKey:'moe_graduate_2022',liveRequired:true,confusions:['本科专业']}),
  c('quality:博士点','博士学位授权点',['博士点'],'graduate_label','graduate_discipline','T2','学校获得博士学位授予相关授权的学科或专业学位类别，需要按官方学位授权名单理解；它是研究生培养层面的证据之一。',{sourceKey:'moe_graduate_2022',liveRequired:true}),

  c('structure:本科专业','本科专业',['专业'],'education_entity_type','undergraduate_major','T1','普通本科人才培养和专业设置体系中的具体专业实体，具有规范名称和专业代码，并归属于专业类和学科门类。',{sourceKey:'moe_undergraduate_2026',confusions:['专业类','一级学科','职业']}),
  c('structure:专业类','专业类',['本科专业类'],'education_entity_type','undergraduate_major','T1','本科专业目录中位于学科门类与具体本科专业之间的分类层级，一个专业类可包含多个具体专业。',{sourceKey:'moe_undergraduate_2026',confusions:['本科专业','一级学科']}),
  c('structure:一级学科','一级学科',['研究生一级学科'],'education_entity_type','graduate_discipline','T1','研究生教育学科专业目录中的学科层级之一，用于学位授权、研究生培养和学科建设等；不能与本科专业名称简单等同。',{sourceKey:'moe_graduate_2022',confusions:['本科专业','专业类']}),
  c('structure:专业学位','专业学位类别',['专业学位','专硕类别'],'education_entity_type','graduate_discipline','T1','研究生教育学科专业目录中的专业学位类别，与一级学科共同构成研究生教育的重要分类，但培养定位和代码体系不同。',{sourceKey:'moe_graduate_2022',confusions:['一级学科','学术学位']}),
  c('structure:学硕','学术学位硕士',['学硕'],'education_entity_type','postgraduate_path','T1','以学术学位体系培养的硕士研究生路径，具体招生专业、考试科目和培养要求由招生单位及当年研招政策确定。',{sourceKey:'moe_graduate_2022',confusions:['专业学位硕士']}),
  c('structure:专硕','专业学位硕士',['专硕'],'education_entity_type','postgraduate_path','T1','以专业学位体系培养的硕士研究生路径；专业学位类别在研究生教育目录中有独立代码和名称。',{sourceKey:'moe_graduate_2022',confusions:['学术学位硕士']}),
  c('structure:职业本科','职业本科',['本科层次职业教育'],'education_entity_type','vocational_education','T1','本科层次职业教育的一种办学和人才培养类型，专业设置使用职业教育专业目录体系，不能直接套用普通本科专业目录。',{sourceKey:'moe_vocational_setting_2026',confusions:['普通本科','高职专科']}),
  c('structure:高职专科','高职专科',['高等职业专科','高职'],'education_entity_type','vocational_education','T1','高等职业教育专科层次，专业设置与普通本科使用不同的目录体系。',{sourceKey:'moe_vocational_setting_2026',confusions:['职业本科','普通本科']}),

  c('training:大类招生','大类招生',['按大类招生'],'training_concept','training_process','T3','高校按一个专业类或招生大类录取后，再按学校培养方案在后续阶段进行专业分流的培养组织方式；具体包含专业、分流时间和规则必须查目标学校。',{sourceKey:'moe_general',liveRequired:true,confusions:['专业分流','转专业']}),
  c('training:专业分流','专业分流',['大类分流'],'training_concept','training_process','T3','大类招生或相关培养模式中，学生在校内按学校规则进入具体专业/方向的过程；它不是通常意义上的“转专业”。',{sourceKey:'moe_general',liveRequired:true,confusions:['转专业','大类招生']}),
  c('training:转专业','转专业',['换专业'],'training_concept','training_process','T3','学生入学后按学校规定申请从当前专业转入其他专业的校内制度；资格、时间、容量和限制由具体学校现行规则决定。',{sourceKey:'moe_general',liveRequired:true,confusions:['专业分流']}),
  c('training:培养方案','培养方案',['本科培养方案'],'training_concept','training_process','T3','学校或学院对某专业培养目标、课程体系、学分、实践环节等作出的正式教学安排，是理解“这所学校这个专业具体学什么”的关键学校级证据。',{sourceKey:'moe_general',liveRequired:true}),
  c('postgrad:推免','推荐免试研究生',['推免','保研'],'postgraduate_concept','postgraduate_path','T2','符合条件的本科毕业生按国家和学校研究生推荐免试制度进入后续招生程序的路径；学校是否具有推免资格、名额与个人能否获得资格是不同问题。',{sourceKey:'moe_general',liveRequired:true,confusions:['考研']}),

  c('sino:中外合作','中外合作办学',['中外合作','合作办学'],'education_program','sino_foreign','T4','经依法审批或备案等程序开展的中外教育合作办学活动。具体机构/项目、办学层次、证书和当前状态必须查教育部监管信息及学校当年招生材料。',{sourceKey:'sino_foreign_registry',liveRequired:true,confusions:['国际班','联合学院']}),
  c('sino:国际班','国际班',['国际项目班'],'school_specific_label','sino_foreign','T3','高校招生或培养中可能使用的项目名称，但“国际班”本身不能自动等同于依法设立的中外合作办学机构/项目；必须回到学校和监管平台核验。',{sourceKey:'sino_foreign_registry',liveRequired:true,confusions:['中外合作办学']}),

  c('subject:选科要求','选科要求',['招生选考科目要求'],'admissions_concept','subject_requirements','T2','高校专业对考生高中选择性考试科目提出的报考要求；必须使用目标招生年度、目标省份和具体专业的官方计划口径。',{sourceKey:'chsi_gaokao_policy',liveRequired:true}),
  c('subject:物化','物理和化学',['物化要求','物化'],'subject_concept','subject_requirements','T2','高考选科语境中通常指首选/选择物理并满足化学相关要求的口语表达，但最终能否报某专业必须按当年官方选科要求核验。',{sourceKey:'chsi_gaokao_policy',liveRequired:true}),
  c('subject:物化生','物理化学生物组合',['物化生'],'subject_concept','subject_requirements','T2','常用的选科组合简称；它描述考生所选科目，不代表所有理工医专业都自动可报。',{sourceKey:'chsi_gaokao_policy',liveRequired:true}),

  c('physical:色弱','色觉异常Ⅱ度（常称色弱）',['色弱'],'physical_exam_concept','physical_exam','T2','高考体检和高校招生中涉及色觉辨认能力的条件之一。具体哪些专业受限要以现行国家体检指导和目标高校招生章程为准，不能仅凭专业名称猜。',{sourceKey:'physical_exam_guidance',liveRequired:true,confusions:['色盲','单色识别']}),
  c('physical:色盲','色觉异常Ⅰ度等相关色觉限制（常称色盲）',['色盲'],'physical_exam_concept','physical_exam','T2','招生体检语境中的常用称呼之一，具体受限专业和学校补充要求必须按现行体检政策与招生章程核验。',{sourceKey:'physical_exam_guidance',liveRequired:true}),
  c('physical:单色识别','不能准确识别单一颜色',['单色识别能力异常','单色识别'],'physical_exam_concept','physical_exam','T2','招生体检中可能影响部分专业报考的色觉识别情形；适用专业须逐条按现行政策和学校章程核验。',{sourceKey:'physical_exam_guidance',liveRequired:true}),

  c('aid:国家助学贷款','国家助学贷款',['助学贷款'],'financial_aid_concept','financial_aid','T2','国家学生资助体系中的信用助学贷款安排之一，申请对象、额度、利息和办理方式按当前国家及地方政策执行。',{sourceKey:'moe_general',liveRequired:true}),
  c('aid:国家奖学金','国家奖学金',[],'financial_aid_concept','financial_aid','T2','国家学生资助体系中的奖学金项目，具体标准和评审规则按当前政策及学校实施办法执行。',{sourceKey:'moe_general',liveRequired:true}),

  c('industry:工业控制','工业控制',['工控','工业自动化控制'],'industry_concept','industry_technology','T1','利用控制、自动化、测量、通信与计算等技术对工业设备或生产过程进行监测和控制的技术领域；它通常不是一个教育部普通本科专业的完整规范名称。',{sourceKey:'occupation_2022',confusions:['自动化','控制科学与工程']}),
  c('industry:智能制造','智能制造',['智能制造技术'],'industry_concept','industry_technology','T1','制造业数字化、自动化、网络化和智能化相关的技术与产业概念；判断具体本科专业时应回到教育部专业目录。',{sourceKey:'moe_general'}),
  c('industry:材料加工','材料加工',['材料加工技术'],'industry_concept','industry_technology','T1','围绕材料成形、制备、加工与性能控制等过程的技术领域表达；它本身不能自动当作教育部普通本科专业的规范名称。',{sourceKey:'moe_undergraduate_2026',confusions:['材料成型及控制工程','材料科学与工程']}),
  c('industry:储能','储能',['储能技术'],'industry_concept','industry_technology','T1','围绕能量存储、转换、管理和应用的一类技术与产业概念；具体对应哪些本科专业应按规范专业目录和学校培养方案区分。',{sourceKey:'moe_general'}),
  c('industry:低空经济','低空经济',['低空产业'],'industry_concept','industry_technology','T1','围绕低空飞行活动及相关制造、运营、保障和服务形成的产业概念，不等同于单一本科专业。',{sourceKey:'moe_general'}),

  c('occupation:职业','职业',['工作职业'],'occupation_concept','occupation','T1','从业活动分类意义上的职业与高校专业不是一一对应关系；专业是教育培养实体，职业应按职业分类和实际岗位要求理解。',{sourceKey:'occupation_2022',confusions:['本科专业']})
]);

const BY_NAME=new Map(),BY_ID=new Map();
for(const item of CONCEPTS){BY_ID.set(item.id,item);for(const name of [item.name,...(item.aliases||[])])BY_NAME.set(norm(name),item);}

export const EDUCATION_CONCEPT_RELATIONS=Object.freeze([
  Object.freeze({type:'different_from',a:'special:高校专项',b:'special:辽宁省高校专项',text:'教育部高校专项计划与辽宁省高校专项计划是两个不同计划；在辽宁2026政策中二者资格条件和组织方式分别规定。'}),
  Object.freeze({type:'different_from',a:'structure:本科专业',b:'structure:一级学科',text:'本科专业是本科人才培养与专业设置实体；一级学科属于研究生教育学科专业体系，二者层级和用途不同。'}),
  Object.freeze({type:'different_from',a:'structure:本科专业',b:'occupation:职业',text:'高校专业描述“学什么、怎么培养”，职业描述“从事什么工作”，两者不是一一对应。'}),
  Object.freeze({type:'often_confused_with',a:'quality:一流本科专业',b:'institution:双一流',text:'国家级一流本科专业建设点评价具体本科专业建设；“双一流”属于国家重点建设体系，不能互相替代。'}),
  Object.freeze({type:'often_confused_with',a:'quality:一流本科专业',b:'quality:工程认证',text:'一流本科专业建设点与工程教育专业认证是不同制度和不同证据，不应合并成一个“专业等级”。'}),
  Object.freeze({type:'different_from',a:'admission:投档',b:'admission:录取',text:'投档是招生考试机构把档案投给高校的环节；录取是高校按规则完成后形成的结果。'}),
  Object.freeze({type:'different_from',a:'admission:退档',b:'admission:滑档',text:'退档通常发生在已经投档之后；“滑档”更多是报考口语，常指没有形成预期投档/录取。'}),
  Object.freeze({type:'different_from',a:'training:转专业',b:'training:专业分流',text:'转专业是从已在读专业申请转入其他专业；专业分流通常是大类培养体系内进入具体专业的过程。'}),
  Object.freeze({type:'related_to',a:'industry:工业控制',b:'graduate:0811',text:'工业控制与控制理论、自动化技术高度相关，但“工业控制”本身通常不是一个研究生一级学科名称。'})
]);

function authority(sourceKey){const source=EDUCATION_AUTHORITY_REGISTRY[sourceKey]||EDUCATION_AUTHORITY_REGISTRY.moe_general;return{...source};}
function relationTexts(entityIds=[]){const ids=new Set(entityIds);return EDUCATION_CONCEPT_RELATIONS.filter(item=>ids.has(item.a)&&ids.has(item.b)||entityIds.length===1&&(item.a===entityIds[0]||item.b===entityIds[0])).map(item=>item.text);}
function catalogMajorEntity(major){return{id:`undergraduate:${major.code}`,name:major.name,aliases:major.aliases||[],type:'undergraduate_major',taxonomy:'undergraduate_major',temperature:'T1',officialCode:major.code,categoryCode:major.categoryCode||'',categoryName:major.categoryName||'',disciplineCode:major.disciplineCode||'',disciplineName:major.disciplineName||'',definition:`${major.name}是《普通高等学校本科专业目录（2026年）》中的规范本科专业${major.code?`，专业代码${major.code}`:''}${major.categoryName?`，归入${major.categoryName}`:''}${major.disciplineName?`，所属${major.disciplineName}门类`:''}。`,sourceKey:'moe_undergraduate_2026',practicalImpact:'专业目录确认的是规范身份和分类；具体学校是否招生、课程怎么安排、就业去向如何，仍需分别核验当年招生计划、培养方案和对应证据。',confusions:[],relations:[],jurisdiction:'全国',liveRequired:false};}
function catalogCategoryEntity(category){return{id:`undergraduate-category:${category.code||norm(category.name)}`,name:category.name,aliases:[],type:'undergraduate_major_category',taxonomy:'undergraduate_major',temperature:'T1',officialCode:category.code||'',disciplineCode:category.disciplineCode||'',disciplineName:category.disciplineName||'',definition:`${category.name}是《普通高等学校本科专业目录（2026年）》中的专业类，不是一个可以直接等同于具体招生专业的单一本科专业。`,sourceKey:'moe_undergraduate_2026',practicalImpact:'填报时仍需看学校当年真正投放的具体专业/大类和专业代码。',confusions:['本科专业'],relations:[],jurisdiction:'全国',liveRequired:false};}
function graduateCatalogEntity(item){const professional=item.kind==='professional_degree_category';return{id:`graduate:${item.code}`,name:item.name,aliases:[],type:professional?'graduate_professional_degree_category':'graduate_first_level_discipline',taxonomy:'graduate_discipline',temperature:'T1',officialCode:item.code,categoryCode:item.categoryCode||'',categoryName:item.categoryName||'',mastersOnly:Boolean(item.mastersOnly),definition:professional?`${item.name}是《研究生教育学科专业目录（2022年）》中的专业学位类别，代码${item.code}${item.mastersOnly?'，目录标记为仅可授硕士专业学位':''}；它与同名本科专业或一级学科不是同一教育实体。`:`${item.name}是《研究生教育学科专业目录（2022年）》中的一级学科，代码${item.code}；它属于研究生教育学科体系，不能与同名本科专业简单等同。`,sourceKey:'moe_graduate_2022',practicalImpact:professional?'判断具体硕士/博士招生仍需看招生单位当年专业目录与简章。':'判断本科阶段学什么，应看本科专业和学校培养方案；判断硕博培养与学科平台，再看一级学科。',confusions:[],relations:[],jurisdiction:'全国',liveRequired:false};}
function graduateResolutionEntities(resolution){if(!resolution)return[];if(resolution.status==='resolved')return[graduateCatalogEntity(resolution.item)];if(resolution.status==='ambiguous')return(resolution.candidates||[]).map(graduateCatalogEntity);return[];}
function ambiguousResolution(matchType,candidates=[]){return{matchType,ambiguous:true,confidence:0,candidates:candidates.map(entity=>({entity,source:authority(entity.sourceKey)}))};}
function undergraduateOrdinarySurfaceEntities(value=''){
  const raw=clean(value,180);if(!raw)return[];
  const variants=unique([raw,`${raw}类`,raw.endsWith('学')?`${raw}类`:`${raw}学`,raw.endsWith('学')?'':`${raw}学类`],6),out=[];
  for(const variant of variants){
    if(!variant)continue;
    const resolved=resolveCatalogEntity(variant,{allowContains:false});let entity=null;
    if(resolved?.kind==='major')entity=catalogMajorEntity(resolved.item);
    else if(resolved?.kind==='category')entity=catalogCategoryEntity(resolved.item);
    if(entity&&!out.some(item=>item.id===entity.id))out.push(entity);
  }
  return out;
}

export function resolveCanonicalEducationEntity(value=''){
  const raw=clean(value,180),key=norm(raw);if(!key)return null;
  const known=BY_NAME.get(key);if(known)return{matchType:'canonical_exact',confidence:100,entity:{...known},source:authority(known.sourceKey)};
  const undergraduate=findCatalogMajorExact(raw),graduate=resolveGraduateCatalogEntity(raw),graduateEntities=graduateResolutionEntities(graduate);
  if(undergraduate&&graduateEntities.length)return ambiguousResolution('cross_system_ambiguous',[catalogMajorEntity(undergraduate),...graduateEntities]);
  if(graduateEntities.length>1)return ambiguousResolution('graduate_name_ambiguous',graduateEntities);
  if(graduate?.status==='resolved'&&graduate?.matchType==='name_exact'&&graduateEntities.length===1){const undergraduateSurfaces=undergraduateOrdinarySurfaceEntities(raw);if(undergraduateSurfaces.length)return ambiguousResolution('cross_system_surface_ambiguous',[...undergraduateSurfaces,...graduateEntities]);}
  if(undergraduate){const entity=catalogMajorEntity(undergraduate);return{matchType:'undergraduate_major_exact',confidence:100,entity,source:authority(entity.sourceKey)};}
  if(graduateEntities.length===1){const entity=graduateEntities[0];return{matchType:graduate?.matchType||'graduate_exact',confidence:100,entity,source:authority(entity.sourceKey)};}
  const category=resolveCatalogEntity(raw,{allowContains:false});if(category?.kind==='category'){const entity=catalogCategoryEntity(category.item);return{matchType:'undergraduate_category_exact',confidence:96,entity,source:authority(entity.sourceKey)};}
  return null;
}

function splitComparisonTerms(question=''){
  const stripped=stripKnowledgeQuestionFrame(question).replace(/(?:有什么|有啥|的)?(?:区别|差别)(?:是什么)?$/,'').trim();
  const cleaned=stripped.replace(/^(?:比较|对比)/,'').trim();
  let parts=[];
  if(/[和跟、]/.test(cleaned)||/\s(?:vs|VS)\s/.test(cleaned))parts=cleaned.split(/(?:和|跟|、|\/|\s+(?:vs|VS)\s+)/);
  else if(cleaned.includes('与'))parts=cleaned.split('与');
  else parts=[cleaned];
  return unique(parts.map(value=>value.trim()).filter(Boolean),4);
}

function nearbyEntities(subject=''){
  const key=norm(subject),out=[];if(!key)return out;
  for(const item of CONCEPTS){for(const token of [item.name,...(item.aliases||[])]){const nk=norm(token);if(nk&&key.includes(nk)||nk&&nk.includes(key)){if(!out.some(x=>x.id===item.id))out.push(item);break;}}if(out.length>=4)break;}
  const catalogContains=resolveCatalogEntity(subject,{allowContains:true});if(catalogContains?.kind==='major'){const entity=catalogMajorEntity(catalogContains.item);if(!out.some(x=>x.id===entity.id))out.push(entity);}
  return out.slice(0,4).map(entity=>({id:entity.id,name:entity.name,type:entity.type}));
}

export function resolveEducationKnowledgeQuestion(question='',context={}){
  const kind=knowledgeQuestionKind(question),rawSubject=stripKnowledgeQuestionFrame(question),comparisonTerms=kind==='compare_concepts'?splitComparisonTerms(question):[];
  if(comparisonTerms.length>=2){const resolutions=comparisonTerms.map(term=>({term,resolution:resolveCanonicalEducationEntity(term)})),resolved=resolutions.filter(item=>item.resolution?.entity);if(resolved.length===resolutions.length){const entities=resolved.map(item=>item.resolution.entity),sources=resolved.map(item=>item.resolution.source);return{ok:true,resolutionClass:'canonical_exact',kind,subject:comparisonTerms.join(' vs '),entities,sources,relationTexts:relationTexts(entities.map(item=>item.id)),requiresLive:entities.some(item=>item.liveRequired),temperature:entities.some(item=>item.temperature==='T4')?'T4':entities.some(item=>item.temperature==='T3')?'T3':entities.some(item=>item.temperature==='T2')?'T2':'T1'};}return{ok:false,resolutionClass:'ambiguous',kind,subject:rawSubject,terms:resolutions.map(item=>({term:item.term,resolvedName:item.resolution?.entity?.name||'',resolvedType:item.resolution?.entity?.type||'',candidates:(item.resolution?.candidates||[]).map(candidate=>({name:candidate.entity?.name||'',type:candidate.entity?.type||'',code:candidate.entity?.officialCode||''}))})),nearby:nearbyEntities(rawSubject),message:'这句话里存在未确认或跨教育体系同名的概念，我不会替你猜是哪一个层级。'};}
  const candidates=unique([rawSubject,...(context.majorKeywords||[])],6);for(const candidate of candidates){const resolved=resolveCanonicalEducationEntity(candidate);if(resolved?.ambiguous)return{ok:false,resolutionClass:'ambiguous',kind,subject:candidate,nearby:(resolved.candidates||[]).map(item=>({id:item.entity?.id||'',name:item.entity?.name||'',type:item.entity?.type||'',code:item.entity?.officialCode||''})),message:`“${candidate}”在规范教育目录中对应多个不同层级/类型的实体，我不会自动选择其中一个；请明确你问的是本科专业、研究生一级学科还是专业学位类别。`};if(resolved?.entity){const entity=resolved.entity;return{ok:true,resolutionClass:resolved.matchType,kind,subject:candidate,entities:[entity],sources:[resolved.source],relationTexts:relationTexts([entity.id]),requiresLive:Boolean(entity.liveRequired||kind==='current_rule'||kind==='eligibility'),temperature:kind==='current_rule'||kind==='eligibility'?'T2':entity.temperature||'T1'};}}
  const nearby=nearbyEntities(rawSubject),compound=/材料加工.*工业控制|工业控制.*材料加工/.test(rawSubject);return{ok:false,resolutionClass:compound?'source_specific_or_compound':'unknown',kind,subject:rawSubject,nearby,message:compound?'“材料加工与工业控制”当前没有被确认成教育部2026本科专业目录中的一个完整规范专业名称；它更像技术领域组合或某个来源里的方向性表述。':'当前没有把这个说法确认成规范教育实体；在没有权威身份之前，不用模型常识补成正式专业或政策名称。'};
}

export function knowledgeCoverageSnapshot(){const catalog=getCatalogStats(),graduate=graduateCatalogStats(),vocational=vocationalCatalogGovernanceSnapshot();return{version:AI_EDUCATION_KNOWLEDGE_CENTER_VERSION,taxonomyCount:KNOWLEDGE_TAXONOMY.length,seedConceptCount:CONCEPTS.length,undergraduateMajorCount:Number(catalog.majorCount||catalog.entries||0),undergraduateCategoryCount:Number(catalog.categoryCount||0),graduateCatalogVersion:graduate.version,graduateEntryCount:graduate.entries,graduateFirstLevelCount:graduate.firstLevelDisciplines,graduateProfessionalDegreeCount:graduate.professionalDegreeCategories,graduateMastersOnlyProfessionalDegreeCount:graduate.mastersOnlyProfessionalDegreeCategories,vocationalCatalogMode:vocational.mode,vocationalBaseMajorCount:vocational.baseMajorCount,vocationalCurrentIdentityLiveRequired:vocational.liveIdentityRequired,vocationalLatestKnownAddedMajors:vocational.latestKnownAddedMajors,vocationalLatestKnownEnrollmentStartYear:vocational.latestKnownEnrollmentStartYear,authoritySourceCount:Object.keys(EDUCATION_AUTHORITY_REGISTRY).length,relationCount:EDUCATION_CONCEPT_RELATIONS.length,unknownPolicy:'unknown_is_valid_never_promote_by_llm'};}

export const EDUCATION_KNOWLEDGE_TESTING=Object.freeze({norm,splitComparisonTerms,nearbyEntities,relationTexts});
