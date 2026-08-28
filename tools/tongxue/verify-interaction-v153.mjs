import{readFile}from'node:fs/promises';
const [page,core,entry,copy,region,portrait]=await Promise.all([
 readFile('tongxue/index.html','utf8'),readFile('tongxue/app/tongxue-performance-v112.js','utf8'),readFile('tongxue/app/tongxue-performance-v158.js','utf8'),readFile('tongxue/app/tongxue-copy-v152.js','utf8'),readFile('tongxue/app/tongxue-region-ui-v152.js','utf8'),readFile('tongxue/portrait/tongxue-school-portrait-v121.js','utf8')
]);
const failures=[],check=(label,passed)=>{if(!passed)failures.push(label);};
check('原生按钮',page.includes('<button id="queryButton" class="btn" type="button" disabled>看同学怎么说</button>'));
check('鼠标点击查询',core.includes("queryButton.addEventListener('click',()=>querySchool())"));
check('输入框回车查询',core.includes("if(event.key==='Enter'&&!queryButton.disabled){event.preventDefault();querySchool();}"));
check('候选回车优先确认',core.includes("if(event.key==='Enter'&&activeSuggestion>=0){event.preventDefault();chooseSuggestion(suggestions[activeSuggestion]);return;}"));
check('中文输入法保护',core.includes('if(event.isComposing||inputComposing)return;')&&core.includes("schoolInput.addEventListener('compositionstart'")&&core.includes("schoolInput.addEventListener('compositionend'"));
check('按钮键盘原生行为',page.includes('type="button"')&&!page.includes('role="button"'));
check('地域输入回车',region.includes("if(event.key==='Enter')")&&region.includes('renderCurrentRegion(input,box,result)'));
check('地域按钮点击',region.includes("button.addEventListener('click'"));
check('动态按钮回归',copy.includes("button.textContent='看同学怎么说'"));
check('文案层先于核心',entry.indexOf('installTongxueCopyV152();')<entry.indexOf("await import('./tongxue-performance-v112.js?v=156')"));
check('画像安装后再归一',entry.lastIndexOf('refreshTongxueCopyV152();')>entry.indexOf('installSchoolPortrait'));
check('画像无首页写操作',!portrait.includes('applyPageCopy')&&!portrait.includes('stabilizeButtonCopy')&&!portrait.includes('document.title')&&!portrait.includes('input.placeholder'));
check('查询逻辑未复制',!copy.includes('querySchool(')&&!region.includes('fetchExperience(')&&!portrait.includes('querySchool('));
console.log('TONGXUE_INTERACTION_V154_RESULTS '+JSON.stringify({failures}));if(failures.length)process.exitCode=1;
