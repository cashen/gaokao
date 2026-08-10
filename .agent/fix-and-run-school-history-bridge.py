from pathlib import Path

patch = Path('.agent/patch-ai-school-history-bridge.py')
text = patch.read_text()
marker = "workflow = Path('.github/workflows/verify-ai-workspace-v3990_1.yml')"
if marker not in text:
    raise SystemExit('old workflow modification block missing')
text = text.split(marker, 1)[0]
text += "workspace_verifier = Path('tools/verify-ai-workspace-v3990_1.mjs')\n"
text += "vtext = workspace_verifier.read_text()\n"
text += "old = \"function testAiSchoolHistoryAdapterBoundary(){const registry=read('functions/_lib/ai/tool-registry.js'),adapter=read('functions/_lib/ai/school-history-adapter.js');assert.equal(registry.includes('onRequest as schoolMajorsOnRequest'),false,'AI base graph must not statically carry public school-majors endpoint');assert.equal(registry.includes('school-query-provider.v3969'),false,'AI base graph must not statically carry full school resolver provider');assert.ok(registry.includes('queryAiSchoolHistory'));assert.ok(adapter.includes('loadMatchingRecords'));assert.ok(adapter.includes('liaoning-2026-admission-school-directory.v3969_0.json'));assert.ok(adapter.includes('context?.env?.ASSETS?.fetch'));assert.equal(adapter.includes('createSchoolNameResolver'),false,'AI history adapter must rely on upstream canonical school resolution instead of copying alias logic');}\"\n"
text += "new = \"function testAiSchoolHistoryAdapterBoundary(){const registry=read('functions/_lib/ai/tool-registry.js'),orchestrator=read('functions/_lib/ai/turn-orchestrator.js'),app=read('ai/app.v3990_1.js');assert.equal(registry.includes('onRequest as schoolMajorsOnRequest'),false,'AI base graph must not statically carry public school-majors endpoint');assert.equal(registry.includes('school-query-provider.v3969'),false,'AI base graph must not statically carry full school resolver provider');assert.equal(registry.includes('queryAiSchoolHistory'),false,'AI base graph must not statically carry school-history chunk scanner');assert.equal(registry.includes('school-history-adapter.js'),false,'AI base graph must not statically import school-history adapter');assert.ok(registry.includes(\\\"kind:'school_history'\\\"));assert.ok(registry.includes(\\\"new URL('/api/school-majors'\\\"));assert.ok(registry.includes(\\\"url.searchParams.set('schoolIntent','school')\\\"));assert.ok(orchestrator.includes('result.history,result.fit'));assert.ok(app.includes(\\\"tool.kind==='school_history'&&tool.url.startsWith('/api/school-majors?')\\\"));assert.ok(app.includes('budget:48*1024'));assert.ok(app.includes('Number(payload?.error_code)===1102'));assert.ok(app.includes('!error?.workerResourceLimit'));}\"\n"
text += "if old not in vtext:\n    raise SystemExit('stale school history boundary test anchor changed')\n"
text += "vtext = vtext.replace(old, new)\n"
text += "hook = \"\\nawait import('./verify-ai-school-history-bridge-v3992_2.mjs');\\n\"\n"
text += "if hook not in vtext:\n    vtext = vtext.rstrip() + hook\n"
text += "workspace_verifier.write_text(vtext)\n"
patch.write_text(text)
exec(compile(text, str(patch), 'exec'), {'__name__': '__main__'})
