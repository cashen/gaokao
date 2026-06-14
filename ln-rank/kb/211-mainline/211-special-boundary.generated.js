/* v3.9.33.14 211 院校专业背景字段化索引。由 all-211-school-background-kb-v0.1.md 转换。 */
export const ALL_211_SPECIAL_BOUNDARY = [
  {
    "id": "S113",
    "school": "国防科技大学",
    "normalizedName": "国防科技大学",
    "aliases": [
      "国防科技大学"
    ],
    "batch": "第7批：西北、西南、民族、边疆、军事类特殊处理",
    "province": "",
    "city": "",
    "is211": true,
    "isOrdinaryEntry": false,
    "isMilitarySpecial": true,
    "specialBoundary": "军事类院校涉及单独招生、体检、政审、培养管理和招生章程，本页不与普通本科招生混合判断。",
    "summaryForParent": "国防科技大学属于军队院校特殊口径。家庭复核时不能把它和普通高校同一套前台逻辑混写；需同时看生长军官本科学员、无军籍地方本科生、体检政审、招生省份和培养管理要求。",
    "evidenceSummary": "",
    "directions": [
      {
        "direction": "特殊院校或证据需单独口径",
        "displayLabel": "本校方向",
        "level": "primary",
        "majors": [
          "本批不直接列入普通本校方向"
        ],
        "evidenceText": "见本校相关与方向提醒",
        "reviewPoints": [
          "当年招生章程",
          "军队招生政策"
        ],
        "humanNote": "这个方向和学校公开学科背景存在对应关系，建议再看当年招生章程、军队招生政策。",
        "canTriggerFrontend": true
      },
      {
        "direction": "计算机 / 软件 / 信息安全方向",
        "displayLabel": "本校相关",
        "level": "secondary",
        "majors": [
          "计算机科学与技术",
          "软件工程",
          "网络空间安全"
        ],
        "evidenceText": "第二轮双一流和学校官网证据",
        "reviewPoints": [
          "招生类型",
          "体检政审",
          "培养管理"
        ],
        "humanNote": "这个方向和学校公开学科背景存在对应关系，建议再看招生类型、体检政审、培养管理。",
        "canTriggerFrontend": true
      },
      {
        "direction": "信息与通信工程",
        "displayLabel": "本校相关",
        "level": "secondary",
        "majors": [
          "通信工程",
          "电子信息类"
        ],
        "evidenceText": "第二轮双一流",
        "reviewPoints": [
          "招生类型",
          "军队培养要求"
        ],
        "humanNote": "这个方向和学校公开学科背景存在对应关系，建议再看招生类型、军队培养要求。",
        "canTriggerFrontend": true
      },
      {
        "direction": "航空宇航科学与技术",
        "displayLabel": "本校相关",
        "level": "secondary",
        "majors": [
          "航空航天类"
        ],
        "evidenceText": "第二轮双一流",
        "reviewPoints": [
          "招生类型",
          "身体条件",
          "培养方向"
        ],
        "humanNote": "这个方向和学校公开学科背景存在对应关系，建议再看招生类型、身体条件、培养方向。",
        "canTriggerFrontend": true
      },
      {
        "direction": "管理科学与工程",
        "displayLabel": "本校相关",
        "level": "secondary",
        "majors": [
          "管理科学与工程"
        ],
        "evidenceText": "第二轮双一流",
        "reviewPoints": [
          "是否为军队管理场景"
        ],
        "humanNote": "这个方向和学校公开学科背景存在对应关系，建议再看是否为军队管理场景。",
        "canTriggerFrontend": true
      },
      {
        "direction": "必须先区分生长军官本科学员与无军籍地方本科生",
        "displayLabel": "方向提醒",
        "level": "trajectory",
        "majors": [
          "军队院校招生类型"
        ],
        "evidenceText": "阳光高考军队院校专题、学校招生章程",
        "reviewPoints": [
          "培养方案",
          "招生章程",
          "课程方向"
        ],
        "humanNote": "这个方向和学校公开学科背景存在对应关系，建议再看培养方案、招生章程、课程方向。",
        "canTriggerFrontend": true
      },
      {
        "direction": "不进入普通院校“本校方向”自动触发，只在特殊院校详情页显示",
        "displayLabel": "方向提醒",
        "level": "trajectory",
        "majors": [
          "普通前台显示"
        ],
        "evidenceText": "第 8 批单独审计",
        "reviewPoints": [
          "培养方案",
          "招生章程",
          "课程方向"
        ],
        "humanNote": "这个方向和学校公开学科背景存在对应关系，建议再看培养方案、招生章程、课程方向。",
        "canTriggerFrontend": true
      }
    ],
    "primaryDirections": [
      {
        "direction": "特殊院校或证据需单独口径",
        "displayLabel": "本校方向",
        "level": "primary",
        "majors": [
          "本批不直接列入普通本校方向"
        ],
        "evidenceText": "见本校相关与方向提醒",
        "reviewPoints": [
          "当年招生章程",
          "军队招生政策"
        ],
        "humanNote": "这个方向和学校公开学科背景存在对应关系，建议再看当年招生章程、军队招生政策。",
        "canTriggerFrontend": true
      }
    ],
    "secondaryDirections": [
      {
        "direction": "计算机 / 软件 / 信息安全方向",
        "displayLabel": "本校相关",
        "level": "secondary",
        "majors": [
          "计算机科学与技术",
          "软件工程",
          "网络空间安全"
        ],
        "evidenceText": "第二轮双一流和学校官网证据",
        "reviewPoints": [
          "招生类型",
          "体检政审",
          "培养管理"
        ],
        "humanNote": "这个方向和学校公开学科背景存在对应关系，建议再看招生类型、体检政审、培养管理。",
        "canTriggerFrontend": true
      },
      {
        "direction": "信息与通信工程",
        "displayLabel": "本校相关",
        "level": "secondary",
        "majors": [
          "通信工程",
          "电子信息类"
        ],
        "evidenceText": "第二轮双一流",
        "reviewPoints": [
          "招生类型",
          "军队培养要求"
        ],
        "humanNote": "这个方向和学校公开学科背景存在对应关系，建议再看招生类型、军队培养要求。",
        "canTriggerFrontend": true
      },
      {
        "direction": "航空宇航科学与技术",
        "displayLabel": "本校相关",
        "level": "secondary",
        "majors": [
          "航空航天类"
        ],
        "evidenceText": "第二轮双一流",
        "reviewPoints": [
          "招生类型",
          "身体条件",
          "培养方向"
        ],
        "humanNote": "这个方向和学校公开学科背景存在对应关系，建议再看招生类型、身体条件、培养方向。",
        "canTriggerFrontend": true
      },
      {
        "direction": "管理科学与工程",
        "displayLabel": "本校相关",
        "level": "secondary",
        "majors": [
          "管理科学与工程"
        ],
        "evidenceText": "第二轮双一流",
        "reviewPoints": [
          "是否为军队管理场景"
        ],
        "humanNote": "这个方向和学校公开学科背景存在对应关系，建议再看是否为军队管理场景。",
        "canTriggerFrontend": true
      }
    ],
    "trajectoryWarnings": [
      {
        "direction": "必须先区分生长军官本科学员与无军籍地方本科生",
        "displayLabel": "方向提醒",
        "level": "trajectory",
        "majors": [
          "军队院校招生类型"
        ],
        "evidenceText": "阳光高考军队院校专题、学校招生章程",
        "reviewPoints": [
          "培养方案",
          "招生章程",
          "课程方向"
        ],
        "humanNote": "这个方向和学校公开学科背景存在对应关系，建议再看培养方案、招生章程、课程方向。",
        "canTriggerFrontend": true
      },
      {
        "direction": "不进入普通院校“本校方向”自动触发，只在特殊院校详情页显示",
        "displayLabel": "方向提醒",
        "level": "trajectory",
        "majors": [
          "普通前台显示"
        ],
        "evidenceText": "第 8 批单独审计",
        "reviewPoints": [
          "培养方案",
          "招生章程",
          "课程方向"
        ],
        "humanNote": "这个方向和学校公开学科背景存在对应关系，建议再看培养方案、招生章程、课程方向。",
        "canTriggerFrontend": true
      }
    ],
    "pendingReview": [
      "2026 年各省招生计划、选科、体检政审要求需以当年官方招生章程为准。",
      "军队院校不参与普通高校网页同屏比较。",
      "--",
      "--"
    ],
    "sourceIds": [
      "G001",
      "G002",
      "G003",
      "G004"
    ]
  },
  {
    "id": "S114",
    "school": "海军军医大学 / 第二军医大学",
    "normalizedName": "海军军医大学 / 第二军医大学",
    "aliases": [
      "海军军医大学 / 第二军医大学"
    ],
    "batch": "第7批：西北、西南、民族、边疆、军事类特殊处理",
    "province": "",
    "city": "",
    "is211": true,
    "isOrdinaryEntry": false,
    "isMilitarySpecial": true,
    "specialBoundary": "军事类院校涉及单独招生、体检、政审、培养管理和招生章程，本页不与普通本科招生混合判断。",
    "summaryForParent": "海军军医大学是军事医学类特殊院校，对外保留第二军医大学校名。家庭复核时必须先看招生身份、体检政审、是否军籍、专业学制和军队培养要求，不能和普通医科大学混写。",
    "evidenceSummary": "",
    "directions": [
      {
        "direction": "特殊院校或证据需单独口径",
        "displayLabel": "本校方向",
        "level": "primary",
        "majors": [
          "本批不直接列入普通本校方向"
        ],
        "evidenceText": "见本校相关与方向提醒",
        "reviewPoints": [
          "当年招生章程",
          "军队招生政策"
        ],
        "humanNote": "这个方向和学校公开学科背景存在对应关系，建议再看当年招生章程、军队招生政策。",
        "canTriggerFrontend": true
      },
      {
        "direction": "基础医学",
        "displayLabel": "本校相关",
        "level": "secondary",
        "majors": [
          "基础医学"
        ],
        "evidenceText": "第二轮双一流",
        "reviewPoints": [
          "是否军籍",
          "学制",
          "科研路径"
        ],
        "humanNote": "这个方向和学校公开学科背景存在对应关系，建议再看是否军籍、学制、科研路径。",
        "canTriggerFrontend": true
      },
      {
        "direction": "军事医学与临床医学相关",
        "displayLabel": "本校相关",
        "level": "secondary",
        "majors": [
          "临床医学",
          "麻醉学",
          "医学影像等医学类"
        ],
        "evidenceText": "学校医学类办学背景",
        "reviewPoints": [
          "体检政审",
          "临床培养",
          "军队分配管理"
        ],
        "humanNote": "这个方向和学校公开学科背景存在对应关系，建议再看体检政审、临床培养、军队分配管理。",
        "canTriggerFrontend": true
      },
      {
        "direction": "军事医学支撑方向",
        "displayLabel": "本校相关",
        "level": "secondary",
        "majors": [
          "药学",
          "公共卫生与预防医学",
          "护理"
        ],
        "evidenceText": "学校博士点和医学背景",
        "reviewPoints": [
          "执业资格",
          "岗位场景"
        ],
        "humanNote": "这个方向和学校公开学科背景存在对应关系，建议再看执业资格、岗位场景。",
        "canTriggerFrontend": true
      },
      {
        "direction": "前台必须显示改名与保留校名口径，不混用为两所学校",
        "displayLabel": "方向提醒",
        "level": "trajectory",
        "majors": [
          "第二军医大学",
          "海军军医大学名称"
        ],
        "evidenceText": "学校官网、招生章程",
        "reviewPoints": [
          "培养方案",
          "招生章程",
          "课程方向"
        ],
        "humanNote": "这个方向和学校公开学科背景存在对应关系，建议再看培养方案、招生章程、课程方向。",
        "canTriggerFrontend": true
      },
      {
        "direction": "不进入普通院校列表自动触发",
        "displayLabel": "方向提醒",
        "level": "trajectory",
        "majors": [
          "普通招生判断"
        ],
        "evidenceText": "第 8 批单独审计",
        "reviewPoints": [
          "培养方案",
          "招生章程",
          "课程方向"
        ],
        "humanNote": "这个方向和学校公开学科背景存在对应关系，建议再看培养方案、招生章程、课程方向。",
        "canTriggerFrontend": true
      }
    ],
    "primaryDirections": [
      {
        "direction": "特殊院校或证据需单独口径",
        "displayLabel": "本校方向",
        "level": "primary",
        "majors": [
          "本批不直接列入普通本校方向"
        ],
        "evidenceText": "见本校相关与方向提醒",
        "reviewPoints": [
          "当年招生章程",
          "军队招生政策"
        ],
        "humanNote": "这个方向和学校公开学科背景存在对应关系，建议再看当年招生章程、军队招生政策。",
        "canTriggerFrontend": true
      }
    ],
    "secondaryDirections": [
      {
        "direction": "基础医学",
        "displayLabel": "本校相关",
        "level": "secondary",
        "majors": [
          "基础医学"
        ],
        "evidenceText": "第二轮双一流",
        "reviewPoints": [
          "是否军籍",
          "学制",
          "科研路径"
        ],
        "humanNote": "这个方向和学校公开学科背景存在对应关系，建议再看是否军籍、学制、科研路径。",
        "canTriggerFrontend": true
      },
      {
        "direction": "军事医学与临床医学相关",
        "displayLabel": "本校相关",
        "level": "secondary",
        "majors": [
          "临床医学",
          "麻醉学",
          "医学影像等医学类"
        ],
        "evidenceText": "学校医学类办学背景",
        "reviewPoints": [
          "体检政审",
          "临床培养",
          "军队分配管理"
        ],
        "humanNote": "这个方向和学校公开学科背景存在对应关系，建议再看体检政审、临床培养、军队分配管理。",
        "canTriggerFrontend": true
      },
      {
        "direction": "军事医学支撑方向",
        "displayLabel": "本校相关",
        "level": "secondary",
        "majors": [
          "药学",
          "公共卫生与预防医学",
          "护理"
        ],
        "evidenceText": "学校博士点和医学背景",
        "reviewPoints": [
          "执业资格",
          "岗位场景"
        ],
        "humanNote": "这个方向和学校公开学科背景存在对应关系，建议再看执业资格、岗位场景。",
        "canTriggerFrontend": true
      }
    ],
    "trajectoryWarnings": [
      {
        "direction": "前台必须显示改名与保留校名口径，不混用为两所学校",
        "displayLabel": "方向提醒",
        "level": "trajectory",
        "majors": [
          "第二军医大学",
          "海军军医大学名称"
        ],
        "evidenceText": "学校官网、招生章程",
        "reviewPoints": [
          "培养方案",
          "招生章程",
          "课程方向"
        ],
        "humanNote": "这个方向和学校公开学科背景存在对应关系，建议再看培养方案、招生章程、课程方向。",
        "canTriggerFrontend": true
      },
      {
        "direction": "不进入普通院校列表自动触发",
        "displayLabel": "方向提醒",
        "level": "trajectory",
        "majors": [
          "普通招生判断"
        ],
        "evidenceText": "第 8 批单独审计",
        "reviewPoints": [
          "培养方案",
          "招生章程",
          "课程方向"
        ],
        "humanNote": "这个方向和学校公开学科背景存在对应关系，建议再看培养方案、招生章程、课程方向。",
        "canTriggerFrontend": true
      }
    ],
    "pendingReview": [
      "本科招生专业、军籍/无军籍计划、体检政审要求需以当年学校和军队招生政策为准。",
      "第四轮学科评估可作背景，但军事学和军队院校口径需单独核验。",
      "--",
      "--"
    ],
    "sourceIds": [
      "G001",
      "G002",
      "G003",
      "G004"
    ]
  },
  {
    "id": "S115",
    "school": "空军军医大学 / 第四军医大学",
    "normalizedName": "空军军医大学 / 第四军医大学",
    "aliases": [
      "空军军医大学 / 第四军医大学"
    ],
    "batch": "第7批：西北、西南、民族、边疆、军事类特殊处理",
    "province": "",
    "city": "",
    "is211": true,
    "isOrdinaryEntry": false,
    "isMilitarySpecial": true,
    "specialBoundary": "军事类院校涉及单独招生、体检、政审、培养管理和招生章程，本页不与普通本科招生混合判断。",
    "summaryForParent": "空军军医大学是军事医学类特殊院校，对外可称第四军医大学。家庭复核时必须先看招生身份、体检政审、学制、专业计划和军队培养要求，不能和普通医科大学混写。",
    "evidenceSummary": "",
    "directions": [
      {
        "direction": "特殊院校或证据需单独口径",
        "displayLabel": "本校方向",
        "level": "primary",
        "majors": [
          "本批不直接列入普通本校方向"
        ],
        "evidenceText": "见本校相关与方向提醒",
        "reviewPoints": [
          "当年招生章程",
          "军队招生政策"
        ],
        "humanNote": "这个方向和学校公开学科背景存在对应关系，建议再看当年招生章程、军队招生政策。",
        "canTriggerFrontend": true
      },
      {
        "direction": "临床医学",
        "displayLabel": "本校相关",
        "level": "secondary",
        "majors": [
          "临床医学"
        ],
        "evidenceText": "第二轮双一流",
        "reviewPoints": [
          "是否军籍",
          "学制",
          "体检政审",
          "临床培养"
        ],
        "humanNote": "这个方向和学校公开学科背景存在对应关系，建议再看是否军籍、学制、体检政审。",
        "canTriggerFrontend": true
      },
      {
        "direction": "军事医学相关",
        "displayLabel": "本校相关",
        "level": "secondary",
        "majors": [
          "口腔医学",
          "预防医学",
          "基础医学",
          "精神医学"
        ],
        "evidenceText": "招生简章与学校医学背景需当年核验",
        "reviewPoints": [
          "学制",
          "执业资格",
          "军队培养要求"
        ],
        "humanNote": "这个方向和学校公开学科背景存在对应关系，建议再看学制、执业资格、军队培养要求。",
        "canTriggerFrontend": true
      },
      {
        "direction": "前台必须显示改名与对外称呼口径，不混用为两所学校",
        "displayLabel": "方向提醒",
        "level": "trajectory",
        "majors": [
          "第四军医大学",
          "空军军医大学名称"
        ],
        "evidenceText": "阳光高考院校简介、学校官网",
        "reviewPoints": [
          "培养方案",
          "招生章程",
          "课程方向"
        ],
        "humanNote": "这个方向和学校公开学科背景存在对应关系，建议再看培养方案、招生章程、课程方向。",
        "canTriggerFrontend": true
      },
      {
        "direction": "不进入普通院校列表自动触发",
        "displayLabel": "方向提醒",
        "level": "trajectory",
        "majors": [
          "普通招生判断"
        ],
        "evidenceText": "第 8 批单独审计",
        "reviewPoints": [
          "培养方案",
          "招生章程",
          "课程方向"
        ],
        "humanNote": "这个方向和学校公开学科背景存在对应关系，建议再看培养方案、招生章程、课程方向。",
        "canTriggerFrontend": true
      }
    ],
    "primaryDirections": [
      {
        "direction": "特殊院校或证据需单独口径",
        "displayLabel": "本校方向",
        "level": "primary",
        "majors": [
          "本批不直接列入普通本校方向"
        ],
        "evidenceText": "见本校相关与方向提醒",
        "reviewPoints": [
          "当年招生章程",
          "军队招生政策"
        ],
        "humanNote": "这个方向和学校公开学科背景存在对应关系，建议再看当年招生章程、军队招生政策。",
        "canTriggerFrontend": true
      }
    ],
    "secondaryDirections": [
      {
        "direction": "临床医学",
        "displayLabel": "本校相关",
        "level": "secondary",
        "majors": [
          "临床医学"
        ],
        "evidenceText": "第二轮双一流",
        "reviewPoints": [
          "是否军籍",
          "学制",
          "体检政审",
          "临床培养"
        ],
        "humanNote": "这个方向和学校公开学科背景存在对应关系，建议再看是否军籍、学制、体检政审。",
        "canTriggerFrontend": true
      },
      {
        "direction": "军事医学相关",
        "displayLabel": "本校相关",
        "level": "secondary",
        "majors": [
          "口腔医学",
          "预防医学",
          "基础医学",
          "精神医学"
        ],
        "evidenceText": "招生简章与学校医学背景需当年核验",
        "reviewPoints": [
          "学制",
          "执业资格",
          "军队培养要求"
        ],
        "humanNote": "这个方向和学校公开学科背景存在对应关系，建议再看学制、执业资格、军队培养要求。",
        "canTriggerFrontend": true
      }
    ],
    "trajectoryWarnings": [
      {
        "direction": "前台必须显示改名与对外称呼口径，不混用为两所学校",
        "displayLabel": "方向提醒",
        "level": "trajectory",
        "majors": [
          "第四军医大学",
          "空军军医大学名称"
        ],
        "evidenceText": "阳光高考院校简介、学校官网",
        "reviewPoints": [
          "培养方案",
          "招生章程",
          "课程方向"
        ],
        "humanNote": "这个方向和学校公开学科背景存在对应关系，建议再看培养方案、招生章程、课程方向。",
        "canTriggerFrontend": true
      },
      {
        "direction": "不进入普通院校列表自动触发",
        "displayLabel": "方向提醒",
        "level": "trajectory",
        "majors": [
          "普通招生判断"
        ],
        "evidenceText": "第 8 批单独审计",
        "reviewPoints": [
          "培养方案",
          "招生章程",
          "课程方向"
        ],
        "humanNote": "这个方向和学校公开学科背景存在对应关系，建议再看培养方案、招生章程、课程方向。",
        "canTriggerFrontend": true
      }
    ],
    "pendingReview": [
      "学校官网公开博士点和本科专业完整证据需继续补强；当前先以阳光高考与教育部双一流口径处理。",
      "2026 年各省招生计划、体检政审、学制和招生专业以当年官方简章为准。",
      "--",
      "--"
    ],
    "sourceIds": [
      "G001",
      "G002",
      "G003",
      "G004"
    ]
  }
];
export default ALL_211_SPECIAL_BOUNDARY;
