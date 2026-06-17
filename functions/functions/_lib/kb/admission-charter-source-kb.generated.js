// Generated for ln-rank KB seed: admission-charter-source-kb.generated.js

export const ADMISSION_CHARTER_SOURCE_KB = {
  version: 'admission-charter-source-20260604',
  sourceLevel: 'A',
  primaryPlatform: {
    name: '阳光高考招生章程平台',
    url: 'https://gaokao.chsi.com.cn/zsgs/zhangcheng/',
    owner: '教育部高校招生阳光工程指定信息发布平台/学信网',
    description: '提供经上级主管部门审核通过的高校招生章程查询。'
  },
  platformHome: {
    name: '阳光高考',
    url: 'https://gaokao.chsi.com.cn/',
    description: '教育部高校招生阳光工程指定信息发布平台，发布高校招生章程，提供院校信息、分数线、志愿填报、选专业、高考咨询等服务。'
  },
  candidateSourcePriority: [
    { level: 'A', source: '阳光高考招生章程平台', usage: '招生章程官方审核入口，优先核验。' },
    { level: 'A', source: '高校本科招生网/学校官网信息公开网', usage: '章程原文、学费、校区、培养模式、转专业政策核验。' },
    { level: 'A', source: '辽宁招生考试之窗/志愿网报系统/《辽宁招生考试》杂志', usage: '辽宁招生计划、专业备注和更正说明核验。' },
    { level: 'B', source: '省级教育考试院转载或官方媒体转载', usage: '线索来源，需回到A源确认。' }
  ],
  commonCheckItems: [
    '招生年份', '招生省份', '招生批次', '专业名称', '专业代码', '招生人数', '学费', '住宿费', '校区', '培养地点',
    '培养模式', '毕业证/学位证', '中外合作外方院校', '是否必须出国', '授课语言', '外语语种限制', '单科成绩要求',
    '体检限制', '色弱/色盲限制', '专业分流规则', '转专业政策', '高收费说明', '定向服务地区和服务年限', '违约责任',
    '专项/预科/民族班/试验班/本博说明'
  ],
  projectChecklists: {
    sinoForeign: {
      label: '中外合作',
      keywords: ['中外合作', '中外合作办学', '合作办学', '国际学院', '外方', '出国', '英语授课'],
      mustCheck: ['学费', '外方院校', '是否必须出国', '授课语言', '毕业证/学位证', '校区', '转专业政策', '保研/推免资格'],
      parentCopy: '中外合作项目需要核验学费、培养模式、是否必须出国、授课语言、毕业证/学位证、校区和转专业政策。'
    },
    highFee: {
      label: '高收费',
      keywords: ['高收费', '较高收费', '学费较高', '软件工程学费', '国际项目'],
      mustCheck: ['学费', '培养模式', '是否与普通专业同院系培养', '校区', '转专业政策'],
      parentCopy: '高收费条目需要确认家庭是否接受学费、培养模式和校区安排。'
    },
    targeted: {
      label: '定向',
      keywords: ['定向', '委托培养', '订单定向', '免费培养'],
      mustCheck: ['定向地区', '服务年限', '违约责任', '户籍要求', '体检/政审条件'],
      parentCopy: '定向项目必须核验服务地区、服务年限、违约责任和报名条件。'
    },
    publicTeacher: {
      label: '公费师范',
      keywords: ['公费师范', '优师专项', '本研衔接师范生公费教育'],
      mustCheck: ['履约地区', '服务年限', '违约责任', '教师资格要求', '就业安排'],
      parentCopy: '公费师范相关项目需要核验履约地区、服务年限、违约责任和就业安排。'
    },
    experimentalClass: {
      label: '试验班',
      keywords: ['试验班', '实验班', '拔尖', '卓越', '本博', '本研', '强基'],
      mustCheck: ['专业分流规则', '可选专业范围', '分流时间', '退出机制', '是否承诺具体专业'],
      parentCopy: '试验班不能直接等同于某个具体专业，需要核验分流规则和可选专业范围。'
    },
    preparatoryOrSpecial: {
      label: '预科/专项/民族班',
      keywords: ['预科', '专项', '民族班', '高校专项', '国家专项', '地方专项'],
      mustCheck: ['报考资格', '培养地点', '转入专业范围', '学制变化', '招生条件'],
      parentCopy: '预科、专项、民族班等需要核验资格条件、培养地点和后续专业安排。'
    }
  },
  aiBoundary: [
    'AI可以提示需要核验哪些章程项目，但不能替代招生章程作最终结论。',
    '对中外合作、高收费、定向、专项、预科、试验班、本博等条目必须提高人工复核优先级。',
    '如果章程年份不是2026或未确认辽宁招生计划，不得按正式填报结论表达。'
  ]
};

export function getAdmissionProjectChecklist(text) {
  const value = String(text || '');
  return Object.values(ADMISSION_CHARTER_SOURCE_KB.projectChecklists).filter(item => item.keywords.some(k => value.includes(k)));
}
