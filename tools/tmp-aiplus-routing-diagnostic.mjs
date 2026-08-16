import {createAiWorkspace} from '../shared/ai/ai-workspace-contract.v3992_0.js';
import {deterministicCommand,resolveAiSchoolMentionsDetailed} from '../functions/_lib/ai/command-interpreter.js';
import {schoolTopicBoundaryFromText} from '../functions/_lib/ai/human-query-frame.js';

const aliases=new Map([['沈工大','沈阳工业大学']]);
const resolver={resolve(query){const name=aliases.get(query);return name?{status:'resolved',resolvedName:name,matchType:'alias_exact'}:{status:'unresolved',candidates:[]};}};
const prompt='沈工大哪个专业更有积累';
const boundary=schoolTopicBoundaryFromText(prompt);
const resolved=await resolveAiSchoolMentionsDetailed(prompt,resolver);
const command=deterministicCommand(prompt,createAiWorkspace(),resolved.schoolNames,resolved.matchedAliases);
console.log(JSON.stringify({prompt,boundary,resolved:{schoolNames:resolved.schoolNames,matchedAliases:resolved.matchedAliases,unresolvedMentions:resolved.unresolvedMentions},command:{agentTask:command.agentTask,schoolNames:command.schoolNames,majorKeywords:command.majorKeywords,focus:command.focus,executionPolicy:command.executionPolicy}},null,2));
