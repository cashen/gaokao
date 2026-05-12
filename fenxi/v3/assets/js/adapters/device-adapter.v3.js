(function(){
  'use strict';
  function detect(){var w=window.innerWidth||0,h=window.innerHeight||0,ua=navigator.userAgent||'';return {width:w,height:h,dpr:window.devicePixelRatio||1,touch:('ontouchstart'in window)||navigator.maxTouchPoints>0,android:/Android/i.test(ua),ios:/iPhone|iPad|iPod/i.test(ua),wechat:/MicroMessenger/i.test(ua),mobile:w<=720,tablet:w>720&&w<=1100,desktop:w>1100,smallHeight:h<640,localStorageAvailable:(function(){try{localStorage.setItem('__ln_test','1');localStorage.removeItem('__ln_test');return true;}catch(e){return false;}})()};}
  function apply(){var d=detect();var b=document.body;if(!b)return d;['is-mobile','is-tablet','is-desktop','is-touch','is-android','is-ios','is-wechat','is-small-height'].forEach(function(c){b.classList.remove(c);}); if(d.mobile)b.classList.add('is-mobile'); if(d.tablet)b.classList.add('is-tablet'); if(d.desktop)b.classList.add('is-desktop'); if(d.touch)b.classList.add('is-touch'); if(d.android)b.classList.add('is-android'); if(d.ios)b.classList.add('is-ios'); if(d.wechat)b.classList.add('is-wechat'); if(d.smallHeight)b.classList.add('is-small-height'); b.style.setProperty('--rc2-vh',(window.innerHeight*.01)+'px'); return d;}
  window.addEventListener('resize',function(){clearTimeout(window.__lnRc2DeviceTimer); window.__lnRc2DeviceTimer=setTimeout(apply,120);});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply); else apply();
  window.LN_V3_DEVICE={detect:detect,apply:apply,ready:true};
})();
