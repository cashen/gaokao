import { CURRENT_RELEASE } from '../../../shared/resources/release/current-release.js';

export const LN_RANK_VERSION = Object.freeze({
  display: CURRENT_RELEASE.display,
  asset: CURRENT_RELEASE.asset,
  assetVersion: CURRENT_RELEASE.assetVersion,
  release: CURRENT_RELEASE.release,
  resourceOwnershipVersion: CURRENT_RELEASE.resourceOwnershipVersion
});
