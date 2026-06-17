export const LOCAL_MAINLINE_SOURCE_REGISTRY = {
  "meta": {
    "version": "v3.9.33.12",
    "assetVersion": "v3933_12",
    "generatedAt": "2026-06-13",
    "dataBoundary": "学校主线证据用于家庭复核，不代表录取判断依据，不代表就业结果承诺。分数入口必须由 /fenxi 2025 物理类数据动态生成。"
  },
  "sources": [
    {
      "id": "doctoral-v0.2",
      "label": "辽宁省内高校一级学科博士点审计补强 v0.2",
      "trust": "官方/准官方整理，待核验字段不得触发前台本校方向"
    },
    {
      "id": "discipline-fourth-round",
      "label": "第四轮学科评估公开结果 CSV",
      "trust": "教育部学位中心第四轮评估公开结果整理"
    },
    {
      "id": "school-mainline-v1",
      "label": "辽宁省内院校主线知识库补齐方案 v1",
      "trust": "官方/准官方来源整理"
    },
    {
      "id": "fenxi-2025-physics",
      "label": "/fenxi/data 辽宁 2025 物理类专业历史数据",
      "trust": "分数入口运行时唯一历史分数来源"
    }
  ],
  "rules": [
    "博士点是强证据，不是结论。",
    "第四轮学科评估是学科证据，不是推荐理由。",
    "本科专业必须明确对应，前台才能触发本校方向/本校相关。",
    "待核验信息不得触发前台标签。",
    "不使用 SEO 聚合页、排名站、志愿营销软文作为触发证据。"
  ]
};
