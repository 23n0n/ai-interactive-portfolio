#!/usr/bin/env bash
# ad-home.sh — init the ai-distribution home layout and manage the session dir-lock.
# Contract: references/state-layout.md (§ ad-home/ layout, § Lock: state/.lock).
#
# Usage:
#   ad-home.sh init [HOME]                    create HOME/{state,data} + state/sites.json
#   ad-home.sh lock [HOME] [--session <id>]   acquire state/.lock; 0 held, 1 held elsewhere, 2 refusal
#   ad-home.sh unlock [HOME] [--session <id>] release the lock held by this token
#   ad-home.sh status [HOME]                  print layout summary + lock state
#
# HOME defaults to $AD_HOME, else $PWD/ad-home. A HOME argument overrides $AD_HOME.
# $AD_HOME is the only environment contract; nothing here knows about any agent or harness.
#
# The owner file holds one type-tagged token: 'pid:<n>' when the holder is a local process,
# 'session:<id>' when the caller supplies one with --session. Only a 'pid:<n>' whose process is
# gone is stale and may be reclaimed; a 'session:<id>' token is never reclaimed by guessing. An
# unreadable token or an unknown type is fail-closed: report it and ask the owner.
set -euo pipefail

SELF="ad-home"
err() { echo "$SELF: ERROR: $*" >&2; exit 2; }

CMD="${1:-}"
[ -n "$CMD" ] || err "usage: ad-home.sh init|lock|unlock|status [HOME] [--session <id>]"
shift

HOME_ARG=""
SESSION_ID=""
while [ $# -gt 0 ]; do
  case "$1" in
    --session)
      [ $# -ge 2 ] || err "--session needs a value"
      case "$2" in --*) err "--session needs a value, got option '$2'" ;; esac
      SESSION_ID="$2"; shift 2 ;;
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

# caller_token: the token this invocation would write ('pid:<n>' unless --session was given).
caller_token() {
  if [ -n "$SESSION_ID" ]; then
    printf 'session:%s\n' "$SESSION_ID"
  else
    printf 'pid:%s\n' "$$"
  fi
}

# read_token: print the holder token; non-zero when the lock is absent, unreadable or empty.
read_token() {
  local tok
  [ -d "$LOCK_DIR" ] || return 1
  [ -f "$LOCK_DIR/owner" ] || return 1
  tok="$(cat "$LOCK_DIR/owner" 2>/dev/null || true)"
  [ -n "$tok" ] || return 1
  printf '%s\n' "$tok"
}

# pid_of_token: print n for a valid 'pid:<n>' token; non-zero otherwise.
pid_of_token() {
  local n="${1#pid:}"
  case "$n" in ''|*[!0-9]*) return 1 ;; esac
  printf '%s\n' "$n"
}

# session_of_token: print id for a valid 'session:<id>' token; non-zero otherwise.
session_of_token() {
  local id="${1#session:}"
  [ -n "$id" ] || return 1
  printf '%s\n' "$id"
}

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
  local token holder kind n id
  token="$(caller_token)"
  if [ -e "$LOCK_DIR" ]; then
    [ -d "$LOCK_DIR" ] || err "state/.lock exists but is not a directory; inspect it and ask the owner"
    holder="$(read_token)" || err "state/.lock has no readable owner token; fail-closed — inspect it and ask the owner"
    kind="${holder%%:*}"
    case "$kind" in
      pid)
        n="$(pid_of_token "$holder")" || err "state/.lock owner '$holder' is not a valid pid token; fail-closed — ask the owner"
        if [ "$n" = "$$" ]; then
          echo "$SELF: lock already held by this process (pid:$n)"
          return 0
        fi
        if kill -0 "$n" 2>/dev/null; then
          echo "$SELF: lock held by live pid:$n; staying read-only" >&2
          exit 1
        fi
        echo "$SELF: reclaiming stale lock from dead pid:$n"
        rm -rf "$LOCK_DIR"
        ;;
      session)
        id="$(session_of_token "$holder")" || err "state/.lock owner '$holder' is malformed; fail-closed — ask the owner"
        if [ "$token" = "$holder" ]; then
          echo "$SELF: lock already held by this session (session:$id)"
          return 0
        fi
        echo "$SELF: lock held by session:$id; a session token is never reclaimed by guessing — ask the owner to unlock" >&2
        exit 1
        ;;
      *)
        err "state/.lock owner '$holder' has an unknown token type; fail-closed — ask the owner, not deleting it"
        ;;
    esac
  fi
  mkdir "$LOCK_DIR" 2>/dev/null \
    || { echo "$SELF: ERROR: could not create state/.lock (lost a race); re-run status" >&2; exit 1; }
  printf '%s\n' "$token" > "$LOCK_DIR/owner"
  date -u +%Y-%m-%dT%H:%M:%SZ > "$LOCK_DIR/acquired"
  echo "$SELF: lock acquired ($token)"
}

unlock() {
  local token holder kind n id
  token="$(caller_token)"
  if [ ! -e "$LOCK_DIR" ]; then
    echo "$SELF: no lock held (state/.lock absent)"
    return 0
  fi
  [ -d "$LOCK_DIR" ] || err "state/.lock exists but is not a directory; inspect it and ask the owner"
  holder="$(read_token)" || err "state/.lock has no readable owner token; fail-closed — inspect it and ask the owner"
  kind="${holder%%:*}"
  case "$kind" in
    pid)
      n="$(pid_of_token "$holder")" || err "state/.lock owner '$holder' is not a valid pid token; fail-closed — ask the owner"
      if [ "$n" = "$$" ]; then
        rm -rf "$LOCK_DIR"
        echo "$SELF: lock released (was pid:$n)"
        return 0
      fi
      if kill -0 "$n" 2>/dev/null; then
        echo "$SELF: lock held by live pid:$n, not this process; not released — ask that session or the owner" >&2
        exit 1
      fi
      rm -rf "$LOCK_DIR"
      echo "$SELF: lock released (reclaimed stale pid:$n)"
      ;;
    session)
      id="$(session_of_token "$holder")" || err "state/.lock owner '$holder' is malformed; fail-closed — ask the owner"
      if [ "$token" = "$holder" ]; then
        rm -rf "$LOCK_DIR"
        echo "$SELF: lock released (was session:$id)"
        return 0
      fi
      echo "$SELF: lock held by session:$id; only that session (or the owner) may release it" >&2
      exit 1
      ;;
    *)
      err "state/.lock owner '$holder' has an unknown token type; fail-closed — ask the owner, not deleting it"
      ;;
  esac
}

lock_report() {
  local holder kind n id since
  if [ ! -e "$LOCK_DIR" ]; then
    echo "lock: free"
    return 0
  fi
  if [ ! -d "$LOCK_DIR" ]; then
    echo "lock: state/.lock exists but is not a directory — inspect it and ask the owner"
    return 0
  fi
  holder="$(read_token)" || { echo "lock: held, owner token unreadable or missing — fail-closed, ask the owner"; return 0; }
  since=""
  if [ -f "$LOCK_DIR/acquired" ]; then
    since=" since $(cat "$LOCK_DIR/acquired" 2>/dev/null || true)"
  fi
  kind="${holder%%:*}"
  case "$kind" in
    pid)
      if n="$(pid_of_token "$holder")"; then
        if kill -0 "$n" 2>/dev/null; then
          echo "lock: held by pid:$n (process alive)$since"
        else
          echo "lock: held by pid:$n (STALE — process gone, reclaimable by ad-home.sh lock)$since"
        fi
      else
        echo "lock: held by '$holder' (invalid pid token — ask the owner)"
      fi
      ;;
    session)
      if id="$(session_of_token "$holder")"; then
        echo "lock: held by session:$id (assumed live; never reclaimed by guessing)$since"
      else
        echo "lock: held by '$holder' (malformed session token — ask the owner)"
      fi
      ;;
    *)
      echo "lock: held by '$holder' (unknown token type — ask the owner)"
      ;;
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
  *) err "unknown mode '$CMD'; usage: ad-home.sh init|lock|unlock|status [HOME] [--session <id>]" ;;
esac
