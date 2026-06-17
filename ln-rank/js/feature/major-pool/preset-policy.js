// v3.9.8.7 前端筛选预置词。与 functions/_lib/kb/major-filter-preset-kb.generated.js 保持同口径。
export const DEFAULT_KEYWORD_PRESETS = [
  {
    "label": "计算机",
    "type": "major_alias",
    "tone": "default",
    "badge": "",
    "intent": ""
  },
  {
    "label": "电气",
    "type": "major_alias",
    "tone": "default",
    "badge": "",
    "intent": ""
  },
  {
    "label": "自动化",
    "type": "major_alias",
    "tone": "default",
    "badge": "",
    "intent": ""
  },
  {
    "label": "机械",
    "type": "major_alias",
    "tone": "default",
    "badge": "",
    "intent": ""
  },
  {
    "label": "会计",
    "type": "major_alias",
    "tone": "default",
    "badge": "",
    "intent": ""
  },
  {
    "label": "医学",
    "type": "major_alias",
    "tone": "default",
    "badge": "",
    "intent": "医学大方向需区分医学核心、医学应用和医工交叉。"
  },
  {
    "label": "师范",
    "type": "major_alias",
    "tone": "default",
    "badge": "",
    "intent": ""
  },
  {
    "label": "法学",
    "type": "major_alias",
    "tone": "default",
    "badge": "",
    "intent": ""
  },
  {
    "label": "中外",
    "type": "project_attribute",
    "tone": "project",
    "badge": "项目",
    "intent": ""
  },
  {
    "label": "交通",
    "type": "major_alias",
    "tone": "default",
    "badge": "",
    "intent": ""
  }
];
export const MORE_KEYWORD_GROUPS = [
  {
    "title": "工科技术",
    "tone": "default",
    "hint": "方向入口，内部按2026专业目录与项目属性分流。",
    "words": [
      {
        "label": "电子"
      },
      {
        "label": "通信"
      },
      {
        "label": "软件"
      },
      {
        "label": "人工智能"
      },
      {
        "label": "材料"
      },
      {
        "label": "化工"
      },
      {
        "label": "环境"
      }
    ]
  },
  {
    "title": "生命食品",
    "tone": "default",
    "hint": "方向入口，内部按2026专业目录与项目属性分流。",
    "words": [
      {
        "label": "食品"
      },
      {
        "label": "动物医学"
      },
      {
        "label": "生物"
      },
      {
        "label": "水产"
      },
      {
        "label": "农学"
      },
      {
        "label": "园艺"
      }
    ]
  },
  {
    "title": "医学健康",
    "tone": "default",
    "hint": "方向入口，内部按2026专业目录与项目属性分流。",
    "words": [
      {
        "label": "临床"
      },
      {
        "label": "口腔"
      },
      {
        "label": "护理"
      },
      {
        "label": "药学"
      },
      {
        "label": "康复"
      },
      {
        "label": "影像"
      },
      {
        "label": "检验"
      }
    ]
  },
  {
    "title": "财经文法",
    "tone": "default",
    "hint": "方向入口，内部按2026专业目录与项目属性分流。",
    "words": [
      {
        "label": "金融"
      },
      {
        "label": "财务"
      },
      {
        "label": "审计"
      },
      {
        "label": "经济"
      },
      {
        "label": "管理"
      },
      {
        "label": "中文"
      },
      {
        "label": "新闻"
      },
      {
        "label": "外语"
      }
    ]
  },
  {
    "title": "行业项目",
    "tone": "default",
    "hint": "方向入口，内部按2026专业目录与项目属性分流。",
    "words": [
      {
        "label": "石油"
      },
      {
        "label": "铁道"
      },
      {
        "label": "航空"
      },
      {
        "label": "航天"
      },
      {
        "label": "电力"
      },
      {
        "label": "邮电"
      },
      {
        "label": "高收费",
        "type": "project_attribute",
        "tone": "project",
        "badge": "项目"
      }
    ]
  }
];
export const KEYWORD_PRESET_NOTE = '说明：方向词用于帮助搜索；“中外 / 高收费等”属于项目或招生属性，不是标准专业名。页面不按性别推荐专业，更多方向只是补充入口，仍可直接手动输入任何专业词。';
