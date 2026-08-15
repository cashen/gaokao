from pathlib import Path
p=Path('tools/verify-ai-school-history-bridge-v3992_2.mjs')
s=p.read_text()
old="""assert.ok(orchestrator.includes('preserveResolvedFocus=false'),'confirmed-command focus preservation boundary missing');
assert.ok(orchestrator.includes('deterministicContinuation=Object.keys(executionContext.aiDeterministicToolResults).length>0'),'deterministic continuation detection missing');
assert.ok(orchestrator.includes('focus:stableFocus'),'resolved focus must survive deterministic continuation');"""
new="""assert.ok(orchestrator.includes('deterministicResolvedCommand'),'confirmed-command continuation must reuse the canonical server resolver');
assert.ok(orchestrator.includes('deterministicContinuation=Object.keys(executionContext.aiDeterministicToolResults).length>0'),'deterministic continuation detection missing');
assert.ok(orchestrator.includes('const fallback=await deterministicResolvedCommand(input,workspace,env,request)'),'confirmed-command continuation must rebuild school/major semantics server-side');
assert.ok(orchestrator.includes('confirmed=await validateConfirmedCommand'),'confirmed-command validation must remain asynchronous so canonical resolution cannot be bypassed');"""
if s.count(old)!=1: raise SystemExit(f'old continuation verifier block count={s.count(old)}')
p.write_text(s.replace(old,new))
