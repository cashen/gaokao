export const BOTTOMLINE_OPTIONS = [
  ['all','全部院校'],['public_first','公办优先'],['public_regular_only','只看公办普通'],['public_include_sino','公办含中外/高收费']
];
export function bottomLineLabel(mode){return Object.fromEntries(BOTTOMLINE_OPTIONS)[mode]||'全部院校'}
export function initBottomLineSheet({getMode,setMode,onApply}={}){
  const trigger=document.getElementById('bottomLineMobileTrigger');
  const sheet=document.getElementById('bottomLineSheet');
  const label=document.getElementById('bottomLineMobileLabel');
  let pending=getMode?.()||'all';
  function sync(){const mode=getMode?.()||pending; pending=mode; if(label)label.textContent=bottomLineLabel(mode); document.querySelectorAll('[data-bottomline-sheet-mode]').forEach(b=>b.classList.toggle('is-active',b.dataset.bottomlineSheetMode===mode));}
  function open(){sync(); sheet.hidden=false; document.body.classList.add('bottomline-sheet-open'); trigger?.setAttribute('aria-expanded','true')}
  function close(){sheet.hidden=true; document.body.classList.remove('bottomline-sheet-open'); trigger?.setAttribute('aria-expanded','false')}
  trigger?.addEventListener('click',open);
  sheet?.addEventListener('click',e=>{const opt=e.target.closest('[data-bottomline-sheet-mode]'); if(opt){pending=opt.dataset.bottomlineSheetMode; document.querySelectorAll('[data-bottomline-sheet-mode]').forEach(b=>b.classList.toggle('is-active',b===opt)); return;} if(e.target.closest('[data-bottomline-sheet-close]')) close();});
  document.getElementById('bottomLineSheetApply')?.addEventListener('click',()=>{setMode?.(pending); close(); onApply?.();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape' && sheet && !sheet.hidden) close();});
  return {sync,close,open};
}
