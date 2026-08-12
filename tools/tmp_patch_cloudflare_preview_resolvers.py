from pathlib import Path

FILES = [
    Path('.github/workflows/verify-production-api-health-v3971.yml'),
    Path('.github/workflows/verify-major-bands-bounded-fanout-v3972_5.yml'),
]

OLD_PROD = '''          short_sha="${EXPECTED_SHA:0:7}"
          preview_base=''
          for attempt in $(seq 1 70); do
            checks="$(curl -fsSL --max-time 20 -H 'Accept: application/vnd.github+json' -H "Authorization: Bearer ${GH_TOKEN}" -H 'X-GitHub-Api-Version: 2022-11-28' "https://api.github.com/repos/${GH_REPOSITORY}/commits/${EXPECTED_SHA}/check-runs?per_page=100" || true)"
            conclusion="$(jq -r '[.check_runs[]? | select(.name == "Cloudflare Pages")][0].conclusion // empty' <<<"$checks" 2>/dev/null || true)"
            if [ "$conclusion" = failure ] || [ "$conclusion" = cancelled ]; then exit 2; fi
            if [ "$conclusion" = success ]; then
              comments="$(curl -fsSL --max-time 20 -H 'Accept: application/vnd.github+json' -H "Authorization: Bearer ${GH_TOKEN}" -H 'X-GitHub-Api-Version: 2022-11-28' "https://api.github.com/repos/${GH_REPOSITORY}/issues/${PR_NUMBER}/comments?per_page=100" || true)"
              body="$(jq -r '[.[]? | select(.user.login == "cloudflare-workers-and-pages[bot]")][-1].body // empty' <<<"$comments" 2>/dev/null || true)"
              if grep -q "$short_sha" <<<"$body"; then preview_base="$(grep -Eo 'https://[A-Za-z0-9-]+\\.gaokao-4y9\\.pages\\.dev' <<<"$body" | tail -n1 || true)"; fi
              [ -n "$preview_base" ] && break
            fi
            sleep 8
          done
          test -n "$preview_base"
'''

NEW_PROD = '''          short_sha="${EXPECTED_SHA:0:7}"
          preview_base=''
          for attempt in $(seq 1 70); do
            checks="$(curl -fsSL --max-time 20 -H 'Accept: application/vnd.github+json' -H "Authorization: Bearer ${GH_TOKEN}" -H 'X-GitHub-Api-Version: 2022-11-28' "https://api.github.com/repos/${GH_REPOSITORY}/commits/${EXPECTED_SHA}/check-runs?per_page=100" || true)"
            conclusion="$(jq -r '[.check_runs[]? | select(.name == "Cloudflare Pages")][0].conclusion // empty' <<<"$checks" 2>/dev/null || true)"
            summary="$(jq -r '[.check_runs[]? | select(.name == "Cloudflare Pages")][0].output.summary // empty' <<<"$checks" 2>/dev/null || true)"
            if [ "$conclusion" = failure ] || [ "$conclusion" = cancelled ]; then exit 2; fi
            if [ "$conclusion" = success ]; then
              mapfile -t summary_urls < <(grep -Eo 'https://[A-Za-z0-9-]+\\.gaokao-4y9\\.pages\\.dev' <<<"$summary" | awk '!seen[$0]++')
              if [ "${#summary_urls[@]}" -ge 2 ]; then preview_base="${summary_urls[1]}"; fi
              if [ -z "$preview_base" ]; then
                comments="$(curl -fsSL --max-time 20 -H 'Accept: application/vnd.github+json' -H "Authorization: Bearer ${GH_TOKEN}" -H 'X-GitHub-Api-Version: 2022-11-28' "https://api.github.com/repos/${GH_REPOSITORY}/issues/${PR_NUMBER}/comments?per_page=100" || true)"
                body="$(jq -r '[.[]? | select(.user.login == "cloudflare-workers-and-pages[bot]")][-1].body // empty' <<<"$comments" 2>/dev/null || true)"
                if grep -q "$short_sha" <<<"$body"; then preview_base="$(grep -Eo 'https://[A-Za-z0-9-]+\\.gaokao-4y9\\.pages\\.dev' <<<"$body" | tail -n1 || true)"; fi
              fi
              [ -n "$preview_base" ] && break
            fi
            sleep 8
          done
          test -n "$preview_base"
'''

OLD_MAJOR = '''          short_sha="${EXPECTED_SHA:0:7}"
          target=''
          for attempt in $(seq 1 70); do
            checks="$(curl -fsSL --max-time 20 -H 'Accept: application/vnd.github+json' -H "Authorization: Bearer ${GH_TOKEN}" -H 'X-GitHub-Api-Version: 2022-11-28' "https://api.github.com/repos/${GH_REPOSITORY}/commits/${EXPECTED_SHA}/check-runs?per_page=100" || true)"
            conclusion="$(jq -r '[.check_runs[]? | select(.name == "Cloudflare Pages")][0].conclusion // empty' <<<"$checks" 2>/dev/null || true)"
            if [ "$conclusion" = failure ] || [ "$conclusion" = cancelled ]; then exit 2; fi
            if [ "$conclusion" = success ]; then
              comments="$(curl -fsSL --max-time 20 -H 'Accept: application/vnd.github+json' -H "Authorization: Bearer ${GH_TOKEN}" -H 'X-GitHub-Api-Version: 2022-11-28' "https://api.github.com/repos/${GH_REPOSITORY}/issues/${PR_NUMBER}/comments?per_page=100" || true)"
              body="$(jq -r '[.[]? | select(.user.login == "cloudflare-workers-and-pages[bot]")][-1].body // empty' <<<"$comments" 2>/dev/null || true)"
              if grep -q "$short_sha" <<<"$body"; then
                target="$(grep -Eo 'https://[A-Za-z0-9-]+\\.gaokao-4y9\\.pages\\.dev' <<<"$body" | tail -n1 || true)"
              fi
              [ -n "$target" ] && break
            fi
            sleep 8
          done
          test -n "$target"
'''

NEW_MAJOR = '''          short_sha="${EXPECTED_SHA:0:7}"
          target=''
          for attempt in $(seq 1 70); do
            checks="$(curl -fsSL --max-time 20 -H 'Accept: application/vnd.github+json' -H "Authorization: Bearer ${GH_TOKEN}" -H 'X-GitHub-Api-Version: 2022-11-28' "https://api.github.com/repos/${GH_REPOSITORY}/commits/${EXPECTED_SHA}/check-runs?per_page=100" || true)"
            conclusion="$(jq -r '[.check_runs[]? | select(.name == "Cloudflare Pages")][0].conclusion // empty' <<<"$checks" 2>/dev/null || true)"
            summary="$(jq -r '[.check_runs[]? | select(.name == "Cloudflare Pages")][0].output.summary // empty' <<<"$checks" 2>/dev/null || true)"
            if [ "$conclusion" = failure ] || [ "$conclusion" = cancelled ]; then exit 2; fi
            if [ "$conclusion" = success ]; then
              mapfile -t summary_urls < <(grep -Eo 'https://[A-Za-z0-9-]+\\.gaokao-4y9\\.pages\\.dev' <<<"$summary" | awk '!seen[$0]++')
              if [ "${#summary_urls[@]}" -ge 2 ]; then target="${summary_urls[1]}"; fi
              if [ -z "$target" ]; then
                comments="$(curl -fsSL --max-time 20 -H 'Accept: application/vnd.github+json' -H "Authorization: Bearer ${GH_TOKEN}" -H 'X-GitHub-Api-Version: 2022-11-28' "https://api.github.com/repos/${GH_REPOSITORY}/issues/${PR_NUMBER}/comments?per_page=100" || true)"
                body="$(jq -r '[.[]? | select(.user.login == "cloudflare-workers-and-pages[bot]")][-1].body // empty' <<<"$comments" 2>/dev/null || true)"
                if grep -q "$short_sha" <<<"$body"; then target="$(grep -Eo 'https://[A-Za-z0-9-]+\\.gaokao-4y9\\.pages\\.dev' <<<"$body" | tail -n1 || true)"; fi
              fi
              [ -n "$target" ] && break
            fi
            sleep 8
          done
          test -n "$target"
'''

for path in FILES:
    src = path.read_text(encoding='utf-8')
    if path.name == 'verify-production-api-health-v3971.yml':
        old, new = OLD_PROD, NEW_PROD
    else:
        old, new = OLD_MAJOR, NEW_MAJOR
    if src.count(old) != 1:
        raise SystemExit(f'{path}: expected resolver block once, got {src.count(old)}')
    patched = src.replace(old, new, 1)
    out = Path('tools') / ('tmp_generated_' + path.name)
    out.write_text(patched, encoding='utf-8')
    print(f'generated {out}')
