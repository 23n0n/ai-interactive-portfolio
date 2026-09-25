#!/usr/bin/env bash
# ad-home.sh — init the ai-distribution home layout and manage the session dir-lock.
# Contract: references/state-layout.md (§ ad-home/ layout, § Lock: state/.lock).
#
# Usage:
#   ad-home.sh init [HOME]                          create HOME/{state,data} + state/sites.json
#   ad-home.sh lock [HOME] [--owner <token>]        acquire state/.lock; 0 held, 1 held elsewhere, 2 refusal
#   ad-home.sh unlock [HOME] [--owner <token>]      release the lock held by this token
#   ad-home.sh status [HOME]                        print layout summary + lock state
#
# HOME defaults to $AD_HOME, else $PWD/ad-home. A HOME argument overrides $AD_HOME.
# $AD_HOME is the only environment contract; nothing here knows about any agent or harness.
#
# Owner-token resolution (state/.lock/owner), in this order:
#   1. $AD_SESSION_ID                -> session:<id>  (generic session id; no harness-specific name)
#   2. --owner pid:<n>|session:<id>  -> that explicit, already type-tagged token
#                                       (--session <id> is shorthand for --owner session:<id>)
#   3. otherwise                     -> pid:$PPID      (the INVOKING shell, not this script's $$)
# The owner file always holds one type-tagged token. Only a 'pid:<n>' whose process is gone is
# stale, and ad-lock.sh is the single place that reclaims it; a 'session:<id>' token is never
# reclaimed by guessing. An unreadable token or unknown type is fail-closed: report it, ask the
# owner.
set -euo pipefail

SELF="ad-home"
err() { echo "$SELF: ERROR: $*" >&2; exit 2; }

AD_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=ad-lock.sh
. "$AD_SCRIPT_DIR/ad-lock.sh"

CMD="${1:-}"
[ -n "$CMD" ] || err "usage: ad-home.sh init|lock|unlock|status [HOME] [--owner pid:<n>|session:<id>]"
shift

HOME_ARG=""
AD_OWNER_ARG=""
while [ $# -gt 0 ]; do
  case "$1" in
    --owner)
      [ $# -ge 2 ] || err "--owner needs a value"
      case "$2" in --*) err "--owner needs a value, got option '$2'" ;; esac
      [ -z "$AD_OWNER_ARG" ] || err "give only one of --owner or --session"
      AD_OWNER_ARG="$2"; shift 2 ;;
    --session)
      [ $# -ge 2 ] || err "--session needs a value"
      case "$2" in --*) err "--session needs a value, got option '$2'" ;; esac
      [ -z "$AD_OWNER_ARG" ] || err "give only one of --owner or --session"
      AD_OWNER_ARG="session:$2"; shift 2 ;;
    --*) err "unknown option '$1'" ;;
    *) [ -z "$HOME_ARG" ] || err "unexpected extra argument '$1'"; HOME_ARG="$1"; shift ;;
  esac
done

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

init() {
  mkdir -p "$AD_HOME_DIR/state" "$AD_HOME_DIR/data"
  if [ ! -e "$STATE" ]; then
    printf '{"sites":[]}\n' > "$STATE.tmp.$$"
    mv "$STATE.tmp.$$" "$STATE"
    echo "$SELF: init $AD_HOME_DIR (state/sites.json created)"
    return 0
  fi
  jq -e '(.sites | type) == "array"' "$STATE" >/dev/null 2>&1 \
    || err "state/sites.json exists but is not a valid registry; refusing to touch it"
  echo "$SELF: init $AD_HOME_DIR (existing state/sites.json kept, $(jq '.sites | length' "$STATE") site(s))"
}

lock() {
  local token probe
  token="$(ad_token)"
  probe="$(ad_lock_probe "$LOCK_DIR" "$token")"
  case "$probe" in
    free) ;;
    mine)
      echo "$SELF: lock already held by this invocation ($token)"
      return 0 ;;
    dead-pid:*)
      ad_reclaim_dead "$LOCK_DIR" "${probe#dead-pid:}" ;;
    live-pid:*)
      echo "$SELF: lock held by live pid:${probe#live-pid:}; staying read-only" >&2
      exit 1 ;;
    session:*)
      echo "$SELF: lock held by session:${probe#session:}; a session token is never reclaimed by guessing — ask the owner to unlock" >&2
      exit 1 ;;
    notdir)
      err "state/.lock exists but is not a directory; inspect it and ask the owner" ;;
    unreadable)
      err "state/.lock has no readable owner token; fail-closed — inspect it and ask the owner" ;;
    unknown:*)
      err "state/.lock owner '${probe#unknown:}' has an unknown token type; fail-closed — ask the owner, not deleting it" ;;
  esac
  ad_lock_acquire "$LOCK_DIR" "$token"
  echo "$SELF: lock acquired ($token)"
}

unlock() {
  local token probe
  token="$(ad_token)"
  probe="$(ad_lock_probe "$LOCK_DIR" "$token")"
  case "$probe" in
    free)
      echo "$SELF: no lock held (state/.lock absent)"
      return 0 ;;
    mine)
      rm -rf "$LOCK_DIR"
      echo "$SELF: lock released (was $token)"
      return 0 ;;
    dead-pid:*)
      ad_reclaim_dead "$LOCK_DIR" "${probe#dead-pid:}"
      echo "$SELF: lock released (was stale pid:${probe#dead-pid:})" ;;
    live-pid:*)
      echo "$SELF: lock held by live pid:${probe#live-pid:}, not this process; not released — ask that session or the owner" >&2
      exit 1 ;;
    session:*)
      echo "$SELF: lock held by session:${probe#session:}; only that session (or the owner) may release it" >&2
      exit 1 ;;
    notdir)
      err "state/.lock exists but is not a directory; inspect it and ask the owner" ;;
    unreadable)
      err "state/.lock has no readable owner token; fail-closed — inspect it and ask the owner" ;;
    unknown:*)
      err "state/.lock owner '${probe#unknown:}' has an unknown token type; fail-closed — ask the owner, not deleting it" ;;
  esac
}

lock_report() {
  local probe since
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
}

status() {
  local state_txt data_txt reg_txt
  echo "home: $AD_HOME_DIR"
  if [ -d "$AD_HOME_DIR/state" ]; then state_txt="ok"; else state_txt="missing"; fi
  if [ -d "$AD_HOME_DIR/data" ]; then data_txt="ok"; else data_txt="missing"; fi
  if [ ! -e "$STATE" ]; then
    reg_txt="missing (run ad-home.sh init)"
  elif jq -e '(.sites | type) == "array"' "$STATE" >/dev/null 2>&1; then
    reg_txt="ok ($(jq '.sites | length' "$STATE") site(s))"
  else
    reg_txt="present but not a valid registry — not reading it"
  fi
  echo "layout: state/ $state_txt, data/ $data_txt, state/sites.json $reg_txt"
  lock_report
}

case "$CMD" in
  init) init ;;
  lock) lock ;;
  unlock) unlock ;;
  status) status ;;
  *) err "unknown mode '$CMD'; usage: ad-home.sh init|lock|unlock|status [HOME] [--owner pid:<n>|session:<id>]" ;;
esac
