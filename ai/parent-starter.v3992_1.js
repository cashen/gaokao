// Score-driven prompts are parent conversation starters, not persistent family constraints.
// Multi-region choices stay one parent intent; the deterministic layer executes their union in one pass.
export const AI_PARENT_STARTER_VERSION='ai-parent-starter-v3992_1';
function scoreValue(value){const n=Math.round(Number(value));return Number.isFinite(n)&&n>=150&&n<=750?n:null;}
function item(label,prompt,reason=''){return{label,prompt,reason};}
export function starterScenariosForScore(value){const s=scoreValue(value);if(!s)return[];
 if(s<=380)return[item('先看还有哪些本科机会',`${s}分，先看还有哪些真实可达的本科机会`),item('专业和地区都可以放宽',`${s}分，专业先放宽，地区也可以远一点，先看真实机会`),item('民办也可以',`${s}分，民办也可以，先看能增加哪些选择`),item('只看现实能够得着的',`${s}分，不追学校名气，先看现实能够得着的方向`)];
 if(s<=470)return[item('尽量保公办',`${s}分，辽宁省内先看能上的公办机会`),item('民办也可以',`${s}分，民办也可以，看看能增加哪些选择`),item('愿意加预算看中外',`${s}分，中外合作也可以，预算可以上浮，看看能增加哪些学校`),item('新疆西藏也可以换公办',`${s}分，新疆、西藏也可以，优先公办，看看能不能换来更多机会`)];
 if(s<=549)return[item('省内学校和专业一起看',`${s}分，辽宁省内先看学校和专业怎么平衡`),item('本科就业优先',`${s}分，普通家庭，本科就业优先，先看现实方向`),item('愿意加预算看中外',`${s}分，中外合作也可以，看看预算上浮能增加哪些选择`),item('远地域也能接受',`${s}分，新疆、西藏等远地域也可以，优先公办`)];
 if(s<=595)return[item('先看省内有背景的方向',`${s}分，帮我看省内有背景、又值得继续研究的专业方向`),item('愿意加预算看211中外',`${s}分，愿意加预算，看看有没有211中外或高收费项目值得研究`),item('本科就业优先',`${s}分，普通家庭，本科就业优先，帮我收敛方向`),item('学校平台优先',`${s}分，学校平台更重要，专业不要太差，怎么开始看`)];
 if(s<=625)return[item('愿意加预算看985中外',`${s}分，愿意加预算，看看有没有985中外或高收费项目值得研究`),item('学校平台和专业怎么取舍',`${s}分，学校平台和专业质量怎么平衡`),item('先查目标学校全部专业',`${s}分，我有目标学校，想先查这所学校所有专业最低分`),item('城市也很重要',`${s}分，城市机会也很重要，帮我一起考虑`)];
 if(s<650)return[item('学校平台和专业一起比较',`${s}分，学校平台和专业质量一起看，不只看能不能上`),item('目标学校专业历史',`${s}分，我想直接查目标学校各专业历史分数`),item('城市机会优先',`${s}分，城市机会比较重要，学校专业一起比较`),item('本科就业和深造取舍',`${s}分，本科就业和继续深造怎么取舍`)];
 return[item('优先看专业质量',`${s}分，不只看学校层次，优先比较专业质量和培养路径`),item('目标学校横向比较',`${s}分，我想把几所目标学校的专业横向比较`),item('城市与培养路径',`${s}分，城市机会和培养路径一起考虑`),item('核验关键事实',`${s}分，帮我把目标学校的校区、学费、培养方式等关键事实列出来核验`)];
}
