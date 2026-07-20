import{installSchoolEntityUi as installV130,currentSchoolEntity}from'./tongxue-school-entity-ui-v130.js';
let installed=false;
export function installSchoolEntityUi(){if(installed)return;installed=true;installV130();applyCopy();const input=document.getElementById('school'),suggestions=document.getElementById('schoolSuggestions');if(input&&suggestions){const relabel=()=>{if(!isInitialInput(input.value))return;suggestions.querySelectorAll('.suggestion-type').forEach(node=>{node.textContent='首字母匹配';});};new MutationObserver(relabel).observe(suggestions,{childList:true,subtree:true});input.addEventListener('input',()=>queueMicrotask(relabel));relabel();}}
function applyCopy(){const hero=document.querySelector('.hero p span');if(hero)hero.textContent='简称、拼音首字母、轻微错别字、分校和招生校区也能识别。';const input=document.getElementById('school');if(input)input.placeholder='输入学校、校区或首字母，如：哈工威 / hgw';}
function isInitialInput(value){const source=String(value||'').normalize('NFKC').trim();return source.replace(/[\s._-]+/g,'').length>=2&&/^[a-z0-9\s._-]+$/i.test(source);}
export{currentSchoolEntity};
