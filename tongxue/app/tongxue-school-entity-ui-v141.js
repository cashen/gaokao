import{installSchoolEntityUi as installV130,currentSchoolEntity}from'./tongxue-school-entity-ui-v130.js';
let installed=false;
export function installSchoolEntityUi(){
  if(installed)return;
  installed=true;
  installV130();
  const hero=document.querySelector('.hero p span');
  if(hero)hero.textContent='简称、拼音首字母、轻微错别字、分校和招生校区也能识别。';
  const input=document.getElementById('school');
  if(input)input.placeholder='输入学校、校区或首字母，如：哈工威 / hgw';
}
export{currentSchoolEntity};
