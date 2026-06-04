// v3.9.8.2 关键词预置、入口补偿与成熟产品文案策略。
// 维护原则：前端短路径、低饱和轻提示；后台负责完整匹配和命中打分。
// 新增词优先改本文件和对应后端 policy，不改搜索主流程。
export const DEFAULT_KEYWORD_PRESETS = [
  { label: '计算机', type: 'major_alias', tone: 'default', intent: '计算机软件数字技术方向' },
  { label: '电气', type: 'major_alias', tone: 'default', intent: '电气电力方向' },
  { label: '自动化', type: 'major_alias', tone: 'default', intent: '自动化与控制方向' },
  { label: '机械', type: 'major_alias', tone: 'default', intent: '机械制造与装备方向' },
  { label: '会计', type: 'major_alias', tone: 'default', intent: '财经管理方向' },
  { label: '医学', type: 'major_alias', tone: 'default', intent: '医学健康大方向' },
  { label: '师范', type: 'major_alias', tone: 'default', intent: '师范教育路径' },
  { label: '法学', type: 'major_alias', tone: 'default', intent: '文法考公路径' },
  { label: '中外', type: 'project_attribute', tone: 'project', badge: '项目', intent: '中外合作/高收费项目' },
  { label: '交通', type: 'industry_path', tone: 'default', intent: '交通铁道行业路径' }
];

export const MORE_KEYWORD_GROUPS = [
  {
    title: '工科技术',
    tone: 'default',
    hint: '偏工科、技术和技能路径。',
    words: [
      { label: '电子' },
      { label: '通信' },
      { label: '软件' },
      { label: '人工智能' },
      { label: '材料' },
      { label: '化工' },
      { label: '环境' }
    ]
  },
  {
    title: '生命食品',
    tone: 'default',
    hint: '偏食品安全、动物医学、生命科学和农学水产方向。',
    words: [
      { label: '食品' },
      { label: '动物医学' },
      { label: '生物' },
      { label: '水产' },
      { label: '农学' },
      { label: '园艺' }
    ]
  },
  {
    title: '医学健康',
    tone: 'default',
    hint: '偏医学、药学、护理和医技方向。',
    words: [
      { label: '临床' },
      { label: '口腔' },
      { label: '护理' },
      { label: '药学' },
      { label: '康复' },
      { label: '影像' },
      { label: '检验' }
    ]
  },
  {
    title: '财经文法',
    tone: 'default',
    hint: '偏财经管理、文法语言和考公路径。',
    words: [
      { label: '金融' },
      { label: '财务' },
      { label: '审计' },
      { label: '经济' },
      { label: '管理' },
      { label: '中文' },
      { label: '新闻' },
      { label: '外语' }
    ]
  },
  {
    title: '行业项目',
    tone: 'default',
    hint: '包含行业院校入口与项目属性入口。',
    words: [
      { label: '石油', type: 'industry_path' },
      { label: '铁道', type: 'industry_path' },
      { label: '航空', type: 'industry_path' },
      { label: '航天', type: 'industry_path' },
      { label: '电力', type: 'industry_path' },
      { label: '邮电', type: 'industry_path' },
      { label: '高收费', type: 'project_attribute', tone: 'project', badge: '项目' },
      { label: '公费师范', type: 'project_attribute', tone: 'project', badge: '项目' },
      { label: '定向', type: 'project_attribute', tone: 'project', badge: '项目' }
    ]
  }
];

export const KEYWORD_PRESET_NOTE = '说明：方向词用于帮助搜索；“中外 / 高收费 / 公费师范 / 定向”属于项目或招生属性，不是标准专业名。页面不按性别推荐专业，更多方向只是补充入口，仍可直接手动输入任何专业词。';
