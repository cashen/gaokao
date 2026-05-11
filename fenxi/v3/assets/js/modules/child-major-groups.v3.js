(function () {
  'use strict';
  var groups = [
    {
      id: 'computer_ai', name: '计算机与人工智能', weight: 0.92,
      desc: '偏软件、算法、数据、网络安全、人工智能方向。',
      fit: '适合逻辑能力强、愿意长期学习技术的孩子。',
      examples: ['计算机科学与技术', '软件工程', '人工智能', '数据科学与大数据技术', '网络空间安全']
    },
    {
      id: 'electronic_comm', name: '电子信息与通信', weight: 0.9,
      desc: '偏硬件、通信、芯片、信号、嵌入式方向。',
      fit: '适合数学物理基础较好，能接受工科训练的孩子。',
      examples: ['电子信息工程', '通信工程', '微电子科学与工程', '集成电路设计与集成系统', '电子科学与技术']
    },
    {
      id: 'electric_energy', name: '电气能源与自动化', weight: 0.88,
      desc: '偏电力系统、自动控制、能源动力、新能源方向。',
      fit: '适合看重稳定就业、行业路径清晰的家庭。',
      examples: ['电气工程及其自动化', '自动化', '智能电网信息工程', '能源与动力工程', '新能源科学与工程', '储能科学与工程']
    },
    {
      id: 'mechanical_instrument', name: '机械、车辆与智能制造', weight: 0.8,
      desc: '偏装备制造、车辆、仪器、机器人、工业现场方向。',
      fit: '适合动手能力强、能接受传统工科打底的孩子。',
      examples: ['机械设计制造及其自动化', '机械电子工程', '车辆工程', '测控技术与仪器', '智能制造工程']
    },
    {
      id: 'medicine_health', name: '医学、药学与健康', weight: 0.82,
      desc: '偏临床、药学、医学技术、健康服务方向。',
      fit: '适合愿意长期学习、能接受培养周期较长的孩子。',
      examples: ['临床医学', '口腔医学', '药学', '医学检验技术', '医学影像技术', '护理学']
    },
    {
      id: 'agri_animal_food', name: '农学、动物医学与食品', weight: 0.78,
      desc: '偏动物医学、食品、生物育种、农业工程方向。',
      fit: '适合兴趣明确、能接受行业场景差异的孩子。',
      examples: ['动物医学', '动物科学', '食品科学与工程', '农学', '园艺', '农业机械化及其自动化']
    },
    {
      id: 'finance_manage', name: '经济、管理与金融', weight: 0.68,
      desc: '偏金融、会计、工商管理、工程管理和数据管理方向。',
      fit: '适合表达和综合能力较好，也愿意面对竞争的孩子。',
      examples: ['金融学', '会计学', '财务管理', '工商管理', '大数据管理与应用', '工程造价']
    },
    {
      id: 'law_human_edu', name: '法学、人文与教育', weight: 0.66,
      desc: '偏法学、中文、外语、教育、公共管理方向。',
      fit: '适合阅读表达能力较好，愿意走考试或长期积累路线的孩子。',
      examples: ['法学', '汉语言文学', '英语', '思想政治教育', '小学教育', '公共事业管理']
    },
    {
      id: 'science_material', name: '理学基础与新材料', weight: 0.72,
      desc: '偏数学、物理、化学、材料、环境、生物等基础方向。',
      fit: '适合基础学科兴趣较强，可能继续读研深造的孩子。',
      examples: ['数学与应用数学', '应用物理学', '应用化学', '材料科学与工程', '环境工程', '生物科学']
    }
  ];
  function findGroup(id) { return groups.find(function (item) { return item.id === id; }); }
  function search(keyword) {
    var q = String(keyword || '').trim().toLowerCase();
    if (!q) return [];
    return groups.map(function (group) {
      var hits = group.examples.filter(function (major) { return major.toLowerCase().indexOf(q) !== -1 || major.indexOf(keyword) !== -1; });
      var groupHit = group.name.indexOf(keyword) !== -1 || group.desc.indexOf(keyword) !== -1;
      if (groupHit && hits.length === 0) hits = group.examples.slice(0, 3);
      return hits.length ? { group: group, majors: hits } : null;
    }).filter(Boolean);
  }
  window.LN_V3_CHILD_GROUPS = { all: groups, find: findGroup, search: search, maxGroups: 3 };
})();
