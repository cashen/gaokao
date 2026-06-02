// v3.9.7.1 关键词预置策略。
// 维护原则：前端只提供少量高质量入口词；后台负责原词直搜、标准专业名、行业路径、项目属性和命中打分。
// 新增词优先改本文件和对应 policy，不改搜索主流程。
export const DEFAULT_KEYWORD_PRESETS = [
  { label: '计算机', type: 'major_alias', intent: '计算机软件数字技术方向' },
  { label: '电气', type: 'major_alias', intent: '电气电力方向' },
  { label: '自动化', type: 'major_alias', intent: '自动化与控制方向' },
  { label: '机械', type: 'major_alias', intent: '机械制造与装备方向' },
  { label: '会计', type: 'major_alias', intent: '财经管理方向' },
  { label: '医学', type: 'major_alias', intent: '医学健康大方向' },
  { label: '师范', type: 'major_alias', intent: '师范教育路径' },
  { label: '法学', type: 'major_alias', intent: '文法考公路径' },
  { label: '中外', type: 'project_attribute', intent: '中外合作/高收费项目' },
  { label: '交通', type: 'industry_path', intent: '交通铁道行业路径' }
];

export const MORE_KEYWORD_GROUPS = [
  {
    title: '工科技术',
    words: ['电子', '通信', '软件', '人工智能', '材料', '化工', '环境', '食品']
  },
  {
    title: '医学健康',
    words: ['临床', '口腔', '护理', '药学', '康复', '影像']
  },
  {
    title: '财经文法',
    words: ['金融', '财务', '审计', '经济', '管理', '中文', '新闻', '外语']
  },
  {
    title: '行业项目',
    words: ['石油', '铁道', '航空', '航天', '电力', '邮电', '高收费', '公费师范', '定向']
  }
];
