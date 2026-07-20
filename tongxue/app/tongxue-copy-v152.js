let installed=false;
export function installTongxueCopyV152(){
  if(installed||typeof document==='undefined')return;
  installed=true;
  const button=document.getElementById('queryButton');
  const indexStatus=document.getElementById('indexStatus');
  const suggestions=document.getElementById('schoolSuggestions');
  const resolveHint=document.getElementById('resolveHint');
  const result=document.getElementById('result');
  const apply=()=>{
    applyButton(button);
    applyIndexStatus(indexStatus);
    applySuggestions(suggestions);
    applyResolveHint(resolveHint);
    applyResult(result);
  };
  for(const node of [button,indexStatus,suggestions,resolveHint,result]){
    if(node)new MutationObserver(apply).observe(node,{childList:true,subtree:true,characterData:true});
  }
  apply();
}
export function refreshTongxueCopyV152(){
  if(!installed)return;
  applyButton(document.getElementById('queryButton'));
  applyIndexStatus(document.getElementById('indexStatus'));
  applySuggestions(document.getElementById('schoolSuggestions'));
  applyResolveHint(document.getElementById('resolveHint'));
  applyResult(document.getElementById('result'));
}
function applyButton(button){
  if(!button)return;
  const text=button.textContent.trim();
  if(text==='查看学校体验'||text==='看看同学怎么说')button.textContent='看同学怎么说';
}
function applyIndexStatus(node){
  if(!node)return;
  const text=node.textContent.trim();
  if(text.startsWith('已支持教育部公布的'))node.textContent='学校名单已准备好';
}
function applySuggestions(box){
  const empty=box?.querySelector('.suggestion-empty');
  if(empty?.textContent.includes('暂时没有找到明显匹配'))empty.textContent='暂时没找到，可以输入更完整的学校名称或所在地区。';
}
function applyResolveHint(node){
  const text=node?.querySelector('span');
  if(text?.textContent.startsWith('已识别：'))text.textContent=text.textContent.replace(/^已识别：/,'已找到：');
  const button=node?.querySelector('.resolve-change');
  if(button&&button.textContent!=='换一个')button.textContent='换一个';
}
function applyResult(result){
  if(!result)return;
  const loading=result.querySelector('.state-card.loading');
  if(loading){
    const match=loading.textContent.match(/已找到“(.+?)”/);
    const next=match?`正在查找“${match[1]}”的公开评论…`:'正在查找公开评论…';
    if(loading.textContent.trim()!==next)loading.textContent=next;
  }
  replaceText(result.querySelector('#resultTitle'),{
    '请确认你想查询的学校':'请选择具体学校',
    '还不能确定是哪所学校':'暂时没找到这所学校',
    '学校名称识别暂不可用':'学校名单暂时不可用',
    '来源站暂时没有可展示内容':'暂时没有可展示的公开评论',
    '暂时没能读取学校信息':'暂时无法读取公开评论'
  });
  for(const badge of result.querySelectorAll('.badge')){
    if(badge.textContent.trim()==='来源 AI 摘要')badge.textContent='公开评论摘要';
  }
  for(const heading of result.querySelectorAll('.section-heading')){
    if(heading.textContent.trim()==='来源站整理的主要观点')heading.textContent='公开评论摘要';
  }
  for(const summary of result.querySelectorAll('.raw-summary summary')){
    if(summary.textContent.trim()==='查看来源摘要原文')summary.textContent='查看完整摘要';
  }
  for(const note of result.querySelectorAll('.choice-note')){
    note.textContent=note.textContent.replace('选择后立即查询','选择后查看').replace('选择后查询','选择后查看');
  }
  for(const author of result.querySelectorAll('.review-author-name')){
    if(author.textContent.trim()==='匿名同学')author.textContent='匿名用户';
  }
  const reviewIntro=result.querySelector('.review-intro');
  if(reviewIntro?.textContent.includes('帮助你了解不同同学的个人体验')){
    reviewIntro.innerHTML='<strong>暂无评论摘要</strong>下面按发布时间展示近期公开评论，供你了解不同评论者的个人体验。';
  }
  const paragraph=result.querySelector('.state-card p');
  if(paragraph){
    const text=paragraph.textContent.trim();
    if(text.includes('可能对应多所学校。为避免查错，请选择正式校名后再查询。'))paragraph.textContent=text.replace('可能对应多所学校。为避免查错，请选择正式校名后再查询。','可能对应多所学校，请选择具体学校。');
    else if(text.includes('没有在教育部高校名单中唯一识别'))paragraph.textContent='可以输入更完整的学校名称或所在地区再试。';
  }
}
function replaceText(node,map){if(node&&map[node.textContent.trim()])node.textContent=map[node.textContent.trim()];}
