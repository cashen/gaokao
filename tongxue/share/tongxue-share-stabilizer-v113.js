export function installShareMetadataStabilizer(pageVersion='v1.1.3'){
  const result=document.getElementById('result');
  if(!result)return;
  const style=document.createElement('style');
  style.textContent='.technical-page-item{border-radius:999px;background:#f5f7f6;padding:4px 9px}';
  document.head.append(style);
  const stabilize=()=>result.querySelectorAll('.technical-item').forEach(item=>{
    if(!item.textContent.trim().startsWith('页面：'))return;
    item.textContent='页面：'+pageVersion;
    item.className='technical-page-item';
  });
  new MutationObserver(stabilize).observe(result,{childList:true,subtree:true});
  stabilize();
}
