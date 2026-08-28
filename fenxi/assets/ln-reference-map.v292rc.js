/*
 * V2.92RC2.4.audit-data-safe-runner｜JS 引用与职责地图
 * 只登记工程结构，不改变业务计算。后续新增 JS 必须先归层再引用。
 */
(function(){
  'use strict';
  const VERSION='V2.92RC2.4.audit-data-safe-runner';
  const STAMP='292rc24-audit-data-safe-runner-20260521';
  const map={
    version:VERSION,
    stamp:STAMP,
    principle:'保留 V2.91RC0.rules-closure4.front2 业务逻辑；规范化 JS 引用、规则职责、数据计算与 debug。',
    layers:[
      {id:'boot-config',name:'启动/配置层',kind:'hard-foundation',files:['assets/config.v297fix2.js'],rule:'提供路径、全局状态、数据文件地址；不得被业务补丁替代。'},
      {id:'data',name:'数据加载层',kind:'hard',files:['assets/data-engine.v297fix2.js','data/manifest.json','data/rank_2025_physics.json','data/chunks/*.json'],rule:'只负责读取与缓存数据，不写 DOM。'},
      {id:'filter',name:'候选池/筛选层',kind:'hard',files:['assets/filter-engine.v298fix1.js','assets/region-filter-rules.v2983fix5.js','assets/compute-pipeline.v2983.js'],finalOwner:'compute-pipeline.v2983.js',rule:'compute-pipeline 是当前 applyFilters 主入口；filter-engine 保留基础函数与兼容资产。'},
      {id:'qualification',name:'资格入口保护层',kind:'hard',files:['assets/qualification-gate-rules.v297fix2.js','assets/qualification-gate.v297fix2.js','assets/qualification-gate-ui.v297fix2.js'],rule:'高校专项、预科/民族班、定向等资格入口默认保护。'},
      {id:'profile-interest',name:'孩子画像/兴趣层',kind:'hard-soft',files:['assets/student-profile-rules.v2981.js','assets/profile-interest-bridge-rules.v2981.js','assets/rules-interest-core.v291rc0rules1.js','assets/rules-path-core.v291rc0rules1.js','assets/child-interest-runtime.v298fix1.js'],rule:'兴趣只转专业路径与真实命中，不凭空生成候选。'},
      {id:'decision',name:'A/B/C 决策层',kind:'hard',files:['assets/plan-engine.v297fix2.js','assets/rules-decision-core.v291rc0rules1.js','assets/rules-closure.v291rc0closure4.js'],finalOwner:'rules-closure.v291rc0closure4.js',rule:'plan-engine 给原始评分，rules-closure4 为最终业务闭环与 A/B/C 输出。'},
      {id:'detail',name:'详情卡解释层',kind:'soft',files:['assets/detail-card-lite-model.v2981fix2.js','assets/detail-card-lite-ui.v2981fix2.js','assets/ui-detail-notice-late-core.v291rc0ui1.js'],finalOwner:'detail-card-lite-ui.v2981fix2.js',rule:'负责详情解释、复核动作、家长必读，不改变候选池。'},
      {id:'presentation',name:'家长信任表达层',kind:'soft',files:['assets/parent-trust.v291rc0parenttrust2.js','assets/frontend-trust.v291rc0front2.js','assets/notice-compact-ui.v2981fix2.js','assets/context-summary-ui.v2981fix1.js','assets/profile-interest-summary.v2981fix2.js'],rule:'只做人话化、视觉增强、解释增强，不改变公式/候选/排序。'},
      {id:'interaction',name:'交互稳定层',kind:'technical',files:['assets/app.v2983.js','assets/interaction-stability.v2982.js','assets/interact-stability.v29rc1.js','assets/interact-dedupe.v29rc2.js','assets/refresh-scheduler.v297fix2.js'],rule:'历史交互补丁短期保留事件监听；applyFilters 入口由 refresh-controller 后置收口。'},
      {id:'registry-debug',name:'工程闭环审计层',kind:'diagnostic',files:['assets/ln-runtime-registry.v292rc.js','assets/ln-state-adapter.v292rc.js','assets/ln-refresh-controller.v292rc.js','assets/ln-debug-baseline.v292rc.js'],rule:'记录、审计、输出日志；refresh-controller 后置接管 applyFilters 入口，但业务计算仍调用 compute-pipeline。'},
      {id:'abc-policy-audit',name:'A/B/C 人类思维策略审计层',kind:'diagnostic-policy',files:['assets/ln-abc-policy-audit.v292rc2.js'],rule:'统一测试接口；自动模拟分数、兴趣、性别、预算、拒绝项和家庭场景；只审计，不改 A/B/C 策略。'}
    ],
    protectedGlobals:['applyFilters','planScoreV29475','renderPlanABC','renderPlanABCViewOnly','LN_DETAIL_CARD_UI_V2981','LN_COMPUTE_PIPELINE_V2983'],
    finalExpectedOwners:{
      applyFilters:'ln-refresh-controller.v292rc.js managed wrapper → compute-pipeline.v2983.js',
      planScoreV29475:'rules-closure.v291rc0closure4.js wrapping plan-engine',
      renderPlanABC:'rules-closure.v291rc0closure4.js',
      LN_DETAIL_CARD_UI_V2981:'detail-card-lite-ui.v2981fix2.js via ui-detail-notice-late-core'
    },
    pendingDelPolicy:{
      meaning:'pendingdel 是隔离区/回滚区，不是随手垃圾桶。',
      requiredRecord:['file','category','reason','removedFromIndex','baselineExpectation','movedAt'],
      productionAdvice:'正式生产包可排除 pendingdel；开发包保留 pendingdel 便于回滚。'
    }
  };
  window.LN_REFERENCE_MAP_V292RC=map;
  window.LN_ENGINE_CLEANUP_VERSION=VERSION;
  window.LN_ENGINE_CLEANUP_STAMP=STAMP;
})();
