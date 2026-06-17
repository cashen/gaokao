/* v3.9.33.14 211 院校专业背景字段化索引。由 all-211-school-background-kb-v0.1.md 转换。 */
export const ALL_211_SOURCE_REGISTRY = [
  {
    "sourceId": "G001",
    "sourceTitle": "教育部：“211工程”学校名单",
    "sourceType": "官方",
    "sourceYear": "2005",
    "retrievedAt": "2026-06-14",
    "isOfficial": true,
    "isVerified": true,
    "canTriggerFrontend": false
  },
  {
    "sourceId": "G002",
    "sourceTitle": "阳光高考 / 学信网：“211”工程学校名单",
    "sourceType": "准官方",
    "sourceYear": "2008",
    "retrievedAt": "2026-06-14",
    "isOfficial": "quasi",
    "isVerified": true,
    "canTriggerFrontend": false
  },
  {
    "sourceId": "G003",
    "sourceTitle": "第二轮“双一流”建设高校及建设学科名单",
    "sourceType": "官方转载 / 准官方",
    "sourceYear": "2022",
    "retrievedAt": "2026-06-14",
    "isOfficial": "quasi",
    "isVerified": true,
    "canTriggerFrontend": "学科背景证据，必须对应本科专业后使用"
  },
  {
    "sourceId": "G004",
    "sourceTitle": "全国第四轮学科评估结果",
    "sourceType": "官方",
    "sourceYear": "2017",
    "retrievedAt": "2026-06-14",
    "isOfficial": true,
    "isVerified": true,
    "canTriggerFrontend": "学科背景证据，必须对应本科专业后使用"
  }
];
export default ALL_211_SOURCE_REGISTRY;
