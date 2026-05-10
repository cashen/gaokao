// V2.9.6 shared drawer: PC right slide-over, mobile bottom sheet.
(function(){
  function ensure(){
    let mask=document.getElementById('lnDrawerMaskV296'); let drawer=document.getElementById('lnDrawerV296');
    if(mask&&drawer)return {mask,drawer};
    mask=document.createElement('div'); mask.id='lnDrawerMaskV296'; mask.className='ln-drawer-mask-v296 hide'; mask.dataset.action='drawer-close';
    drawer=document.createElement('section'); drawer.id='lnDrawerV296'; drawer.className='ln-drawer-v296 hide'; drawer.setAttribute('role','dialog'); drawer.setAttribute('aria-modal','true');
    drawer.innerHTML='<div class="ln-drawer-head-v296"><h3 id="lnDrawerTitleV296">设置</h3><button class="ghost slim" data-action="drawer-close">关闭</button></div><div class="ln-drawer-body-v296" id="lnDrawerBodyV296"></div>';
    document.body.append(mask,drawer); return {mask,drawer};
  }
  function open(title, html){const {mask,drawer}=ensure(); document.getElementById('lnDrawerTitleV296').textContent=title||'设置'; document.getElementById('lnDrawerBodyV296').innerHTML=html||''; mask.classList.remove('hide'); drawer.classList.remove('hide'); document.body.classList.add('drawer-open-v296');}
  function setBody(html){ensure(); document.getElementById('lnDrawerBodyV296').innerHTML=html||'';}
  function close(){const {mask,drawer}=ensure(); mask.classList.add('hide'); drawer.classList.add('hide'); document.body.classList.remove('drawer-open-v296');}
  function isOpen(){return !ensure().drawer.classList.contains('hide');}
  document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
  window.LN_DRAWER_V296={open,setBody,close,isOpen,ready:true};
})();
