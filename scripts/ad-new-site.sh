#!/usr/bin/env bash
# ad-new-site.sh — register a site row in state/sites.json and scaffold its manifest.
# Contract: references/state-layout.md (§ state/sites.json, § data/<site-id>/manifest.md).
#
# Usage:
#   ad-new-site.sh <site-id> [HOME] [--owner <name>] [--domain <domain>]
#                              [--plan free|paid] [--repo <url|path>] [--session <lock-id>]
#
# <site-id> is a short, stable, lowercase slug (a-z 0-9 and single hyphens, <= 40 chars).
# A row is appended to HOME/state/sites.json with status 'registered' and the fields
# id, owner, domain, plan, repo, status, created, updated; HOME/data/<site-id>/manifest.md is
# created from the reference template, and the registration is recorded in decisions.log.
# An existing site is never overwritten. Plan defaults to 'free' (no paid service is approved
# until the owner says so); owner/domain/repo default to "" (unknown until the intake records them).
#
# HOME defaults to $AD_HOME, else $PWD/ad-home. A HOME argument overrides $AD_HOME.
# $AD_HOME is the only environment contract. Nothing is written outside the home; a site repo
# is never touched. The registry is rewritten via a temp file and moved, never in place.
#
# Lock: the lock owner token is resolved by ad-lock.sh as $AD_SESSION_ID -> --session <lock-id>
# (tagged 'session:<id>') -> pid:$PPID (the invoking shell). Note --owner here names the site's
# owner (a person), not the lock token. If another live session holds state/.lock the write is
# refused (read-only, exit 1) and the lock is never touched. A lock held by a dead 'pid:<n>' is
# reclaimed in exactly one place (ad-lock.sh) and re-acquired as this invocation's token; a
# 'session:<id>' lock is never reclaimed. An unreadable or unknown token is a refusal (exit 2).
# Exit: 0 ok, 1 lock held elsewhere, 2 refusal (bad input, duplicate id, bad state).
set -euo pipefail

SELF="ad-new-site"
err() { echo "$SELF: ERROR: $*" >&2; exit 2; }

AD_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=ad-lock.sh
. "$AD_SCRIPT_DIR/ad-lock.sh"

ID="${1:-}"
[ -n "$ID" ] || err "usage: ad-new-site.sh <site-id> [HOME] [--owner <name>] [--domain <domain>] [--plan free|paid] [--repo <url|path>] [--session <lock-id>]"
shift

HOME_ARG=""
OWNER=""
DOMAIN=""
PLAN="free"
REPO=""
AD_OWNER_ARG=""
while [ $# -gt 0 ]; do
  case "$1" in
    --owner)
      [ $# -ge 2 ] || err "--owner needs a value (the site owner's name)"
      case "$2" in --*) err "--owner needs a value, got option '$2'" ;; esac
      OWNER="$2"; shift 2 ;;
    --session)
      [ $# -ge 2 ] || err "--session needs a value"
      case "$2" in --*) err "--session needs a value, got option '$2'" ;; esac
      [ -z "$AD_OWNER_ARG" ] || err "give only one --session"
      AD_OWNER_ARG="session:$2"; shift 2 ;;
    --domain)
      [ $# -ge 2 ] || err "--domain needs a value (use '' for not chosen yet)"
      case "$2" in --*) err "--domain needs a value, got option '$2'" ;; esac
      DOMAIN="$2"; shift 2 ;;
    --plan)
      [ $# -ge 2 ] || err "--plan needs a value: free|paid"
      case "$2" in --*) err "--plan needs a value, got option '$2'" ;; esac
      PLAN="$2"; shift 2 ;;
    --repo)
      [ $# -ge 2 ] || err "--repo needs a value"
      case "$2" in --*) err "--repo needs a value, got option '$2'" ;; esac
      REPO="$2"; shift 2 ;;
    --*) err "unknown option '$1'" ;;
    *) [ -z "$HOME_ARG" ] || err "unexpected extra argument '$1'"; HOME_ARG="$1"; shift ;;
  esac
done

case "$ID" in
  ''|*[!a-z0-9-]*) err "bad site id '$ID': lowercase slug of a-z, 0-9 and single hyphens" ;;
  -*|*-|*--*) err "bad site id '$ID': no leading, trailing or doubled hyphen" ;;
esac
[ "${#ID}" -le 40 ] || err "bad site id '$ID': longer than 40 characters"
case "$PLAN" in free|paid) ;; *) err "bad plan '$PLAN': expected free|paid" ;; esac
case "$OWNER$DOMAIN$REPO" in
  *$'\n'*|*$'\r'*) err "values must be single-line" ;;
esac

if [ -n "$HOME_ARG" ]; then
  AD_HOME_DIR="$HOME_ARG"
elif [ -n "${AD_HOME:-}" ]; then
  AD_HOME_DIR="$AD_HOME"
else
  AD_HOME_DIR="$(pwd)/ad-home"
fi
AD_HOME_DIR="${AD_HOME_DIR%/}"
[ -n "$AD_HOME_DIR" ] || err "empty home path"
STATE="$AD_HOME_DIR/state/sites.json"
LOCK_DIR="$AD_HOME_DIR/state/.lock"
SITE_DIR="$AD_HOME_DIR/data/$ID"
MANIFEST="$SITE_DIR/manifest.md"
LOG="$SITE_DIR/decisions.log"

# lock_guard: the one lock decision for this write, shared by all ad-* commands (ad-lock.sh).
lock_guard() { ad_guard_write "$LOCK_DIR" "$(ad_token)"; }

lock_guard

[ -f "$STATE" ] || err "no $STATE — run ad-home.sh init first"
jq -e '(.sites | type) == "array"' "$STATE" >/dev/null 2>&1 \
  || err "$STATE is not a valid registry; refusing to touch it"
jq -e --arg id "$ID" '[.sites[] | select(.id == $id)] | length == 0' "$STATE" >/dev/null \
  || err "site '$ID' already registered (duplicate id); refusing to overwrite"
[ ! -e "$SITE_DIR" ] \
  || err "data/$ID already exists but '$ID' is not registered; inspect it before registering"

NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
ROW="$(jq -nc \
  --arg id "$ID" --arg owner "$OWNER" --arg domain "$DOMAIN" --arg plan "$PLAN" \
  --arg repo "$REPO" --arg status "registered" --arg created "$NOW" --arg updated "$NOW" \
  '{id:$id,owner:$owner,domain:$domain,plan:$plan,repo:$repo,status:$status,created:$created,updated:$updated}')"
TMP="$STATE.tmp.$$"
jq --argjson row "$ROW" '.sites += [$row]' "$STATE" > "$TMP"
jq -e '(.sites | type) == "array"' "$TMP" >/dev/null 2>&1 \
  || { rm -f "$TMP"; err "registry update produced invalid JSON; state/sites.json untouched"; }

mkdir -p "$SITE_DIR"
{
  printf '# Site manifest — %s\n\n' "$ID"
  printf '%s\n' "- id: $ID"
  printf '%s\n' "- owner: $OWNER"
  printf '%s\n' "- domain: $DOMAIN"
  printf '%s\n' "- plan: $PLAN"
  printf '%s\n' "- status: registered"
  printf '%s\n' "- created: $NOW"
  printf '%s\n' "- updated: $NOW"
  cat <<'TEMPLATE'

## Identity
- name as it appears:
- role / one-liner:
- primary audience:
- voice:
- placeholder name in use:

## Stack decisions
- stack: frozen reference stack (unchanged)
- deviations: none
- model/tooling notes:

## Accounts
| Purpose | Account | Status |
|---|---|---|

## URLs
- staging:
- production:
TEMPLATE
  printf '%s\n' "- repo: $REPO"
  cat <<'TEMPLATE'

## Open items
- none
TEMPLATE
} > "$MANIFEST.tmp.$$"

printf '[%s] intake: registered site %s\n' "$NOW" "$ID" > "$LOG.tmp.$$"

mv "$MANIFEST.tmp.$$" "$MANIFEST"
mv "$LOG.tmp.$$" "$LOG"
mv "$TMP" "$STATE"

echo "$SELF: registered $ID (status=registered, plan=$PLAN)"
echo "$SELF: manifest: $MANIFEST"
echo "$SELF: decisions log: $LOG"
