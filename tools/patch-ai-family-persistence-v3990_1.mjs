import fs from 'node:fs';

function patchFile(path, before, after, label) {
  let text = fs.readFileSync(path, 'utf8');
  if (!text.includes(before)) throw new Error(`${label}: source changed; refusing blind patch`);
  text = text.replace(before, after);
  fs.writeFileSync(path, text);
}

patchFile(
  'functions/_lib/ai/command-interpreter.js',
  "  if(negative.length&&!majors.length&&!explicitFamilyPersistence(source)){operation=hasMeaningfulActiveView(workspace)?'refine':'search';target='candidates';relation=hasMeaningfulActiveView(workspace)?'replace_dimensions':'new_view';persistence='active_view';}\n  const ambiguousPair=positive.length>=2&&!hasCompare&&!hasUnion;",
  "  if(negative.length&&!majors.length&&!explicitFamilyPersistence(source)){operation=hasMeaningfulActiveView(workspace)?'refine':'search';target='candidates';relation=hasMeaningfulActiveView(workspace)?'replace_dimensions':'new_view';persistence='active_view';}\n  if(explicitFamilyPersistence(source)&&!candidate&&(negative.length||bottomLineMode||geo.explicit)){operation='save';target='family';relation='save_persistent';persistence='family';}\n  const ambiguousPair=positive.length>=2&&!hasCompare&&!hasUnion;",
  'family command classification'
);

patchFile(
  'shared/ai/ai-workspace-contract.v3990_1.js',
  "    const taskAction = clean(event.payload.taskAction, 30) || 'update_main';\n    if (!workspace.mainTaskId || taskAction === 'create_main') {",
  "    const taskAction = clean(event.payload.taskAction, 30) || 'update_main';\n    if (taskAction === 'none') {\n      // Family-profile-only commands persist constraints without manufacturing a candidate task.\n    } else if (!workspace.mainTaskId || taskAction === 'create_main') {",
  'family task isolation'
);

patchFile(
  'functions/_lib/ai/turn-orchestrator.js',
  "function buildBlocks({command,view,inherited,result,delta,workspace,regionExecution}){const blocks=[];blocks.push({type:'task_header',title:command.operation==='compare'?'比较当前选择':'当前观察',subtitle:activeViewLabel(view),commandSource:command.source});blocks.push({type:'active_view',title:'现在看的范围',view:{score:view.score,regionLabel:regionLabel(view.regionKeys),regionKeys:view.regionKeys,majorKeywords:view.majorKeywords,schoolNames:view.schoolNames,bottomLineMode:view.bottomLineMode},inherited});",
  "function buildBlocks({command,view,inherited,result,delta,workspace,regionExecution}){const blocks=[];blocks.push({type:'task_header',title:command.operation==='compare'?'比较当前选择':command.operation==='save'?'家庭底线已记录':'当前观察',subtitle:activeViewLabel(view),commandSource:command.source});blocks.push({type:'active_view',title:'现在看的范围',view:{score:view.score,regionLabel:regionLabel(view.regionKeys),regionKeys:view.regionKeys,majorKeywords:view.majorKeywords,schoolNames:view.schoolNames,bottomLineMode:view.bottomLineMode},inherited});if(command.operation==='save'&&command.persistence==='family'){const changes=command.familyChanges||{};const saved=[...(changes.majorExcludeKeywords||[]).map(value=>`不接受专业 ${value}`),...(changes.regionIncludeKeys||[]).map(value=>`长期地区范围 ${regionLabel([value])}`),...(changes.regionExcludeKeys||[]).map(value=>`排除地区 ${regionLabel([value])}`)];if(changes.bottomLineMode)saved.push(`学校性质/费用底线 ${changes.bottomLineMode}`);blocks.push({type:'family_constraint_saved',title:'已保存为家庭长期底线',text:saved.length?saved.join('；'):'已保存这条家庭长期底线。'});}",
  'family save feedback'
);

patchFile(
  'functions/_lib/ai/turn-orchestrator.js',
  "const taskAction=command.operation==='branch'?'branch':workspace?.mainTaskId?'update_main':'create_main';return{ok:true,pendingConfirmation:false,command,taskAction,resolvedView:view,commitView:resolved.commitView,result,delta,blocks,event:{type:'command_committed',payload:{command,taskAction,resolvedView:view,commitView:resolved.commitView}},provider:",
  "const taskAction=command.operation==='branch'?'branch':command.operation==='save'&&command.persistence==='family'?'none':workspace?.mainTaskId?'update_main':'create_main';return{ok:true,pendingConfirmation:false,command,taskAction,resolvedView:view,commitView:resolved.commitView,result,delta,blocks,event:{type:'command_committed',payload:{command,taskAction,resolvedView:view,commitView:resolved.commitView}},provider:",
  'family task action'
);

fs.rmSync(new URL(import.meta.url));
console.log('patched family persistence as profile-only command');
