// V2.9.8 interest weight rules: soft boosts only, never hard filters.
(function(){
  const BASE={
    default:{A:{core:10,related:5,review:1,none:0},B:{core:45,related:22,review:8,none:0},C:{core:12,related:6,review:0,none:0}},
    animal_life_science:{A:{core:10,related:5,review:1,none:0},B:{core:45,related:22,review:8,none:0},C:{core:10,related:5,review:0,none:0}},
    computer_info:{A:{core:8,related:4,review:0,none:0},B:{core:40,related:22,review:8,none:0},C:{core:16,related:8,review:2,none:0}},
    electric_energy:{A:{core:12,related:6,review:1,none:0},B:{core:42,related:22,review:8,none:0},C:{core:12,related:6,review:0,none:0}},
    humanities_law:{A:{core:6,related:3,review:0,none:0},B:{core:42,related:20,review:6,none:0},C:{core:10,related:5,review:0,none:0}},
    teacher_education:{A:{core:12,related:6,review:2,none:0},B:{core:42,related:22,review:8,none:0},C:{core:6,related:3,review:0,none:0}},
    medical_health:{A:{core:10,related:5,review:1,none:0},B:{core:45,related:22,review:8,none:0},C:{core:10,related:5,review:0,none:0}},
    pharmacy_pharma:{A:{core:8,related:4,review:1,none:0},B:{core:42,related:20,review:6,none:0},C:{core:8,related:4,review:0,none:0}}
  };
  const CAP={A:18,B:55,C:26};
  function one(interestId,level,bucket){const table=BASE[interestId]||BASE.default; return Number(table?.[bucket]?.[level]??0);}
  function combine(values,bucket){const arr=(values||[]).map(Number).filter(x=>x>0).sort((a,b)=>b-a); if(!arr.length)return 0; const raw=arr[0]+(arr[1]||0)*0.35+(arr[2]||0)*0.20; return Math.round(Math.min(raw,CAP[bucket]||raw));}
  function cap(bucket){return CAP[bucket]||0;}
  const api={BASE,CAP,one,combine,cap,ready:true};
  window.LN_INTEREST_WEIGHT_RULES_V298=api;
})();
