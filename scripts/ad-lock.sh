#!/usr/bin/env bash
# ad-lock.sh — shared state/.lock handling for the ad-* scripts. SOURCED, never executed.
# Contract: references/state-layout.md (§ Lock: state/.lock).
#
# This is the single place that decides what state/.lock means and the single place that
# reclaims it, so ad-home.sh, ad-new-site.sh, ad-update.sh and ad-status.sh can never drift
# apart on the stale-lock question.
#
# Owner-token resolution order (the one rule every ad-* command uses):
#   1. $AD_SESSION_ID              -> session:<id>   (generic session id; never a harness-specific name)
#   2. --owner pid:<n>|session:<id> -> that explicit, already type-tagged token (verbatim)
#   3. otherwise                    -> pid:$PPID (the INVOKING shell, not this helper's $$)
#
# Only a 'pid:<n>' token whose process is gone is stale, and ad_reclaim_dead() is the only
# thing that removes it. A 'session:<id>' token is never reclaimed by guessing. An unreadable
# token or an unknown type is fail-closed: report it and ask the owner.

# ad_lock_err <msg>: refusal (exit 2). Uses the caller's $SELF in the prefix when set.
ad_lock_err() { echo "${SELF:-ad-lock}: ERROR: $*" >&2; exit 2; }

# ad_token: print this invocation's owner token ('session:<id>' or 'pid:<n>').
ad_token() {
  local v
  if [ -n "${AD_SESSION_ID:-}" ]; then
    v="$AD_SESSION_ID"
    case "$v" in *$'\n'*|*$'\r'*) ad_lock_err "AD_SESSION_ID must be a single line" ;; esac
    printf 'session:%s\n' "$v"
    return 0
  fi
  if [ -n "${AD_OWNER_ARG:-}" ]; then
    case "$AD_OWNER_ARG" in
      pid:*)
        case "${AD_OWNER_ARG#pid:}" in
          ''|*[!0-9]*) ad_lock_err "--owner '$AD_OWNER_ARG' is not a valid 'pid:<n>' token" ;;
        esac ;;
      session:*)
        [ -n "${AD_OWNER_ARG#session:}" ] \
          || ad_lock_err "--owner '$AD_OWNER_ARG' is not a valid 'session:<id>' token" ;;
      *)
        ad_lock_err "--owner needs a type-tagged token 'pid:<n>' or 'session:<id>' (got '$AD_OWNER_ARG')" ;;
    esac
    printf '%s\n' "$AD_OWNER_ARG"
    return 0
  fi
  printf 'pid:%s\n' "$PPID"
}

# ad_lock_probe <lockdir> <mytoken>: classify state/.lock relative to <mytoken>.
# Prints exactly one word, no newline surprises:
#   free | mine | live-pid:<n> | dead-pid:<n> | session:<id> | notdir | unreadable | unknown:<holder>
ad_lock_probe() {
  local lock="$1" mine="${2:-}" holder kind n id
  [ -e "$lock" ] || { printf 'free\n'; return 0; }
  [ -d "$lock" ] || { printf 'notdir\n'; return 0; }
  [ -f "$lock/owner" ] || { printf 'unreadable\n'; return 0; }
  holder="$(cat "$lock/owner" 2>/dev/null || true)"
  [ -n "$holder" ] || { printf 'unreadable\n'; return 0; }
  kind="${holder%%:*}"
  case "$kind" in
    pid)
      n="${holder#pid:}"
      case "$n" in ''|*[!0-9]*) printf 'unknown:%s\n' "$holder"; return 0 ;; esac
      if [ "$holder" = "$mine" ]; then printf 'mine\n'; return 0; fi
      if kill -0 "$n" 2>/dev/null; then
        printf 'live-pid:%s\n' "$n"
      else
        printf 'dead-pid:%s\n' "$n"
      fi
      ;;
    session)
      id="${holder#session:}"
      [ -n "$id" ] || { printf 'unknown:%s\n' "$holder"; return 0; }
      if [ "$holder" = "$mine" ]; then printf 'mine\n'; return 0; fi
      printf 'session:%s\n' "$id"
      ;;
    *) printf 'unknown:%s\n' "$holder" ;;
  esac
}

# ad_reclaim_dead <lockdir> <n>: the ONE reclaim site. Removes a lock whose 'pid:<n>' owner is
# gone and says so once, plainly, on stderr. Never call this for a 'session:<id>' token.
ad_reclaim_dead() {
  local lock="$1" n="$2"
  rm -rf "$lock" 2>/dev/null \
    || ad_lock_err "could not reclaim stale state/.lock (dead pid:$n); ask the owner to remove it"
  echo "${SELF:-ad}: reclaimed stale lock from dead pid:$n" >&2
}

# ad_lock_acquire <lockdir> <token>: create the dir-lock atomically and write its owner token.
ad_lock_acquire() {
  local lock="$1" token="$2"
  if ! mkdir "$lock" 2>/dev/null; then
    echo "${SELF:-ad}: ERROR: could not create state/.lock (lost a race); re-run status" >&2
    exit 1
  fi
  printf '%s\n' "$token" > "$lock/owner" 2>/dev/null \
    || ad_lock_err "created state/.lock but could not write its owner token; inspect it and ask the owner"
  date -u +%Y-%m-%dT%H:%M:%SZ > "$lock/acquired" 2>/dev/null || true
}

# ad_guard_write <lockdir> <mytoken>: the single lock decision for a command about to write.
# free       -> warn (unchanged behaviour) and proceed, so an unlocked home still works
# mine       -> proceed
# live pid   -> another session holds it: stay read-only (exit 1)
# session id -> another session holds it: stay read-only (exit 1); never reclaimed
# dead pid   -> reclaim in ad_reclaim_dead, then re-acquire as this invocation's token, once
# unreadable / unknown / notdir -> fail closed (exit 2)
ad_guard_write() {
  local lock="$1" token="$2" probe
  probe="$(ad_lock_probe "$lock" "$token")"
  case "$probe" in
    free)
      echo "${SELF:-ad}: warning: no session lock held (state/.lock absent); run ad-home.sh lock" >&2
      return 0 ;;
    mine)
      return 0 ;;
    dead-pid:*)
      ad_reclaim_dead "$lock" "${probe#dead-pid:}"
      ad_lock_acquire "$lock" "$token"
      echo "${SELF:-ad}: lock re-acquired ($token)" >&2
      return 0 ;;
    live-pid:*)
      echo "${SELF:-ad}: ERROR: lock held by live pid:${probe#live-pid:} (another session); staying read-only" >&2
      exit 1 ;;
    session:*)
      echo "${SELF:-ad}: ERROR: lock held by session:${probe#session:} (another session); staying read-only" >&2
      exit 1 ;;
    notdir)
      ad_lock_err "state/.lock exists but is not a directory; fail-closed — ask the owner" ;;
    unreadable)
      ad_lock_err "state/.lock has no readable owner token; fail-closed — ask the owner" ;;
    unknown:*)
      ad_lock_err "state/.lock owner '${probe#unknown:}' has an unknown token type; fail-closed — ask the owner" ;;
  esac
}
