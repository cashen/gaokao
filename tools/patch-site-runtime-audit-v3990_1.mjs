import fs from 'node:fs';
const rel='tools/audit-site-runtime-generation-v3990_1.mjs';
let text=fs.readFileSync(rel,'utf8');

const pageBefore="const pageRouteKeys = new Set(['homePage', 'selectionPage', 'familyPlanPage']);";
const pageAfter="const pageRouteKeys = new Set(['homePage', 'selectionPage', 'familyPlanPage', 'aiPage']);";
if(!text.includes(pageBefore))throw new Error('site runtime audit page-route source changed');
text=text.replace(pageBefore,pageAfter);

const keysBefore=`const expectedCurrentKeys = [\n  'familyPlanBootstrap', 'familyPlanEntry', 'familyPlanPage', 'familyPlanRuntime',\n  'familyShell', 'homePage', 'homeRuntime', 'interactionRuntime', 'interactionStyles',\n  'majorBandsBucketLoader', 'majorBandsQueryKernel', 'majorBandsRankIndex',\n  'majorBandsResponseTransport', 'majorBandsResultOrder',\n  'releaseCenter', 'releasePresenter', 'resourceExecution', 'runtimeCache',\n  'selectionBootstrap', 'selectionPage', 'selectionRuntime', 'selectionWorkspace'\n].sort();`;
const keysAfter=`const expectedCurrentKeys = [\n  'aiPage', 'aiRuntime', 'aiStyles', 'aiWorkspaceContract',\n  'familyPlanBootstrap', 'familyPlanEntry', 'familyPlanPage', 'familyPlanRuntime',\n  'familyShell', 'homePage', 'homeRuntime', 'interactionRuntime', 'interactionStyles',\n  'majorBandsBucketLoader', 'majorBandsFilter', 'majorBandsQueryKernel', 'majorBandsRankIndex',\n  'majorBandsRegionCatalog', 'majorBandsResponseTransport', 'majorBandsResultOrder',\n  'releaseCenter', 'releasePresenter', 'resourceExecution', 'runtimeCache',\n  'selectionBootstrap', 'selectionPage', 'selectionRuntime', 'selectionWorkspace'\n].sort();`;
if(!text.includes(keysBefore))throw new Error('site runtime audit expected-owner source changed');
text=text.replace(keysBefore,keysAfter);

const policyBefore="assert.ok(SITE_RUNTIME_CONTRACT.policies.majorBandsPublicHttpSelfFanoutForbidden);";
const policyAfter=`assert.ok(SITE_RUNTIME_CONTRACT.policies.majorBandsPublicHttpSelfFanoutForbidden);\nassert.ok(SITE_RUNTIME_CONTRACT.policies.aiModelCannotOwnBusinessFacts);\nassert.ok(SITE_RUNTIME_CONTRACT.policies.aiTemporaryViewCannotBecomeFamilyConstraint);\nassert.ok(SITE_RUNTIME_CONTRACT.policies.aiLatestRequestOnlyCanCommit);`;
if(!text.includes(policyBefore))throw new Error('site runtime audit policy source changed');
text=text.replace(policyBefore,policyAfter);

fs.writeFileSync(rel,text);
fs.rmSync(new URL(import.meta.url));
console.log('patched strict v3990_1 site-runtime owner contract');
