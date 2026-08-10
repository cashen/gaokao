from pathlib import Path

endpoint_path=Path('functions/api/school-majors.js')
verifier_path=Path('tools/verify-ai-school-history-bridge-v3992_2.mjs')
workspace_path=Path('tools/verify-ai-workspace-v3990_1.mjs')

endpoint=endpoint_path.read_text(encoding='utf-8')
old="import { loadMatchingRecords, loadMatchingRecordsFromFiles } from '../_lib/ln-rank-manifest.js';"
new="import { loadMatchingRecords, loadExactSchoolRecordsFromFiles } from '../_lib/ln-rank-manifest.js';"
if endpoint.count(old)!=1: raise SystemExit(f'endpoint import marker count {endpoint.count(old)}')
endpoint=endpoint.replace(old,new,1)
old_block="""    const acceptedNames = acceptedNamesForSelection(selection, entity);\n    const chunkFiles2026 = Array.isArray(selection?.chunkFiles2026) ? selection.chunkFiles2026 : [];\n    const exactLoad = chunkFiles2026.length\n      ? await loadMatchingRecordsFromFiles(context.request, context.env || {}, chunkFiles2026, raw => acceptedNames.has(normalizeUnifiedSchoolName(rawSchool(raw))))\n      : await loadMatchingRecords(context.request, context.env || {}, raw => acceptedNames.has(normalizeUnifiedSchoolName(rawSchool(raw))));\n"""
new_block="""    const acceptedNames = acceptedNamesForSelection(selection, entity);\n    const chunkFiles2026 = Array.isArray(selection?.chunkFiles2026) ? selection.chunkFiles2026 : [];\n    const exactSchoolNames2026 = [...new Set([\n      ...(Array.isArray(selection?.admissionNames) ? selection.admissionNames : []),\n      selection?.admissionName,\n      selection?.officialName\n    ].map(value => String(value || '').trim()).filter(Boolean))];\n    const matchExactSchool = raw => acceptedNames.has(normalizeUnifiedSchoolName(rawSchool(raw)));\n    const exactLoad = chunkFiles2026.length && exactSchoolNames2026.length\n      ? await loadExactSchoolRecordsFromFiles(context.request, context.env || {}, chunkFiles2026, exactSchoolNames2026, matchExactSchool)\n      : await loadMatchingRecords(context.request, context.env || {}, matchExactSchool);\n"""
if endpoint.count(old_block)!=1: raise SystemExit(f'endpoint exact-load marker count {endpoint.count(old_block)}')
endpoint=endpoint.replace(old_block,new_block,1)
old_source="""        mode: chunkFiles2026.length ? 'unified-school-query-exact-admission-chunks' : 'unified-school-query-exact-admission-names',\n        chunkFiles2026\n"""
new_source="""        mode: chunkFiles2026.length ? 'unified-school-query-exact-admission-chunks' : 'unified-school-query-exact-admission-names',\n        chunkFiles2026,\n        chunkReadModes: Array.isArray(exactLoad.modes) ? exactLoad.modes : []\n"""
if endpoint.count(old_source)!=1: raise SystemExit(f'endpoint source marker count {endpoint.count(old_source)}')
endpoint=endpoint.replace(old_source,new_source,1)
endpoint_path.write_text(endpoint,encoding='utf-8')

verifier=verifier_path.read_text(encoding='utf-8')
old="import { loadMatchingRecordsFromFiles } from '../functions/_lib/ln-rank-manifest.js';"
new="import { loadMatchingRecordsFromFiles, loadExactSchoolRecordsFromFiles } from '../functions/_lib/ln-rank-manifest.js';"
if verifier.count(old)!=1: raise SystemExit(f'verifier import marker count {verifier.count(old)}')
verifier=verifier.replace(old,new,1)
old="assert.ok(manifestLoader.includes('loadMatchingRecordsFromFiles'),'bounded manifest loader missing');\nassert.ok(manifestLoader.includes(\"mode: 'record-stream'\"),'matching loader must stream individual records');\nassert.ok(endpoint.includes('chunkFiles2026.length')&&endpoint.includes('loadMatchingRecordsFromFiles'),'school-majors must use exact-school chunk locator');"
new="assert.ok(manifestLoader.includes('loadMatchingRecordsFromFiles'),'bounded manifest loader missing');\nassert.ok(manifestLoader.includes('loadExactSchoolRecordsFromFiles'),'exact-school native loader missing');\nassert.ok(manifestLoader.includes(\"mode: 'record-stream'\"),'matching loader must stream individual records');\nassert.ok(manifestLoader.includes(\"mode: 'exact-school-native-text-scan'\"),'exact-school native text scan marker missing');\nassert.ok(endpoint.includes('chunkFiles2026.length')&&endpoint.includes('loadExactSchoolRecordsFromFiles'),'school-majors must use exact-school native chunk loader');"
if verifier.count(old)!=1: raise SystemExit(f'verifier source assertion marker count {verifier.count(old)}')
verifier=verifier.replace(old,new,1)
anchor="""  assert.equal(streamed.records.length,Number(industrial.recordCount2026),'streaming exact-school record count drift');\n  const allFiles=[...chunkFiles];\n"""
insert="""  assert.equal(streamed.records.length,Number(industrial.recordCount2026),'streaming exact-school record count drift');\n  for(const schoolEntry of [industrial,aviation,science]){\n    const accepted=new Set([schoolEntry.officialName,...(schoolEntry.admissionNames||[])]);\n    const expected=schoolEntry.chunkFiles2026.flatMap(chunkRows).filter(raw=>accepted.has(String(rawSchool(raw)||'').trim()));\n    const exact=await loadExactSchoolRecordsFromFiles(request,env,schoolEntry.chunkFiles2026,[...(schoolEntry.admissionNames||[]),schoolEntry.officialName],raw=>accepted.has(String(rawSchool(raw)||'').trim()));\n    assert.deepEqual(exact.records,expected,`native exact-school truth set drift: ${schoolEntry.officialName}`);\n    assert.equal(exact.records.length,Number(schoolEntry.recordCount2026),`native exact-school record count drift: ${schoolEntry.officialName}`);\n    assert.ok(exact.modes.length===schoolEntry.chunkFiles2026.length&&exact.modes.every(mode=>mode==='exact-school-native-text-scan'),`native exact-school fast path did not hold: ${schoolEntry.officialName} ${exact.modes.join(',')}`);\n  }\n  const allFiles=[...chunkFiles];\n"""
if verifier.count(anchor)!=1: raise SystemExit(f'verifier native test anchor count {verifier.count(anchor)}')
verifier=verifier.replace(anchor,insert,1)
old_console="""console.log(JSON.stringify({ok:true,checks:['no-static-school-history-adapter','reuse-public-school-majors','history-fit-continuation','48k-school-history-bridge-budget','1102-no-retry','record-stream-no-response-json','stream-truth-set-equal'],streamedSchool:'沈阳工业大学',sourceRecords:manifest.totalRecords},null,2));"""
new_console="""console.log(JSON.stringify({ok:true,checks:['no-static-school-history-adapter','reuse-public-school-majors','history-fit-continuation','48k-school-history-bridge-budget','1102-no-retry','record-stream-no-response-json','stream-truth-set-equal','exact-school-native-text-scan-truth-set-equal'],streamedSchools:['沈阳工业大学','沈阳航空航天大学','辽宁科技大学'],sourceRecords:manifest.totalRecords},null,2));"""
if verifier.count(old_console)!=1: raise SystemExit(f'verifier console marker count {verifier.count(old_console)}')
verifier=verifier.replace(old_console,new_console,1)
verifier_path.write_text(verifier,encoding='utf-8')

workspace=workspace_path.read_text(encoding='utf-8')
old="assert.ok(/for\\s*\\(const chunk of chunks\\)/.test(manifest));assert.ok(manifest.includes('streamMatchingRows'));assert.ok(manifest.includes(\"mode: 'record-stream'\"));assert.ok(manifest.includes('env?.ASSETS?.fetch'));"
new="assert.ok(/for\\s*\\(const chunk of chunks\\)/.test(manifest));assert.ok(manifest.includes('streamMatchingRows'));assert.ok(manifest.includes(\"mode: 'record-stream'\"));assert.ok(manifest.includes('loadExactSchoolRecordsFromFiles'));assert.ok(manifest.includes(\"mode: 'exact-school-native-text-scan'\"));assert.ok(manifest.includes('env?.ASSETS?.fetch'));"
if workspace.count(old)!=1: raise SystemExit(f'workspace manifest assertion marker count {workspace.count(old)}')
workspace=workspace.replace(old,new,1)
workspace_path.write_text(workspace,encoding='utf-8')
print('patched endpoint + school-history verifier + workspace source gate')
