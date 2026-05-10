// V2.9.6 candidate cache: keeps per-refresh derived values and child-interest matches.
(function(){
  let generation=0; const map=new WeakMap();
  function reset(){generation++;}
  function bucket(r){let b=map.get(r); if(!b||b.g!==generation){b={g:generation, values:{}}; map.set(r,b);} return b.values;}
  function get(r,key,fn){const b=bucket(r); if(Object.prototype.hasOwnProperty.call(b,key)) return b[key]; b[key]=fn?fn():undefined; return b[key];}
  function set(r,key,value){bucket(r)[key]=value; return value;}
  window.LN_CANDIDATE_CACHE_V296={reset,get,set,ready:true};
})();
