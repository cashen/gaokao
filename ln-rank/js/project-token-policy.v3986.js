export const PROJECT_ATTRIBUTE_KB = {
  "version": "v3986-project-attribute-kb",
  "source": "admission-charter-source-kb + project-keyword-policy",
  "items": {
    "sinoForeign": {
      "label": "中外合作",
      "aliases": [
        "中外",
        "中外合作",
        "合作办学"
      ],
      "mustCheck": [
        "学费",
        "外方院校",
        "是否必须出国",
        "授课语言",
        "毕业证/学位证",
        "校区",
        "转专业政策"
      ]
    },
    "highFee": {
      "label": "高收费",
      "aliases": [
        "高收费",
        "较高收费"
      ],
      "mustCheck": [
        "学费",
        "培养模式",
        "校区",
        "转专业政策"
      ]
    },
    "publicTeacher": {
      "label": "公费师范",
      "aliases": [
        "公费师范",
        "优师专项"
      ],
      "mustCheck": [
        "履约地区",
        "服务年限",
        "违约责任",
        "就业安排",
        "教师资格"
      ]
    },
    "targeted": {
      "label": "定向",
      "aliases": [
        "定向",
        "定向就业",
        "定向培养"
      ],
      "mustCheck": [
        "定向地区",
        "服务年限",
        "违约责任",
        "户籍/体检/政审条件"
      ]
    },
    "experimentalClass": {
      "label": "试验班",
      "aliases": [
        "试验班",
        "实验班",
        "拔尖班",
        "本博",
        "本研"
      ],
      "mustCheck": [
        "专业分流规则",
        "可选专业范围",
        "退出机制",
        "是否承诺具体专业"
      ]
    }
  },
  "boundary": [
    "项目属性不是标准专业名，不进入专业代码匹配。",
    "项目属性必须在招生章程和辽宁招生计划备注中人工核验。"
  ]
};
