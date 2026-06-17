export const STANDARD_MAJOR_CATALOG_BRIDGE = {
  "version": "v3986-standard-major-catalog-bridge",
  "historyDataYears": [
    2024,
    2025
  ],
  "activeCatalogYear": 2026,
  "rule": "2026专业目录只用于标准专业代码、专业类、新专业和AI解释，不覆盖2024/2025历史录取数据。",
  "displayPolicy": {
    "exact": "专业代码",
    "alias": "专业代码",
    "category": "专业类",
    "ambiguous": "hide",
    "unmapped": "hide",
    "experimentalClass": "hide"
  },
  "fieldPolicy": {
    "historyMajorName": "2024/2025历史录取条目中的专业名称",
    "standardMajor2026": "按2026本科专业目录匹配出的标准专业",
    "displayMajor": "前端最终展示的专业代码/专业类"
  },
  "reviewRules": [
    "试验班、大类招生、实验班不能硬映射为单一专业代码。",
    "园艺、园林、风景园林必须分开。",
    "动物医学、食品科学与工程不归入医学核心。",
    "机械设计制造及其自动化不归入电气/自动化/能源。",
    "中外、高收费、公费师范、定向是项目属性，不进入专业代码匹配。"
  ]
};
