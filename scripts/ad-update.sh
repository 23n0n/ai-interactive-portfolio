#!/usr/bin/env bash
# ad-update.sh — mutate one field of a registered site and bump its 'updated' stamp.
# Contract: references/state-layout.md (§ state/sites.json, § manifest, § decisions.log).
#
# Usage:
#   ad-update.sh <site-id> --status <v> [HOME]     registered|designing|building|staging|live|
#   ad-update.sh <site-id> --domain <v> [HOME]                                   paused|failed|archived
#   ad-update.sh <site-id> --plan <v> [HOME]       free|paid
#   ad-update.sh <site-id> --repo <v> [HOME]
#   ... plus --session <id> to identify the session holding state/.lock
#
# Exactly one field flag per call. The row in HOME/state/sites.json is rewritten via a temp file
# and moved; the site manifest in HOME/data/<site-id>/manifest.md is kept current in the same
# action (the reference: rewritten in place as facts change). A --status change is also appended
# to HOME/data/<site-id>/decisions.log, as the reference requires of every status change.
# Deleting a row is not offered here: it is destructive and needs the owner's explicit approval.
#
# HOME defaults to $AD_HOME, else $PWD/ad-home. A HOME argument overrides $AD_HOME.
# $AD_HOME is the only environment contract. Nothing is written outside the home.
# Exit: 0 ok, 1 lock held elsewhere, 2 refusal (bad input, unknown site, bad registry/manifest).
set -euo pipefail

SELF="ad-update"
err() { echo "$SELF: ERROR: $*" >&2; exit 2; }

ID="${1:-}"
[ -n "$ID" ] || err "usage: ad-update.sh <site-id> --status|--domain|--plan|--repo <value> [HOME]"
shift

FIELD=""
VALUE=""
SEEN=0
HOME_ARG=""
SESSION_ID=""
while [ $# -gt 0 ]; do
  case "$1" in
    --status|--domain|--plan|--repo)
      [ "$SEEN" -eq 0 ] || err "one field per call; got '$1' after --$FIELD"
      FIELD="${1#--}"
      [ $# -ge 2 ] || err "--$FIELD needs a value"
      case "$2" in --*) err "--$FIELD needs a value, got option '$2'" ;; esac
      VALUE="$2"
      SEEN=1
      shift 2 ;;
    --session)
      [ $# -ge 2 ] || err "--session needs a value"
      case "$2" in --*) err "--session needs a value, got option '$2'" ;; esac
      SESSION_ID="$2"; shift 2 ;;
    --*) err "unknown field '$1'; expected --status, --domain, --plan or --repo" ;;
    *) [ -z "$HOME_ARG" ] || err "unexpected extra argument '$1'"; HOME_ARG="$1"; shift ;;
  esac
done
[ "$SEEN" -eq 1 ] || err "one of --status, --domain, --plan or --repo is required"
case "$VALUE" in
  *$'\n'*|*$'\r'*) err "values must be single-line" ;;
esac
case "$FIELD" in
  status)
    case "$VALUE" in
      registered|designing|building|staging|live|paused|failed|archived) ;;
      *) err "bad status '$VALUE': expected registered|designing|building|staging|live|paused|failed|archived" ;;
    esac ;;
  plan)
    case "$VALUE" in
      free|paid) ;;
      *) err "bad plan '$VALUE': expected free|paid" ;;
    esac ;;
  domain|repo)
    [ -n "$VALUE" ] || err "--$FIELD needs a non-empty value" ;;
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

# lock_guard: fail closed against another live session; step over a dead-pid lock with a warning.
lock_guard() {
  local holder kind n id
  if [ ! -e "$LOCK_DIR" ]; then
    echo "$SELF: warning: no session lock held (state/.lock absent); run ad-home.sh lock" >&2
    return 0
  fi
  [ -d "$LOCK_DIR" ] || err "state/.lock exists but is not a directory; fail-closed — ask the owner"
  holder="$(cat "$LOCK_DIR/owner" 2>/dev/null || true)"
  kind="${holder%%:*}"
  case "$kind" in
    pid)
      n="${holder#pid:}"
      case "$n" in ''|*[!0-9]*) err "state/.lock owner '$holder' is not a valid pid token; fail-closed — ask the owner" ;; esac
      if kill -0 "$n" 2>/dev/null; then
        echo "$SELF: ERROR: lock held by live pid:$n (another session); staying read-only" >&2
        exit 1
      fi
      echo "$SELF: warning: stale lock from dead pid:$n; proceeding (ad-home.sh lock reclaims it)" >&2
      ;;
    session)
      id="${holder#session:}"
      [ -n "$id" ] || err "state/.lock owner '$holder' is malformed; fail-closed — ask the owner"
      if [ -n "$SESSION_ID" ] && [ "$SESSION_ID" = "$id" ]; then
        return 0
      fi
      echo "$SELF: ERROR: lock held by session:$id (another session); staying read-only" >&2
      exit 1
      ;;
    '') err "state/.lock owner token is unreadable; fail-closed — ask the owner" ;;
    *) err "state/.lock owner '$holder' has an unknown token type; fail-closed — ask the owner" ;;
  esac
}

lock_guard

[ -f "$STATE" ] || err "no $STATE — run ad-home.sh init first"
jq -e '(.sites | type) == "array"' "$STATE" >/dev/null 2>&1 \
  || err "$STATE is not a valid registry; refusing to touch it"
OLD="$(jq -r --arg id "$ID" --arg f "$FIELD" \
  '[.sites[] | select(.id == $id)] | if length == 0 then "!missing" elif length > 1 then "!duplicate" else (.[0][$f] // "") end' "$STATE")"
case "$OLD" in
  '!missing') err "site '$ID' is not registered" ;;
  '!duplicate') err "registry has more than one row for '$ID'; refusing to guess which one to edit" ;;
esac
[ -f "$MANIFEST" ] \
  || err "data/$ID/manifest.md is missing; registry unchanged — restore it or re-register the site"

NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Manifest: replace the field line and the 'updated' line, refuse if either key is absent.
MTMP="$MANIFEST.tmp.$$"
AF="$FIELD" AV="$VALUE" AN="$NOW" awk '
  BEGIN { field = ENVIRON["AF"]; value = ENVIRON["AV"]; now = ENVIRON["AN"] }
  $0 ~ "^[-] " field ": " { print "- " field ": " value; hit = 1; next }
  $0 ~ "^[-] updated: "     { print "- updated: " now;      upd = 1; next }
  { print }
  END { if (!hit) exit 3; if (!upd) exit 4 }
' "$MANIFEST" > "$MTMP" || {
  rm -f "$MTMP"
  err "manifest $MANIFEST has no '- $FIELD:' (or no '- updated:') line; registry unchanged"
}

RTMP="$STATE.tmp.$$"
jq --arg id "$ID" --arg f "$FIELD" --arg v "$VALUE" --arg now "$NOW" \
  '(.sites[] | select(.id == $id) | .[$f]) = $v
   | (.sites[] | select(.id == $id) | .updated) = $now' \
  "$STATE" > "$RTMP"
jq -e '(.sites | type) == "array"' "$RTMP" >/dev/null 2>&1 \
  || { rm -f "$RTMP" "$MTMP"; err "registry update produced invalid JSON; nothing changed"; }

mv "$MTMP" "$MANIFEST"
mv "$RTMP" "$STATE"

echo "$SELF: $ID $FIELD=$VALUE"
echo "$SELF: manifest updated: $MANIFEST"
if [ "$FIELD" = "status" ]; then
  printf '[%s] change: status %s -> %s\n' "$NOW" "$OLD" "$VALUE" >> "$LOG" \
    || { echo "$SELF: ERROR: status changed in the registry but the decisions.log append failed ($LOG)" >&2; exit 1; }
  echo "$SELF: logged status change to $LOG"
fi
