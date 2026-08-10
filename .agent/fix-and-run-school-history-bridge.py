from pathlib import Path

patch = Path('.agent/patch-ai-school-history-bridge.py')
text = patch.read_text()
marker = "workflow = Path('.github/workflows/verify-ai-workspace-v3990_1.yml')"
if marker not in text:
    raise SystemExit('old workflow modification block missing')
text = text.split(marker, 1)[0]
text += "workspace_verifier = Path('tools/verify-ai-workspace-v3990_1.mjs')\n"
text += "vtext = workspace_verifier.read_text()\n"
text += "hook = \"\\nawait import('./verify-ai-school-history-bridge-v3992_2.mjs');\\n\"\n"
text += "if hook not in vtext:\n    workspace_verifier.write_text(vtext.rstrip() + hook)\n"
patch.write_text(text)
exec(compile(text, str(patch), 'exec'), {'__name__': '__main__'})
