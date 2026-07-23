export const UI_ORCHESTRATION_VERSION='v3959_0';

export const UI_PAGE_REGISTRY=Object.freeze({
  home:Object.freeze({route:'/',label:'家庭首页',density:'reading',role:'primary'}),
  selection:Object.freeze({route:'/ln-rank/',label:'专业初选',density:'workspace',role:'primary'}),
  selected:Object.freeze({route:'/ln-rank/selection-pool.html',label:'已选专业',density:'workspace',role:'primary'}),
  difficulty:Object.freeze({route:'/ln2026.html',label:'难度变化',density:'reading',role:'evidence'}),
  structure:Object.freeze({route:'/zy2026/',label:'招生变化',density:'workspace',role:'evidence'}),
  tongxue:Object.freeze({route:'/tongxue/',label:'同学你好',density:'reading',role:'evidence',brand:'tongxue'})
});

export const UI_RESOURCE_REGISTRY=Object.freeze({
  foundation:'/shared/ui/tokens/foundation.v3959_0.css',
  semantic:'/shared/ui/tokens/semantic.v3959_0.css',
  shellCss:'/shared/ui/shell/family-shell.v3959_0.css',
  shellJs:'/shared/ui/shell/family-shell.v3959_0.js',
  actionContract:'/shared/ui/contracts/action-contract.v3959_0.js',
  stateContract:'/shared/ui/contracts/state-contract.v3959_0.js',
  copyContract:'/shared/ui/contracts/copy-contract.v3959_0.js'
});

export function getUiPage(key){return UI_PAGE_REGISTRY[key]||UI_PAGE_REGISTRY.home}
