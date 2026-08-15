from pathlib import Path
p=Path(__file__).resolve().parents[1]/'functions/_lib/ai/turn-orchestrator.js'
t=p.read_text()
t=t.replace("import {createEvidenceClaim,claimsFromOfficialText,claimToEvidence} from './claim-evidence.js';\nimport {runOfficialWebEvidence} from './official-web-evidence.js';\n","import {claimToEvidence} from './claim-evidence.js';\nimport {runDecisionResearch} from './decision-research-runtime.js';\n")
t=t.replace('__DECISION_HELPER__','')
t=t.replace('executeDecisionResearch(executionContext,context,command,workspace,view,score)','runDecisionResearch(executionContext,context,command,workspace,view,score)')
if "from './decision-research-runtime.js'" not in t: raise SystemExit('decision runtime import missing')
if '__DECISION_HELPER__' in t or 'executeDecisionResearch(' in t: raise SystemExit('temporary helper residue')
p.write_text(t)
