export const DIRECTION_EXPLORER_STORAGE_KEY = 'lnRank.directionExplorer.v1';

export const DIRECTION_GROUPS = {
  computer_data: {
    label: '计算机 / 数据',
    shortLabel: '计算机数据',
    keywords: ['计算机', '软件', '网络', '数据', '信息管理'],
    confirm: ['如果继续看计算机或数据方向，建议确认孩子是否接受长期写代码、调试和数学逻辑训练。']
  },
  electrical_auto: {
    label: '电气 / 自动化',
    shortLabel: '电气自动化',
    keywords: ['电气', '自动化', '测控', '智能电网', '电子信息'],
    confirm: ['如果继续看电气或自动化方向，建议确认孩子是否接受电路、物理、控制类课程和项目调试。']
  },
  machinery_smart: {
    label: '机械 / 智能制造',
    shortLabel: '机械制造',
    keywords: ['机械', '智能制造', '车辆', '工业工程', '机器人工程'],
    confirm: ['如果继续看机械或智能制造方向，建议确认孩子是否接受工程制图、机械原理和设备现场。']
  },
  experiment_material: {
    label: '实验 / 材料 / 食品',
    shortLabel: '实验材料',
    keywords: ['材料', '食品', '化学', '生物工程', '药学'],
    confirm: ['如果继续看实验、材料或食品方向，建议确认孩子是否接受实验课程、长期观察和安全规范。']
  },
  medical_applied: {
    label: '医学技术 / 药学',
    shortLabel: '医学药学',
    keywords: ['医学检验', '医学影像', '康复治疗', '药学', '医学技术'],
    confirm: ['如果继续看医学技术或药学方向，建议确认孩子是否接受实验、医学基础课和岗位场景。']
  },
  finance_manage: {
    label: '会计 / 审计 / 管理',
    shortLabel: '财经管理',
    keywords: ['会计', '审计', '财务管理', '经济', '管理科学'],
    confirm: ['如果继续看财经管理方向，建议确认孩子是否接受表格、数据、规则和长期细致核对。']
  },
  teacher_law_public: {
    label: '师范 / 法学 / 公共方向',
    shortLabel: '师范法学',
    keywords: ['师范', '教育技术', '法学', '知识产权', '公共管理'],
    confirm: ['如果继续看师范、法学或公共方向，建议确认孩子是否接受讲题、表达、背记和长期规则学习。']
  },
  design_media: {
    label: '设计 / 数字媒体',
    shortLabel: '设计媒体',
    keywords: ['数字媒体', '工业设计', '产品设计', '建筑', '城乡规划'],
    confirm: ['如果继续看设计或数字媒体方向，建议确认孩子是否接受作品、软件工具、审美表达和反复修改。']
  },
  care_service: {
    label: '照护 / 康复 / 服务沟通',
    shortLabel: '照护沟通',
    keywords: ['护理', '康复治疗', '公共事业管理', '社会工作', '健康服务'],
    confirm: ['如果继续看照护、康复或服务沟通方向，建议确认孩子是否接受真实服务场景、沟通压力和长期细心工作。']
  },
  logistics_project: {
    label: '项目 / 物流 / 工程管理',
    shortLabel: '项目管理',
    keywords: ['工程管理', '物流管理', '工业工程', '信息管理', '管理科学'],
    confirm: ['如果继续看项目、物流或工程管理方向，建议确认孩子是否接受协调、计划、现场信息和持续跟进。']
  }
};

export const DEFAULT_EXPLORE_DIRECTIONS = ['computer_data', 'electrical_auto', 'medical_applied', 'finance_manage', 'teacher_law_public', 'experiment_material'];

export const CONFIRM_NOTES = {
  reject_coding: '孩子明确不想长时间写代码，计算机、软件、数据等方向需要先看清学习方式。',
  reject_physics: '孩子明确不太接受数学物理很多的方向，电气、自动化、机械、电子信息等需要提前确认课程强度。',
  reject_lab: '孩子明确不太接受实验，药学、材料、食品、生物、医学技术等方向需要提前确认。',
  reject_memory: '孩子明确不太接受大量背记，法学、医学、师范、部分管理类方向需要提前确认。',
  reject_drawing: '孩子明确不太接受长期画图或制图，机械、建筑、设计等方向需要提前确认。',
  reject_communication: '孩子明确不太接受经常和陌生人沟通，师范、服务、管理、营销类场景需要提前确认。',
  reject_site: '孩子明确不太接受工厂、设备、户外或现场环境，机械、电气、土木、交通等方向需要提前确认。',
  reject_medical_long: '孩子明确不太接受医学类长期学习，医学、药学、护理、康复等方向需要提前确认。',
  low_cost: '家庭更看重费用可控，中外合作、高收费、民办和特殊收费项目需要逐条确认。',
  local_job: '家庭更看重省内就业，后续还要结合城市、行业岗位和实习机会再确认。'
};

export const QUESTION_SECTIONS = [
  {
    title: '先看孩子接触过什么',
    desc: '没接触过，不等于不适合。先把孩子真实见过、做过的事情分出来。',
    questions: [
      {
        key: 'interest',
        title: '孩子平时更容易投入哪类事情？',
        type: 'multi',
        options: [
          { id: 'fix_model', label: '拆装、修理、做模型', dirs: { machinery_smart: 3, electrical_auto: 1 } },
          { id: 'circuit_device', label: '接电路、调设备、修电器', dirs: { electrical_auto: 3, machinery_smart: 1 } },
          { id: 'software_data', label: '电脑、软件、数据、游戏机制', dirs: { computer_data: 3, electrical_auto: 1 } },
          { id: 'experiment', label: '做实验、观察现象', dirs: { experiment_material: 3, medical_applied: 2 } },
          { id: 'visual', label: '画图、设计、视频、审美表达', dirs: { design_media: 3, computer_data: 1 } },
          { id: 'money_data', label: '算账、比较价格、看数据', dirs: { finance_manage: 3, computer_data: 1 } },
          { id: 'write_explain', label: '查资料、写东西、表达观点', dirs: { teacher_law_public: 3, finance_manage: 1 } },
          { id: 'organize_table', label: '整理信息、做计划、做表格', dirs: { finance_manage: 2, computer_data: 2, logistics_project: 2 } },
          { id: 'teach_help', label: '讲题、解释问题、辅导别人', dirs: { teacher_law_public: 3, computer_data: 1 } },
          { id: 'care_understand', label: '照顾人、理解人、沟通协调', dirs: { care_service: 3, medical_applied: 1, teacher_law_public: 1 } },
          { id: 'organize_people', label: '组织活动、协调同学', dirs: { logistics_project: 3, teacher_law_public: 1, finance_manage: 1 } },
          { id: 'not_clear', label: '暂时看不出来', tags: ['unclear'] }
        ]
      },
      {
        key: 'exposure',
        title: '这些方向孩子有没有接触过？',
        type: 'multi',
        options: [
          { id: 'coding', label: '编程 / 做网页 / 装系统', dirs: { computer_data: 2 } },
          { id: 'circuit', label: '电路 / 维修 / 自动化设备', dirs: { electrical_auto: 2 } },
          { id: 'machine', label: '机械 / 模型 / 3D 打印', dirs: { machinery_smart: 2 } },
          { id: 'lab', label: '化学 / 生物 / 食品实验', dirs: { experiment_material: 2, medical_applied: 1 } },
          { id: 'finance', label: '财务 / 会计 / 经济常识', dirs: { finance_manage: 2 } },
          { id: 'law_public', label: '法律 / 公共事务 / 写材料', dirs: { teacher_law_public: 2 } },
          { id: 'medical', label: '医学 / 药学 / 护理 / 医技', dirs: { medical_applied: 2, care_service: 1 } },
          { id: 'education', label: '教育 / 讲题 / 辅导别人', dirs: { teacher_law_public: 2 } },
          { id: 'design_tool', label: '设计 / 视频 / 新媒体工具', dirs: { design_media: 2 } },
          { id: 'data_table', label: '数据表格 / 统计 / 信息整理', dirs: { computer_data: 1, finance_manage: 2, logistics_project: 1 } },
          { id: 'little_exposure', label: '大多数都没接触过', tags: ['low_exposure'] }
        ]
      }
    ]
  },
  {
    title: '再看哪些需要提前确认',
    desc: '明确不想接受的内容，才作为提醒；没见过的方向不要直接排除。',
    questions: [
      {
        key: 'reject',
        title: '孩子明确不太能接受什么？',
        type: 'multi',
        options: [
          { id: 'coding', label: '长时间写代码', tags: ['reject_coding'] },
          { id: 'physics', label: '数学物理很多', tags: ['reject_physics'] },
          { id: 'lab', label: '化学 / 生物实验', tags: ['reject_lab'] },
          { id: 'memory', label: '大量背记', tags: ['reject_memory'] },
          { id: 'drawing', label: '长期画图 / 制图', tags: ['reject_drawing'] },
          { id: 'communication', label: '经常和陌生人沟通', tags: ['reject_communication'] },
          { id: 'site', label: '工厂、设备、现场环境', tags: ['reject_site'] },
          { id: 'medical_long', label: '医学类长期学习', tags: ['reject_medical_long'] },
          { id: 'travel_shift', label: '出差、轮班、户外环境', tags: ['reject_site'] },
          { id: 'no_obvious', label: '暂时没有明显反感', tags: ['no_reject'] }
        ]
      },
      {
        key: 'family',
        title: '家庭更希望专业解决什么问题？',
        type: 'multi',
        options: [
          { id: 'local', label: '省内就业更重要', dirs: { electrical_auto: 1, medical_applied: 1, finance_manage: 1, teacher_law_public: 1 }, tags: ['local_job'] },
          { id: 'stable', label: '工作稳定更重要', dirs: { electrical_auto: 1, medical_applied: 1, teacher_law_public: 1, finance_manage: 1 } },
          { id: 'tech', label: '技术就业更重要', dirs: { computer_data: 2, electrical_auto: 2, machinery_smart: 1, medical_applied: 1 } },
          { id: 'postgraduate', label: '读研提升更重要', dirs: { computer_data: 1, medical_applied: 1, experiment_material: 1, teacher_law_public: 1 } },
          { id: 'low_cost', label: '学费别太高', tags: ['low_cost'] },
          { id: 'city', label: '城市和生活便利更重要', dirs: { finance_manage: 1, computer_data: 1, teacher_law_public: 1 } },
          { id: 'public_sector', label: '考公考编机会更重要', dirs: { teacher_law_public: 2, finance_manage: 1, medical_applied: 1 } },
          { id: 'school_first', label: '先保证有学上，再慢慢选方向', tags: ['wide_first'] }
        ]
      }
    ]
  },
  {
    title: '最后看现在怎么用',
    desc: '这里不替孩子定专业，最后还是回到分数附近的真实专业。',
    questions: [
      {
        key: 'scene',
        title: '孩子未来更能接受哪类场景？',
        type: 'multi',
        options: [
          { id: 'office', label: '办公室', dirs: { finance_manage: 1, computer_data: 1, teacher_law_public: 1 } },
          { id: 'lab', label: '实验室', dirs: { experiment_material: 2, medical_applied: 2 } },
          { id: 'site', label: '企业现场 / 设备现场', dirs: { electrical_auto: 2, machinery_smart: 2, logistics_project: 1 } },
          { id: 'school', label: '学校 / 教育场景', dirs: { teacher_law_public: 2 } },
          { id: 'hospital', label: '医院 / 医疗相关场景', dirs: { medical_applied: 2, care_service: 1 } },
          { id: 'project', label: '项目交付 / 经常解决问题', dirs: { computer_data: 1, electrical_auto: 1, logistics_project: 2 } },
          { id: 'service', label: '和人沟通服务', dirs: { care_service: 2, teacher_law_public: 1, logistics_project: 1 } },
          { id: 'data_doc', label: '数据、表格、资料处理', dirs: { computer_data: 1, finance_manage: 2, logistics_project: 1 } },
          { id: 'content_design', label: '设计、内容、表达场景', dirs: { design_media: 2, teacher_law_public: 1 } },
          { id: 'no_idea', label: '还没有概念', tags: ['low_exposure'] }
        ]
      },
      {
        key: 'goal',
        title: '现在最需要哪种帮助？',
        type: 'multi',
        options: [
          { id: 'near', label: '想先看主要参考方向', tags: ['goal_near'] },
          { id: 'steady', label: '想补一些稳妥补充方向', tags: ['goal_steady'] },
          { id: 'upper', label: '想少量看看稍高目标', tags: ['goal_upper'] },
          { id: 'exclude', label: '想先排除明显不合适的', tags: ['goal_confirm'] },
          { id: 'explore', label: '想给孩子找几个方向先了解', tags: ['low_exposure', 'goal_explore'] }
        ]
      }
    ]
  }
];
