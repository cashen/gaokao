// V2.9.6 interaction policy: classifies UI actions to avoid unnecessary full refresh.
(function(){
  const POLICY={
    'base-rank-change':{level:'full',delay:80},
    'baseline-change':{level:'full',delay:120},
    'chip-change':{level:'soft',delay:800},
    'child-interest-change':{level:'soft',delay:900},
    'scenario-change':{level:'soft',delay:180},
    'abc-view-change':{level:'render-only',delay:0},
    'pagination':{level:'render-only',delay:0},
    'manual-execute':{level:'full',delay:0},
    'boot':{level:'full',delay:0}
  };
  function get(reason){return POLICY[reason]||{level:'soft',delay:180};}
  window.LN_INTERACTION_POLICY_V296={get, POLICY, ready:true};
})();
