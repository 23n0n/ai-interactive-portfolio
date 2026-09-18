# Plan — from `ai-interactive-portfolio` to `ai-distribution`

Status: **historical planning record — P1–P3 landed, P4 partial, P5 not started (see the status note
below). Decisions D1–D7 resolved (§9).**

> **Status update (2026-09-18, docs r1).** This plan is a historical record of the rework; the tree has
> since moved on. Landed: P1 (`AGENTS.md`, `references/state-layout.md`), P2 (`references/`, including
> the `references/schema/` split), P3 (`README.md`, `references/harness.md`; the optional
> `skills/pi/SKILL.md` wrapper was not shipped — see `references/harness.md` §5). Partly landed: P4
> (`scripts/` exists; `examples/` does not). Not started: P5 (GitHub publish). §10 marks this; D5 is
> corrected to keep the old kit at the repo root.

Author: first mate session, 2026-09-18.
Subject repo: `ai-interactive-portfolio/` (GUIDE 68 KB + SKILL 32 KB + DATABASE_SCHEMA 40 KB).
Reference style: `pi-firstmate` / `dsh-firstmate` — but note: this is **not a skill for the agent**;
it is a **distribution repo we will push to GitHub**.

---

## 1. What `ai-distribution` is

In the captain's own words:

> *"to distro skilla i pakiet wiedzy do tworzenia stron takich jak zabrowski.pl przy pomocy AI."*
> *"Podajesz agentowi repo i mówisz że chcesz zrobić swoją stronę a on powinien poprowadzić Cię za rękę."*

So:

> **`ai-distribution` is a knowledge package + skill distribution, published as a repo. You hand the
> repo to any AI agent, say "I want to make my own site", and the agent leads you by the hand from
> zero to a live personal site like `zabrowski.pl` — using the reference stack that is already
> documented, unchanged.**

Two consequences that shape everything below:

- **It is a distribution, not a private skill.** Installation = `git clone`. We publish it to
  GitHub. It does not live in `tools-pi/skills` and is not tied to Pi.
- **The technology is not the subject of the rework.** The stack (Cloudflare Workers + Supabase +
  React 19 + Tailwind + shadcn) and `DATABASE_SCHEMA.md` are already described and stay as they
  are. What changes is the *container* (a manual for a human → a contract for an agent) and the
  *driver* (the human operates → the agent leads, the human decides).

Today the kit is a **procedural manual**: the human reads 140 KB, installs a harness, pastes a
skill, answers 25 questions, then runs 8 phases and personally checks every gate. The rework keeps
all the knowledge and moves the driving seat: the **agent** runs the procedure, the **human** is
the owner (intent, taste, approval, spend).

---

## 2. What we change, and what we deliberately do not

| | Keep exactly as-is | Rework |
|---|---|---|
| **Technology** | Reference stack, architecture, `DATABASE_SCHEMA.md` (full DDL, views, RPCs, policies, §12 audit) | — |
| **Security** | RLS as the boundary, anon-grant audit, admin-function auth tests, header suite, secrets scanning, verification checklist | Who *runs* the gates (agent, not user) |
| **Design** | The 25-question questionnaire and the "original layout" rule | Tone: conversational intake, hand-held, not an interrogation |
| **Knowledge** | The content itself — nothing deleted | Its **shape**: 140 KB linear guide → a contract + references loaded on demand |
| **Audience** | "Vibe coders" who follow by hand remain served | A new primary path: the owner who just talks and decides |
| **Distribution** | — | A public GitHub repo, harness/model-neutral, that you clone and hand to an agent |

**The rework is a re-containerization, not a rewrite of the technology.**

---

## 3. Design principles

| # | Principle | Test |
|---|---|---|
| P1 | **The agent leads by the hand; the human decides.** The agent owns the procedure end to end. | A person with no infrastructure knowledge reaches a live site by conversation alone. |
| P2 | **Technology is invisible until it matters.** No stack jargon in front of the owner ("Supabase", "RLS", "Workers", "edge function") unless they ask or a decision needs informed consent. | Every user-facing step is phrased as an outcome, not a tool. |
| P3 | **The knowledge loads progressively.** The agent loads only the reference it needs for the current step; the owner reads nothing they did not ask for. | A design conversation never loads the DB schema; a schema step never loads the design questionnaire. |
| P4 | **Neutrality is about the AI, not the stack.** Any agent, any model, any vendor; the documented reference stack and schema stay fixed. | The same repo works with Pi, DSH, Claude, Codex or a human by hand, with no core changes. |
| P5 | **Verification is the agent's job; approval is the owner's.** | The agent runs every gate and shows evidence; the owner approves only §5's four points. |
| P6 | **Durable state on disk.** Every site is a registered project with a manifest, decisions log and run history; restart reconciles from disk, never from chat memory. | Kill the session mid-build, restart, resume from disk. |
| P7 | **Fail closed.** Unknown account, missing key, ambiguous permission → one concise question, never a guess. | No silent swaps, no invented credentials, no "assumed done". |
| P8 | **Nothing is lost in the rework.** Every section of the old kit has a new home, or a recorded reason for dropping. | The traceability table (§7) covers GUIDE, SKILL and DATABASE_SCHEMA in full. |

---

## 4. Architecture — the repo is the distribution

Cloning it is the install. Its contract is read by whichever agent the owner already uses; the
owner can also follow it by hand.

```
ai-distribution/            # the repo itself IS the distribution
  AGENTS.md                 # the contract the agent loads (firstmate convention)
  README.md                 # human-facing: what it is, clone, "make my site"
  skills/                   # the wrapper convention only (wrappers are optional)
    README.md               # documents skills/<harness>/SKILL.md; no wrapper ships today
  references/               # the knowledge package, loaded on demand
    intake.md               # the hand-held discovery conversation
    design.md               # questionnaire -> design system + wireframe approval
    build.md                # scaffold, sections, content model
    deploy.md               # domain, hosting, CI, staging-first, rollback
    secure.md               # security defaults + RLS audit + verification checklist
    distribute.md           # machine-readable layer: llms.txt, JSON-LD, markdown, schema.org
    operate.md              # edits by conversation, backups, monitoring
    pitfalls.md             # hard-won traps (iOS zoom, anchors, lockfile registry, ...)
    state-layout.md         # on-disk formats
    harness.md              # how to read this repo on Pi / DSH / Claude / Codex / by hand
    schema/                 # DATABASE_SCHEMA.md, split by domain (loaded only when needed)
  scripts/                  # ad-home.sh, ad-new-site.sh, ad-update.sh, ad-status.sh
  docs/                     # not created — the old kit stays at the repo root as the deep fallback
  examples/                 # a worked example site
```

Contract convention: **`AGENTS.md`** (what firstmate uses; auto-loaded by most agents). A harness
that prefers skill discovery may add an optional thin `skills/<harness>/SKILL.md` wrapper; it only
points at `AGENTS.md` and is not required. The repo is the single source of truth.

**Where state lives.** The distro repo is tooling and stays clean. Each *site* is its own repo. The
owner's workspace holds a small home (`ad-home/`, mirroring `firstmate-home/`):

- `ad-home/state/sites.json` — registry: one row per site (id, owner, domain, repo, status).
- `ad-home/data/<site-id>/manifest.md` — identity, stack decisions, accounts, URLs.
- `ad-home/data/<site-id>/decisions.log` — append-only, why-choices (the design contract lives here).
- `ad-home/data/<site-id>/runs/<run-id>/report.md` — per-change record (build/deploy/audit).

**Unit of work differs from firstmate.** Firstmate's unit is a *task* (short-lived, one worktree).
ai-distribution's unit is a *site* (long-lived, many changes over months) — hence the two-layer
registry + per-site state.

---

## 5. The hand-held lifecycle

The agent drives; the owner is consulted at four points and nowhere else.

1. **Intake.** Owner says "I want my own site". The agent registers the site, reads the manifest if
   one exists, and starts the conversation — one question at a time, in the owner's language.
2. **Design.** The agent runs the questionnaire conversationally (substance unchanged), derives the
   design system, shows an ASCII wireframe. → **Owner gate #1: approve the design.**
3. **Build.** The agent scaffolds and builds to the approved design, running every phase gate
   itself and showing evidence. A **staging URL** the owner can click appears before anything is
   public.
4. **Publish.** Staging-first; → **Owner gate #3: go live.** Domain + TLS; the inherited go-live
   checklist; rollback recorded before deploy.
5. **Distribute.** The machine-readable layer and SEO surfaces, derived from the same content source
   as the visible page.
6. **Operate.** Changes requested in conversation become runs; edits, backups, monitoring, content
   updates. This is where a personal site actually lives, and where the distro must stay useful
   after day one.

**The four owner gates — and only these four:**

1. the design contract,
2. paying / creating accounts / any spend,
3. going live publicly,
4. anything destructive or irreversible.

Everything else — scaffolding, schema, RLS, CI, deploys to staging, audits — is the agent's job.

---

## 6. Knowledge model: progressive loading

The old kit is one linear 140 KB read. The new one is a **contract + references**, loaded by need:

| Stage | Loads | Never loads yet |
|---|---|---|
| Intake | `intake.md`, `references/harness.md` | schema, deploy, security |
| Design | `design.md` | schema, deploy |
| Build — scaffold | `build.md`, `pitfalls.md` | security audit |
| Build — data layer | `schema/*` | deploy |
| Publish | `deploy.md`, `secure.md` | — |
| Distribute | `distribute.md` | — |
| Operate | `operate.md`, `secure.md`, `pitfalls.md` | — |

This is progressive loading **of documents**, not of the stack: the destination stack is fixed and
documented, but no single step forces the owner or the agent to hold all 140 KB at once.

---

## 7. Keep / adapt / retire — and the loss test

**Keep unchanged (substance):** the reference stack; `DATABASE_SCHEMA.md` in full; the security
model and §12 audit; the verification checklist; the 25-question questionnaire; the "original
layout, copying advised against" rule; deploy/CI script contracts; the machine-readable/AI
surfaces; known pitfalls.

**Adapt:**

- `GUIDE_FROM_SCRATCH.md` (human-followed, 14 steps) → `README.md` + the hand-held path in
  `AGENTS.md`. The steps do not disappear; they move from the human's hands to the agent's.
- `SKILL_INTERACTIVE_PORTFOLIO.md` → the `AGENTS.md` contract + `references/`. Non-negotiables 1, 2,
  4–8 survive nearly verbatim. Non-negotiable 3 ("verify everything yourself") flips subject: the
  **agent** verifies, the **owner** approves.
- DSH/DeepSeek install instructions (Step 1) → `references/harness.md`, stated neutrally.
- The optional no-account sandbox → a normal early offer in the hand-held path (not a separate
  concept, not a tier).
- Phase names (Phase 0–8) → lifecycle stages that keep the same technical content and gates.

**Retire from the main path:** the requirement to read 140 KB before starting; the assumption that
the human runs commands and personally checks each gate; harness-specific install steps. Nothing is
deleted — the linear manual remains at the repo root as the by-hand fallback.

**Loss test (build-time gate).** A traceability table maps every section of the old SKILL, GUIDE and
DATABASE_SCHEMA to its new home, marked *kept / adapted / deliberately dropped (why)*. Nothing is
dropped silently.

---

## 8. What "technology-neutral" means here (and what it does not)

**Means:** the distro is neutral with respect to the AI that runs it — any agent, any model, any
vendor, or a human by hand. The contract is plain prose + shell scripts; no harness-specific code
lives in the core. Per-harness wrappers are thin pointers at `AGENTS.md`.

**Does not mean:** neutral about the target stack. The reference stack and `DATABASE_SCHEMA.md` stay
exactly as documented; "no silent swaps" survives as a rule. The distro does not offer alternative
stacks, tiers, or a lean mode.

---

## 9. Decisions (resolved)

| # | Decision | Answer | Source |
|---|---|---|---|
| D1 | Deliverable home | A **distribution repo**, pushed to GitHub later. Not an agent skill, not `tools-pi`. | captain, verbatim |
| D2 | Harness target | **Neutral** — any agent/model, or by hand; thin per-harness wrappers only. | captain, verbatim |
| D3 | What "distribution" is | A **distro of the skill + a knowledge package** for creating sites like `zabrowski.pl` with AI. | captain, verbatim |
| D4 | Stack default | **Technology-neutral (w.r.t. the AI).** Stack and DB schema are already described and **are not changed**. | captain, verbatim |
| D5 | Fate of the existing kit | Reworked **in place**; the old guide/skill/schema stay at the **repo root** as deep fallback references. Nothing deleted. | captain via D1 |
| D6 | Name | `ai-distribution`. | captain's own word |
| D7 | First test site | **None for now** — we are building the distribution, not dogfooding it. | captain, verbatim |

---

## 10. Phasing (plan → build, later)

| Phase | Deliverable | Gate | Status |
|---|---|---|---|
| **Plan** (now) | this document | captain reads and accepts it | delivered |
| P1 | `AGENTS.md` contract (the hand-held path, four gates, fail-closed rules) + `state-layout.md` | captain reads `AGENTS.md` top-to-bottom and it holds | **landed** |
| P2 | Reference extraction: `intake`, `design`, `build`, `deploy`, `secure`, `distribute`, `operate`, `pitfalls`, `schema/*` | traceability table: nothing lost silently | **landed** |
| P3 | `README.md` (human-facing) + `references/harness.md` (+ optional thin `skills/pi/SKILL.md`) | a clean clone is understandable and runnable by a reader who never saw the old kit | **landed** (wrapper optional; not shipped) |
| P4 | `scripts/` (home, new-site, update, status) + `examples/` | state survives a session restart; example is coherent | **partial** (`scripts/` landed; `examples/` not yet) |
| P5 | GitHub publish | the repo stands alone publicly | not started |

No dogfood phase now (D7).

---

## 11. Risks and mitigations

| Risk | Mitigation |
|---|---|
| The contract becomes too long to follow | `AGENTS.md` capped; everything deep moves to `references/` |
| Losing the crown jewels (security/RLS, questionnaire, schema, pitfalls) | P2 loss test; substance unchanged, only the container changes |
| "Hand-held" degrading into a wall of instructions | P1 test: a person with no infrastructure knowledge reaches a live site by conversation |
| Drift between the contract and the references | one source of truth; references are loaded, never paraphrased into `AGENTS.md` |
| Neutrality claimed but a harness leaks into the core | no harness-specific code in the core; wrappers only |
| Scope creep from re-designing the product | stack and schema are frozen by D4 — the rework is packaging and prose |

---

## 12. Definition of done for this plan

- [ ] Captain has read this plan and accepts the re-containerization framing (§1–§2).
- [ ] Captain accepts the four owner gates (§5) as the interaction contract.
- [ ] Captain accepts progressive loading of documents, with the stack frozen (§6, §8).
- [ ] P1 is unblocked: the `AGENTS.md` contract is the next artifact.
