export const HUMAN_BAND_LABELS={upper:'稍高目标',near:'主要参考',steady:'稳妥补充'};
export const HUMAN_REPLACEMENTS=[[/冲一冲/g,'稍高目标'],[/高冲/g,'稍高目标'],[/小冲/g,'稍高目标'],[/前段尝试/g,'稍高目标'],[/前段冲刺区/g,'稍高目标区'],[/主体承接区/g,'主要参考区'],[/主要承接/g,'主要参考'],[/后段补充/g,'稳妥补充'],[/最后兜底/g,'稳妥补充'],[/兜底/g,'稳妥补充'],[/保底深度/g,'后段是否够稳'],[/保底/g,'后段是否够稳'],[/冲稳保结构/g,'稍高目标/主要参考/稳妥补充结构'],[/冲稳保/g,'分段结构'],[/自选池/g,'自选专业'],[/专业集中度/g,'专业方向是否过于集中'],[/地域单点风险/g,'城市过于集中'],[/主体承接/g,'主要参考']];
export const HUMAN_FORBIDDEN_VISIBLE_WORDS=['payload','raw','source','debug','model','JSON','workers-ai','fallback','AI_PATH_MODEL','NaN','undefined','null','[object Object]'];
export function toHumanCopy(value){let text=String(value==null?'':value);for(const [p,r] of HUMAN_REPLACEMENTS) text=text.replace(p,r);return text;}
export function hasForbiddenVisibleText(value){const text=String(value==null?'':value);return HUMAN_FORBIDDEN_VISIBLE_WORDS.filter(w=>text.includes(w));}
