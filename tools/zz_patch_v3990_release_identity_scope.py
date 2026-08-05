from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one anchor, got {count}")
    return text.replace(old, new, 1)


path = Path('tools/audit-production-resource-verification-v3990_0.mjs')
text = path.read_text(encoding='utf-8')
anchor = "const deployWorkflow = fs.readFileSync('.github/workflows/deploy-cloudflare-pages-main.yml', 'utf8');"
block = """const productionReleaseWorkflow = fs.readFileSync('.github/workflows/verify-production-release-v3970.yml', 'utf8');
for (const marker of [
  'functions/api/pages-deployment-identity.js',
  "VERIFY_DEPLOYMENT_IDENTITY: 'false'",
  "VERIFY_DEPLOYMENT_IDENTITY: 'true'",
  'EXPECTED_DEPLOYMENT_BRANCH: main',
  'verify-production-resource-graph-v3990_0.mjs'
]) assert.ok(productionReleaseWorkflow.includes(marker), `production release workflow missing ${marker}`);
assert.equal(
  (productionReleaseWorkflow.match(/VERIFY_DEPLOYMENT_IDENTITY: 'false'/g) || []).length,
  1,
  'production release local identity bypass must appear exactly once'
);
assert.ok(
  productionReleaseWorkflow.indexOf("VERIFY_DEPLOYMENT_IDENTITY: 'false'")
    < productionReleaseWorkflow.indexOf('production-release:'),
  'production release identity bypass escaped local source job'
);
assert.ok(
  productionReleaseWorkflow.indexOf("VERIFY_DEPLOYMENT_IDENTITY: 'true'")
    > productionReleaseWorkflow.indexOf('production-release:'),
  'production release production job does not force identity verification'
);

const deployWorkflow = fs.readFileSync('.github/workflows/deploy-cloudflare-pages-main.yml', 'utf8');"""
text = replace_once(text, anchor, block, 'production release workflow audit')
path.write_text(text, encoding='utf-8')
