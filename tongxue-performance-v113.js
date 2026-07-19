import './tongxue-performance-v112.js?v=113';
import { installTongxueShare } from './tongxue-share-v113.js';

const result=document.getElementById('result');
if(result){
  const style=document.createElement('style');
  style.textContent='.technical-page-item{border-radius:999px;background:#f5f7f6;padding:4px 9px}';
  document.head.append(style);
  const stabilizePageVersion=()=>result.querySelectorAll('.technical-item').forEach(item=>{if(item.textContent.trim().startsWith('页面：')){item.textContent='页面：v1.1.3';item.className='technical-page-item';}});
  new MutationObserver(stabilizePageVersion).observe(result,{childList:true,subtree:true});
  stabilizePageVersion();
}
installTongxueShare({pageVersion:'v1.1.3'});
