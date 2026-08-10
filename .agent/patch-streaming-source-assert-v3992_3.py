from pathlib import Path
path=Path('tools/verify-ai-workspace-v3990_1.mjs')
text=path.read_text(encoding='utf-8')
old="assert.ok(manifest.includes('for(const chunk of chunks)'));assert.ok(manifest.includes('env?.ASSETS?.fetch'));"
new="assert.ok(/for\\s*\\(const chunk of chunks\\)/.test(manifest));assert.ok(manifest.includes('streamMatchingRows'));assert.ok(manifest.includes(\"mode: 'record-stream'\"));assert.ok(manifest.includes('env?.ASSETS?.fetch'));"
if text.count(old)!=1: raise SystemExit(f'expected one old streaming assertion, got {text.count(old)}')
path.write_text(text.replace(old,new,1),encoding='utf-8')
print('patched',path)
