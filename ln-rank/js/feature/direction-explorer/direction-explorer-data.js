export const DIRECTION_EXPLORER_STORAGE_KEY = 'lnRank.directionExplorer.v2';
export const DIRECTION_EXPLORER_VERSION = 'v2-discussion-helper-v3943_0';

export const DIRECTION_BUCKETS = {
  apply: '可以优先查看',
  learn: '可以先了解',
  confirm: '需要先确认'
};

export const DIRECTION_GROUPS = {
  computer_data: {
    label: '计算机 / 数据应用', shortLabel: '计算机数据',
    keywords: ['计算机', '软件工程', '数据科学'],
    learn: '先区分“喜欢用电脑”和“接受编程训练、数学逻辑、长期调试”。',
    confirm: ['是否接受长期写代码、反复调试、数学逻辑和持续学习。'],
    majors: ['计算机类', '软件工程', '数据科学', '信息管理']
  },
  electronic_comm: {
    label: '电子信息 / 通信', shortLabel: '电子通信',
    keywords: ['电子信息', '通信工程', '微电子'],
    learn: '偏硬件、信号、电路和通信系统，不能简单等同于计算机。',
    confirm: ['是否接受电路、信号、物理和实验调试。'],
    majors: ['电子信息工程', '通信工程', '微电子科学与工程']
  },
  electrical_auto: {
    label: '电气 / 自动化', shortLabel: '电气自动化',
    keywords: ['电气', '自动化', '智能电网'],
    learn: '更接近设备、电力、控制和工程系统。',
    confirm: ['是否接受电路、物理、控制类课程和项目调试。'],
    majors: ['电气工程及其自动化', '自动化', '测控技术与仪器']
  },
  machinery_smart: {
    label: '机械 / 智能制造', shortLabel: '机械制造',
    keywords: ['机械', '智能制造', '机器人工程'],
    learn: '偏设备、结构、制造和工程现场。',
    confirm: ['是否接受工程制图、机械原理、设备现场和实习环境。'],
    majors: ['机械设计制造及其自动化', '智能制造工程', '机器人工程']
  },
  civil_project: {
    label: '土木 / 建筑 / 工程管理', shortLabel: '土建工程',
    keywords: ['土木工程', '建筑', '工程管理'],
    learn: '偏工程项目、现场、图纸、造价和施工组织。',
    confirm: ['是否接受现场环境、图纸制图、项目协调和行业周期。'],
    majors: ['土木工程', '建筑学', '工程管理']
  },
  material_bio_food: {
    label: '材料 / 化工 / 食品 / 生物工程', shortLabel: '材料生化',
    keywords: ['材料', '化学工程', '食品科学'],
    learn: '多与实验、工艺、材料性质和生产流程有关。',
    confirm: ['是否接受实验课程、化学/生物环境、长期观察和安全规范。'],
    majors: ['材料类', '化学工程与工艺', '食品科学与工程']
  },
  medical_pharm: {
    label: '医学技术 / 药学', shortLabel: '医技药学',
    keywords: ['医学检验', '医学影像', '药学'],
    learn: '不是临床医学，更多是检测、影像、药品和医学技术路径。',
    confirm: ['体检限制、医学基础课、实验/实习环境、是否读研和岗位场景。'],
    majors: ['医学检验技术', '医学影像技术', '药学']
  },
  rehab_care: {
    label: '康复 / 护理 / 健康服务', shortLabel: '康复照护',
    keywords: ['康复治疗', '护理学', '健康服务'],
    learn: '更强调服务对象、沟通耐心和真实照护场景。',
    confirm: ['是否接受服务沟通、医院或康复场景、轮班和长期细心工作。'],
    majors: ['康复治疗学', '护理学', '健康服务与管理']
  },
  finance_audit: {
    label: '财经 / 会计 / 审计 / 管理', shortLabel: '财经管理',
    keywords: ['会计学', '财务管理', '审计学'],
    learn: '偏规则、数字、表格、证书路径和细致核对。',
    confirm: ['是否接受细致核对、规则学习、证书路径和就业竞争。'],
    majors: ['会计学', '财务管理', '审计学']
  },
  law_public: {
    label: '法学 / 公共管理 / 规则文字', shortLabel: '法学公管',
    keywords: ['法学', '知识产权', '公共管理'],
    learn: '偏规则理解、阅读写作、表达和长期考试路径。',
    confirm: ['是否接受大量阅读、背记、写材料、表达和岗位竞争。'],
    majors: ['法学', '知识产权', '公共事业管理']
  },
  teacher_edu: {
    label: '师范 / 教育支持', shortLabel: '师范教育',
    keywords: ['师范', '教育技术', '小学教育'],
    learn: '偏讲解、表达、教育场景和教师资格路径。',
    confirm: ['是否接受讲题表达、课堂沟通、资格考试和地区岗位差异。'],
    majors: ['师范类', '教育技术学', '小学教育']
  },
  design_media: {
    label: '设计 / 数字媒体 / 工业设计', shortLabel: '设计媒体',
    keywords: ['数字媒体', '工业设计', '产品设计'],
    learn: '偏作品、软件工具、审美表达和反复修改。',
    confirm: ['是否接受作品训练、设计软件、审美表达和反复改稿。'],
    majors: ['数字媒体技术', '工业设计', '产品设计']
  }
};

export const DEFAULT_EXPLORE_DIRECTIONS = ['computer_data','electronic_comm','electrical_auto','finance_audit','medical_pharm','teacher_edu'];

export const FAMILY_CONSTRAINT_NOTES = {
  local_job: '家庭更看重省内就业，后续要结合城市、行业岗位、实习机会和辽宁省内真实需求核验。',
  low_cost: '家庭更看重费用可控，中外合作、高收费、民办和特殊收费项目需要逐条确认。',
  stable_path: '家庭更看重路径清楚，不能直接等同于某个专业方向，仍要看岗位、地区和资格要求。',
  public_sector: '家庭看重考公考编，需要后续核验岗位专业限制和地区竞争，不应直接推成法学或师范。',
  tech_job: '家庭看重技术就业，后续要看课程强度、实习资源和孩子是否接受持续学习。',
  body_limit: '家庭希望避开身体条件限制明显方向，后续必须逐条核验体检要求和招生章程。',
  high_fee_ok: '家庭能接受较高学费，仍要核验中外合作、校区、培养模式和实际费用。'
};

export const CONFIRM_NOTES = {
  reject_coding: '孩子不接受长时间写代码，计算机、软件、数据等方向需要先看清学习方式。',
  reject_math_physics: '孩子不接受较多数学和物理，电气、自动化、机械、电子信息等需要提前确认课程强度。',
  reject_lab: '孩子不接受实验或化学/生物环境，药学、材料、食品、生物、医技等方向需要提前确认。',
  reject_memory: '孩子不接受大量背记、阅读和写材料，法学、医学、师范、部分管理类方向需要提前确认。',
  reject_drawing: '孩子不接受画图、制图或建模，机械、建筑、设计等方向需要提前确认。',
  reject_communication: '孩子不接受频繁沟通、讲解或服务，师范、照护、服务、管理类场景需要提前确认。',
  reject_medical_scene: '孩子不接受医院、康复、护理或药品相关场景，医学、药学、护理、康复等方向需要提前确认。',
  reject_site: '孩子不接受工地、设备、户外或现场环境，机械、电气、土木、交通等方向需要提前确认。'
};

export const QUESTION_SECTIONS = [
  {
    key: 'source', stepTitle: '谁在填写', title: '先确认谁在填写', desc: '尽量让孩子自己选一次，家长再补一次。两次不同不是坏事，说明需要继续讨论。',
    questions: [{ key: 'respondent', type: 'single', kind: 'meta', title: '这次主要是谁在选？', options: [
      { id: 'child', label: '孩子自己选', tags: ['respondent_child'] },
      { id: 'parent', label: '家长观察选', tags: ['respondent_parent'] },
      { id: 'family', label: '家里一起讨论选', tags: ['respondent_family'] }
    ]}]
  },
  {
    key: 'exposure_behavior', stepTitle: '接触和投入', title: '孩子接触过什么、愿意投入什么', desc: '这里看行为线索，不等于专业结论。没接触过，不代表要排除。',
    questions: [
      { key: 'exposure', type: 'multi', kind: 'exposure', title: '孩子真实接触过什么？', options: [
        { id: 'coding', label: '写过简单代码 / 做过网页', dirs: { computer_data: 2 } },
        { id: 'data_table', label: '经常处理表格、数据、统计', dirs: { computer_data: 1, finance_audit: 2 } },
        { id: 'device', label: '拆装、修东西、看设备原理', dirs: { machinery_smart: 2, electrical_auto: 1 } },
        { id: 'circuit', label: '电路、维修、自动化设备', dirs: { electrical_auto: 2, electronic_comm: 1 } },
        { id: 'design_tool', label: '绘图、建模、设计软件', dirs: { design_media: 2, civil_project: 1 } },
        { id: 'medical_health', label: '医学、药品、健康类内容', dirs: { medical_pharm: 2, rehab_care: 1 } },
        { id: 'law_rule', label: '法律、社会、规则类内容', dirs: { law_public: 2 } },
        { id: 'teach', label: '愿意讲题、表达、带别人学习', dirs: { teacher_edu: 2 } },
        { id: 'business', label: '商业、成本、账目、经营内容', dirs: { finance_audit: 2 } },
        { id: 'little_exposure', label: '目前接触很少，看不出来', tags: ['low_exposure'] }
      ]},
      { key: 'behavior', type: 'multi', kind: 'behavior', title: '孩子愿意花时间做哪些事？', options: [
        { id: 'research_compare', label: '查资料、比较信息', dirs: { law_public: 1, finance_audit: 1, computer_data: 1 } },
        { id: 'debug', label: '反复调试、解决问题', dirs: { computer_data: 2, electrical_auto: 1, electronic_comm: 1 } },
        { id: 'detail_check', label: '细致核对，不怕麻烦', dirs: { finance_audit: 2, medical_pharm: 1 } },
        { id: 'communication', label: '沟通、解释、服务别人', dirs: { teacher_edu: 2, rehab_care: 1 } },
        { id: 'experiment_record', label: '实验、记录、观察', dirs: { material_bio_food: 2, medical_pharm: 1 } },
        { id: 'drawing_plan', label: '画图、建模、做方案', dirs: { design_media: 2, civil_project: 1, machinery_smart: 1 } },
        { id: 'rule_write', label: '学规则、背概念、写材料', dirs: { law_public: 2, teacher_edu: 1 } },
        { id: 'site_device', label: '现场、设备、工程环境', dirs: { electrical_auto: 1, machinery_smart: 2, civil_project: 1 } },
        { id: 'unclear_behavior', label: '暂时说不清', tags: ['unclear'] }
      ]}
    ]
  },
  {
    key: 'reject', stepTitle: '先确认风险', title: '孩子明确不接受什么', desc: '排斥项不是直接排除，而是进入“需要先确认”。',
    questions: [{ key: 'reject', type: 'multi', kind: 'reject', title: '哪些内容孩子明确不太能接受？', options: [
      { id: 'coding', label: '长时间写代码 / 调试', tags: ['reject_coding'] },
      { id: 'math_physics', label: '较多数学和物理', tags: ['reject_math_physics'] },
      { id: 'lab', label: '实验、化学、生物环境', tags: ['reject_lab'] },
      { id: 'memory', label: '大量背记、阅读、写材料', tags: ['reject_memory'] },
      { id: 'communication', label: '频繁沟通、讲解、服务', tags: ['reject_communication'] },
      { id: 'drawing', label: '画图、制图、建模', tags: ['reject_drawing'] },
      { id: 'medical_scene', label: '医院、康复、护理、药品场景', tags: ['reject_medical_scene'] },
      { id: 'site', label: '工地、设备、户外、现场环境', tags: ['reject_site'] },
      { id: 'no_obvious', label: '没有明显不能接受', tags: ['no_reject'] }
    ]}]
  },
  {
    key: 'family', stepTitle: '家庭约束', title: '家庭必须考虑什么', desc: '家庭诉求只作为约束和核验提醒，不直接变成孩子兴趣。',
    questions: [{ key: 'family', type: 'multi', kind: 'family', title: '家庭层面最需要考虑什么？', options: [
      { id: 'local_job', label: '省内就业更重要', tags: ['local_job'] },
      { id: 'low_cost', label: '费用压力别太大', tags: ['low_cost'] },
      { id: 'stable_path', label: '未来路径相对清楚', tags: ['stable_path'] },
      { id: 'tech_job', label: '更看重技术就业', tags: ['tech_job'] },
      { id: 'public_sector', label: '更看重考公 / 考编可能性', tags: ['public_sector'] },
      { id: 'high_fee_ok', label: '能接受中外合作 / 较高学费', tags: ['high_fee_ok'] },
      { id: 'body_limit', label: '希望避开身体条件限制明显方向', tags: ['body_limit'] },
      { id: 'no_family_limit', label: '目前家庭没有明确限制', tags: ['no_family_limit'] }
    ]}]
  }
];
