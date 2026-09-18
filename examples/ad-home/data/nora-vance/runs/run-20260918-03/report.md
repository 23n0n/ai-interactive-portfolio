# run-20260918-03 — publish

- site: nora-vance
- kind: deploy
- started: 2026-09-18T14:00:00Z
- finished: 2026-09-18T14:20:00Z
- result: pass

## What changed
Production deploy of the approved design; apex domain attached; www redirects to apex.

## Evidence
- staging smoke: all core routes 200
- production smoke: all core routes 200; www → 301 apex
- rollback recorded: previous version id, restore command
- go-live checklist: pass

## Notes
Staging remains noindex. No open findings.
