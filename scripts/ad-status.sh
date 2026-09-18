#!/usr/bin/env bash
# ad-status.sh — read-only summary of the ai-distribution home: layout, lock holder, sites.
# Contract: references/state-layout.md (§ ad-home/ layout, § state/sites.json, § Lock).
#
# Usage: ad-status.sh [HOME]
#
# Prints the layout state, the lock holder (with the stale/live judgement for a pid token), and
# every registered site with its status. A site whose data/<site-id>/manifest.md is missing is
# flagged. Nothing is written and nothing is repaired: this is the disk truth for reconciliation,
# so a missing or unreadable file is reported, never guessed at or fixed here.
#
# HOME defaults to $AD_HOME, else $PWD/ad-home. A HOME argument overrides $AD_HOME.
# $AD_HOME is the only environment contract. Exit: 0 report produced, 2 bad usage/home argument.
set -euo pipefail

SELF="ad-status"
err() { echo "$SELF: ERROR: $*" >&2; exit 2; }

AD_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=ad-lock.sh
. "$AD_SCRIPT_DIR/ad-lock.sh"

HOME_ARG="${1:-}"
case "${2:-}" in
  '') ;;
  *) err "usage: ad-status.sh [HOME]" ;;
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

echo "== ad-home: $AD_HOME_DIR"

# -- layout -----------------------------------------------------------------------------------
if [ -d "$AD_HOME_DIR/state" ]; then
  echo "layout: state/ present"
else
  echo "layout: state/ MISSING (run ad-home.sh init)"
fi
if [ -d "$AD_HOME_DIR/data" ]; then
  echo "layout: data/ present ($(find "$AD_HOME_DIR/data" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ') site dir(s))"
else
  echo "layout: data/ MISSING (run ad-home.sh init)"
fi

# -- lock -------------------------------------------------------------------------------------
# Read-only: classify through the same ad-lock.sh probe the writing commands use, so the report
# cannot disagree with what ad-home.sh lock / ad-new-site.sh / ad-update.sh will decide.
probe="$(ad_lock_probe "$LOCK_DIR" "")"
since=""
if [ "$probe" != "free" ] && [ -f "$LOCK_DIR/acquired" ]; then
  since=" since $(cat "$LOCK_DIR/acquired" 2>/dev/null || true)"
fi
case "$probe" in
  free)
    echo "lock: free" ;;
  notdir)
    echo "lock: state/.lock exists but is not a directory — inspect it and ask the owner" ;;
  unreadable)
    echo "lock: held, owner token unreadable or missing — fail-closed, ask the owner" ;;
  unknown:*)
    echo "lock: held by '${probe#unknown:}' (unknown or malformed token — ask the owner)" ;;
  live-pid:*)
    echo "lock: held by pid:${probe#live-pid:} (process alive)$since" ;;
  dead-pid:*)
    echo "lock: held by pid:${probe#dead-pid:} (STALE — process gone; the next ad-* command reclaims it)$since" ;;
  session:*)
    echo "lock: held by session:${probe#session:} (assumed live; never reclaimed by guessing)$since" ;;
esac

# -- registry ---------------------------------------------------------------------------------
if [ ! -e "$STATE" ]; then
  echo "registry: state/sites.json MISSING (run ad-home.sh init)"
  echo "-- sites: unknown"
  exit 0
fi
if ! jq -e '(.sites | type) == "array"' "$STATE" >/dev/null 2>&1; then
  echo "registry: state/sites.json is present but not a valid registry — not reading it"
  echo "-- sites: unknown"
  exit 0
fi

COUNT="$(jq '.sites | length' "$STATE")"
echo "registry: state/sites.json ($COUNT site(s))"
echo "-- sites"
if [ "$COUNT" -eq 0 ]; then
  echo "  (none registered; ad-new-site.sh <id> to add one)"
  echo "-- issues: 0"
  exit 0
fi

# Unit separator, not a tab: tab is IFS whitespace and would collapse empty fields.
ISSUES=0
while IFS=$'\037' read -r id status plan domain owner updated; do
  [ -n "$id" ] || continue
  [ -n "$status" ] || status="(unset)"
  [ -n "$plan" ] || plan="(unset)"
  [ -n "$domain" ] || domain="(none)"
  [ -n "$owner" ] || owner="(unset)"
  manifest="$AD_HOME_DIR/data/$id/manifest.md"
  printf '  [%s] %s  plan=%s  domain=%s  owner=%s  updated=%s\n' \
    "$status" "$id" "$plan" "$domain" "$owner" "${updated:-(unknown)}"
  if [ ! -f "$manifest" ]; then
    printf '        !! manifest MISSING: data/%s/manifest.md\n' "$id"
    ISSUES=$((ISSUES + 1))
  fi
done < <(jq -r '.sites[] | [ (.id // ""), (.status // ""), (.plan // ""), (.domain // ""), (.owner // ""), (.updated // "") ] | join("\u001f")' "$STATE")

echo "-- issues: $ISSUES"
