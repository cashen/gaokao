#!/usr/bin/env bash
set -euo pipefail

PLAYWRIGHT_VERSION="${PLAYWRIGHT_VERSION:-1.55.0}"

npm install --no-save --no-package-lock "playwright@${PLAYWRIGHT_VERSION}"

# GitHub-hosted Ubuntu images already carry the Chromium runtime libraries used by
# our browser gates. Install the browser binary first so transient apt mirrors do
# not own release readiness. If the actual browser cannot launch, fall back to
# Playwright's system-dependency installer and prove launch again.
npx playwright install chromium

if node --input-type=module <<'NODE'
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true});
await browser.close();
NODE
then
  echo "Playwright Chromium launch verified without system dependency mutation."
  exit 0
fi

echo "Chromium launch needs additional system dependencies; invoking Playwright fallback." >&2
npx playwright install --with-deps chromium
node --input-type=module <<'NODE'
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true});
await browser.close();
NODE
