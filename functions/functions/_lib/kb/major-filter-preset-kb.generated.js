export const MAJOR_FILTER_PRESET_KB = {
  "version": "v3986-major-filter-preset",
  "defaultPresets": [
    "计算机",
    "电气",
    "自动化",
    "机械",
    "会计",
    "医学",
    "师范",
    "法学",
    "中外",
    "交通"
  ],
  "groups": [
    {
      "title": "工科技术",
      "words": [
        "电子",
        "通信",
        "软件",
        "人工智能",
        "材料",
        "化工",
        "环境"
      ]
    },
    {
      "title": "生命食品",
      "words": [
        "食品",
        "动物医学",
        "生物",
        "水产",
        "农学",
        "园艺"
      ]
    },
    {
      "title": "医学健康",
      "words": [
        "临床",
        "口腔",
        "护理",
        "药学",
        "康复",
        "影像",
        "检验"
      ]
    },
    {
      "title": "财经文法",
      "words": [
        "金融",
        "财务",
        "审计",
        "经济",
        "管理",
        "中文",
        "新闻",
        "外语"
      ]
    },
    {
      "title": "行业项目",
      "words": [
        "石油",
        "铁道",
        "航空",
        "航天",
        "电力",
        "邮电",
        "高收费"
      ]
    }
  ],
  "tokens": {
    "计算机": {
      "type": "majorDirection",
      "directionId": "computer_ai_software",
      "categoryCodes": [
        "0809"
      ],
      "aliases": [
        "计算机",
        "软件",
        "网络",
        "数据科学",
        "大数据",
        "信息安全",
        "人工智能"
      ]
    },
    "电气": {
      "type": "majorDirection",
      "directionId": "electrical_energy",
      "categoryCodes": [
        "0806"
      ],
      "majorCodes": [
        "080601",
        "080602T",
        "080604T",
        "080607T",
        "080608TK"
      ],
      "aliases": [
        "电气",
        "电力",
        "电网",
        "智能电网"
      ],
      "excludeStrongMatch": [
        "石油工程",
        "油气储运工程",
        "采矿工程",
        "资源勘查工程"
      ]
    },
    "自动化": {
      "type": "majorDirection",
      "directionId": "electrical_energy",
      "categoryCodes": [
        "0808"
      ],
      "majorCodes": [
        "080801",
        "080803T",
        "080806T",
        "080807T"
      ],
      "aliases": [
        "自动化",
        "控制",
        "机器人",
        "工业智能"
      ],
      "excludeStrongMatch": [
        "机械设计制造及其自动化",
        "农业机械化及其自动化"
      ]
    },
    "机械": {
      "type": "majorDirection",
      "directionId": "mechanical_vehicle",
      "categoryCodes": [
        "0802"
      ],
      "aliases": [
        "机械",
        "车辆",
        "智能制造",
        "新能源汽车"
      ]
    },
    "会计": {
      "type": "majorDirection",
      "directionId": "finance_management",
      "majorCodes": [
        "120203K",
        "120204",
        "120207"
      ],
      "aliases": [
        "会计",
        "财务",
        "审计"
      ]
    },
    "医学": {
      "type": "majorDirection",
      "directionId": "medical_core",
      "categoryCodes": [
        "1002",
        "1003",
        "1005",
        "1006"
      ],
      "aliases": [
        "临床",
        "口腔",
        "中医",
        "麻醉",
        "医学影像学"
      ],
      "note": "医学大方向需区分医学核心、医学应用和医工交叉。"
    },
    "师范": {
      "type": "majorDirection",
      "directionId": "teacher_law_public",
      "aliases": [
        "师范",
        "教育",
        "小学教育",
        "学前教育",
        "思想政治教育"
      ]
    },
    "法学": {
      "type": "majorDirection",
      "directionId": "teacher_law_public",
      "categoryCodes": [
        "0301"
      ],
      "aliases": [
        "法学",
        "法律",
        "知识产权",
        "国际法"
      ]
    },
    "交通": {
      "type": "industryPath",
      "directionId": "civil_arch_transport",
      "categoryCodes": [
        "0818"
      ],
      "aliases": [
        "交通",
        "铁道",
        "轨道交通",
        "交通运输",
        "交通工程"
      ]
    },
    "食品": {
      "type": "majorDirection",
      "directionId": "agri_food_env",
      "categoryCodes": [
        "0827"
      ],
      "aliases": [
        "食品",
        "食品科学",
        "食品质量",
        "食品营养"
      ]
    },
    "动物医学": {
      "type": "majorDirection",
      "directionId": "agri_food_env",
      "categoryCodes": [
        "0904"
      ],
      "aliases": [
        "动物医学",
        "兽医",
        "动物药学",
        "动植物检疫"
      ],
      "note": "动物医学属于农学门类，不归医学核心。"
    },
    "园艺": {
      "type": "majorDirection",
      "directionId": "agri_food_env",
      "majorCodes": [
        "090102"
      ],
      "aliases": [
        "园艺"
      ],
      "excludeStrongMatch": [
        "园林",
        "风景园林"
      ]
    },
    "低空": {
      "type": "emergingDirection",
      "directionId": "civil_arch_transport",
      "majorCodes": [
        "020110TK",
        "140003TK",
        "083113TK"
      ],
      "aliases": [
        "低空",
        "低空经济",
        "低空技术"
      ],
      "note": "低空相关方向属于新目录或新兴方向，需核验招生计划、依托学院和就业路径。"
    },
    "中外": {
      "type": "projectAttribute",
      "projectId": "sinoForeign",
      "aliases": [
        "中外",
        "中外合作",
        "合作办学"
      ]
    },
    "高收费": {
      "type": "projectAttribute",
      "projectId": "highFee",
      "aliases": [
        "高收费",
        "较高收费"
      ]
    },
    "公费师范": {
      "type": "projectAttribute",
      "projectId": "publicTeacher",
      "aliases": [
        "公费师范",
        "优师专项"
      ]
    },
    "定向": {
      "type": "projectAttribute",
      "projectId": "targeted",
      "aliases": [
        "定向",
        "定向就业",
        "定向培养"
      ]
    }
  }
};
