export const BOTTOMLINE_OPTIONS = [
  ['all','全部院校','先完整查看，不提前排除民办、中外或高收费项目。'],
  ['public_first','公办优先','优先看公办，保留需要人工复核的特殊项目。'],
  ['public_regular_only','只看公办普通','排除中外合作、高收费等特殊收费项目。'],
  ['public_include_sino','公办含中外/高收费','保留公办院校里的中外合作或高收费项目，需核验费用与培养模式。']
];

export function bottomLineLabel(mode){
  return Object.fromEntries(BOTTOMLINE_OPTIONS.map(([key,label]) => [key,label]))[mode] || '全部院校';
}

function ensureSheetOptions(sheet){
  if (!sheet) return;
  const mount = sheet.querySelector('.bottomline-sheet-options');
  if (!mount) return;
  const existing = mount.querySelectorAll('[data-bottomline-sheet-mode]');
  if (existing.length >= 4) return;
  mount.innerHTML = BOTTOMLINE_OPTIONS.map(([key,label,desc]) => `
    <button type="button" class="bottomline-sheet-option" data-bottomline-sheet-mode="${key}">
      <b>${label}</b><span>${desc}</span>
    </button>
  `).join('');
}

export function initBottomLineSheet({getMode,setMode,onApply}={}){
  const trigger=document.getElementById('bottomLineMobileTrigger');
  const sheet=document.getElementById('bottomLineSheet');
  const label=document.getElementById('bottomLineMobileLabel');
  let pending=getMode?.()||'all';
  function sync(){
    ensureSheetOptions(sheet);
    const mode=getMode?.()||pending;
    pending=mode;
    if(label)label.textContent=bottomLineLabel(mode);
    document.querySelectorAll('[data-bottomline-sheet-mode]').forEach(b=>b.classList.toggle('is-active',b.dataset.bottomlineSheetMode===mode));
  }
  function open(event){
    event?.preventDefault?.();
    ensureSheetOptions(sheet);
    sync();
    if (!sheet) return;
    sheet.hidden=false;
    sheet.removeAttribute('hidden');
    document.body.classList.add('bottomline-sheet-open');
    trigger?.setAttribute('aria-expanded','true');
  }
  function close(){
    if (!sheet) return;
    sheet.hidden=true;
    sheet.setAttribute('hidden','');
    document.body.classList.remove('bottomline-sheet-open');
    trigger?.setAttribute('aria-expanded','false');
  }
  trigger?.addEventListener('click',open);
  sheet?.addEventListener('click',e=>{
    const opt=e.target.closest('[data-bottomline-sheet-mode]');
    if(opt){
      pending=opt.dataset.bottomlineSheetMode;
      document.querySelectorAll('[data-bottomline-sheet-mode]').forEach(b=>b.classList.toggle('is-active',b===opt));
      return;
    }
    if(e.target.closest('[data-bottomline-sheet-close]')) close();
  });
  document.getElementById('bottomLineSheetApply')?.addEventListener('click',()=>{
    setMode?.(pending);
    close();
    onApply?.();
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape' && sheet && !sheet.hidden) close();});
  sync();
  return {sync,close,open};
}
