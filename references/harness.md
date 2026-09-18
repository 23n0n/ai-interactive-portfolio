# references/harness.md — running the contract on any harness, or by hand

How a particular runner loads and drives the contract in `AGENTS.md`. This file is notes for the
runner, not part of the contract: the core never requires it, and where anything here disagrees with
`AGENTS.md`, `AGENTS.md` wins. Load it at Stage 1 (Intake) alongside `references/intake.md`; nothing
later depends on it.

## 1. What this file is for

- The core of this repository is **plain prose plus shell script**. Nothing in it assumes a tool,
  a vendor, a chat UI, a CLI, a model or an editor.
- `AGENTS.md` is the contract. The references are staged detail. Both are Markdown files the runner
  reads; nothing is compiled, installed or registered.
- This file explains only the seam between that contract and a runner: how a runner finds the
  contract, what it must be able to do, and what to tell the owner when it cannot. Everything
  genuinely about the work — stages, gates, security, records — lives in `AGENTS.md` and the
  references, never here.
- Therefore: no harness is a dependency. Nothing in this file may be cited by the core as a
  requirement, and a runner that never opens this file can still run the whole distro.

## 2. The universal path — any agent, any model, any vendor

Minimum requirement: an agent that can **read files** and **run shell commands** in a working
directory. That is the whole list. No adapter, wrapper, plugin or integration is needed.

1. **Read `AGENTS.md` in full**, then follow it. It is self-contained; the references are loaded on
   demand, not up front.
2. **Reconcile state from disk before acting.** Read `ad-home/state/sites.json`, the site's
   `manifest.md` and the latest run report (`references/state-layout.md`). If a site already exists,
   resume from those files — never from chat memory (`AGENTS.md` §10).
3. **Run the six stages in order** (`AGENTS.md` §3): Intake, Design, Build, Publish, Distribute,
   Operate. The stage gates (`bun install --frozen-lockfile`, `bun run typecheck`,
   `bun run lint`, `bun run build`, migrations, smoke tests) are yours to run and show.
4. **Load references by stage, never all at once** (`AGENTS.md` §8). The design conversation does
   not load the schema; schema work does not load the deploy guide.
5. **Stop at the four owner gates and only those four** (`AGENTS.md` §4): the design contract,
   spend and account creation, going live publicly, anything destructive or irreversible.
6. **Fail closed.** An unknown account, key, permission or intent becomes one concise question to
   the owner (`AGENTS.md` §11). Never guess, never swap silently, never leave a placeholder live.
7. **Record every change as a run** under `ad-home/data/<site-id>/runs/<run-id>/report.md`
   (`references/state-layout.md`). If it is not on disk, it did not happen.

Two runner notes:

- Some harnesses read a repository-root `AGENTS.md` by convention. Where that convention exists the
  contract loads itself. Where it does not, point the session at `AGENTS.md` in the first message —
  that is the entire integration.
- The contract is model-agnostic. A model that follows written procedure and can use shell will run
  it; see §6 for choosing which model runs which stage.

## 3. By hand — the same contract, no agent

A person can run this distro with no agent at all. It is a supported path, not a degraded one
(`AGENTS.md` §6.3). Nothing needs rewriting: `AGENTS.md` is written procedure, and a human is a
runner.

- **Same six stages, same order, same gates.** Read `AGENTS.md`, load each reference when its stage
  arrives, run the stage gates yourself, and stop at the four owner gates (you are both builder and
  owner, so record the decision before moving).
- **Technical depth** comes from the inherited kit when a reference does not cover the detail:
  `GUIDE_FROM_SCRATCH.md` (human-followed walkthrough), `SKILL_INTERACTIVE_PORTFOLIO.md` (the build
  procedure), `DATABASE_SCHEMA.md` (the frozen data layer).
- **What you lose — state it honestly:**
  - **Verification.** The agent's job is to run every gate and show evidence (`AGENTS.md` §5.3).
    By hand, nothing checks your work but you: run the gates, read the output, do not proceed on a
    claim you have not seen pass. The by-hand path does not waive the security gate, the RLS
    audit or staging-before-production.
  - **Record-keeping.** You write `manifest.md`, `decisions.log` and the run reports yourself. Skip
    them and a restart becomes guesswork — the records are what make the site long-lived.
  - **Hand-holding.** The conversational intake is gone; you run the questionnaire on yourself and
    derive your own design contract. The questionnaire in `references/intake.md` still applies.
- **What you never lose:** fail-closed behaviour, no silent swaps, the frozen stack and schema, and
  the four gates as decision points.

## 4. The per-harness adapter — a thin wrapper

Some harnesses discover skills in a fixed directory. For those, an adapter is exactly one file:
`skills/<harness>/SKILL.md`. It does **one** thing — point at `AGENTS.md`.

Template (replace `<harness>` with the directory name):

```md
# skills/<harness>/SKILL.md

This repository is a contract for building personal sites with an AI agent.
Read `AGENTS.md` in full and follow it.

This file is only a pointer. It is not the source of truth: if it disagrees
with `AGENTS.md`, `AGENTS.md` wins. Nothing in this repository depends on
<harness>; it is one runner among many.
```

Rules for wrappers:

- **No behaviour.** No stages, no gates, no commands, no reference list, no security rules, no
  version pins, no configuration. If the wrapper carries anything beyond the pointer, it belongs in
  `AGENTS.md` (if it is part of the contract) or in this file (if it is a runner note).
- **A wrapper that carries behaviour forks the contract.** It drifts from `AGENTS.md`, the drift is
  invisible to every other runner, and the neutrality claim stops being true. Treat it as a bug.
- **A wrapper is optional.** A harness that reads a repository-root `AGENTS.md`, or a session that
  is told to read it, needs no wrapper at all.
- Directory names such as `skills/pi/`, `skills/dsh/`, `skills/claude/` or `skills/codex/` are
  examples of the pattern only. They name runners, never requirements.

## 5. Capabilities to check in any harness

Check these before Stage 1 and tell the owner what you found. Subagents are an optimisation, never
a requirement.

| Capability | What the contract needs it for | If it is missing |
|---|---|---|
| **Read files** | Reading `AGENTS.md` and the references — the contract *is* prose | The runner cannot run the distro. Switch runner or work by hand (§3). |
| **Write files** | `ad-home/` records, the site scaffold, content, migrations | No records and no build. A runner that cannot write cannot build a site; switch runner or work by hand. |
| **Run shell commands** | Every stage gate: install, typecheck, lint, build, migrations, probes, deploys | Not a runner for this distro. At best it can advise a human who runs the commands — in which case the human is the runner (§3). Never report a stage as passed. |
| **Spawn subagents** | Parallel work; the independent fresh-session security review at Stage 6 (`AGENTS.md` §3, Stage 6) | Slower, not blocked. Do the work sequentially inline. The Stage 6 review done in the same session is a second pass, not an independent review — say so in the run report. |
| **Persistent workspace** | Restart reconciliation; a site lives for months (`AGENTS.md` §10) | If the workspace is ephemeral, `ad-home/` must live on durable storage the next session can read. If nothing is durable, the site cannot be resumed — say so before building. |

## 6. Model choice

Two dials in any harness: **capability** and **reasoning effort**. The contract sets no required
model and works on any of them; this is a recommendation about quality, not a constraint.

| Work | Model |
|---|---|
| **Build** — scaffold, data layer, RLS, auth, edge functions, sanitizer, security defaults, the security and RLS audits | **Highest capability at maximum reasoning effort** available. This code is security-sensitive, and the audit is only as good as the model that wrote and reviewed it. |
| **Routine stages** — intake conversation, design derivation, copy, content edits, routine content runs | A mid-tier or cheaper model is acceptable. The work is conversation and derivation against explicit rules. |

- **A weaker model does not change the bar, it changes the verification plan.** The contract still
  applies in full. With a weaker model: build in smaller increments, run every stage gate in front
  of the owner with the output shown, record to disk more often, and do the security-sensitive
  writing and the audit on the strongest configuration available (or hand that stage to a stronger
  runner — not a stack swap, `AGENTS.md` §7).
- **Verify the model connection yourself before starting.** Send a known-answer question (for
  example: explain in three bullets what Postgres Row Level Security is) and read the reply. Never
  rest on a model's own claim that it is working (`AGENTS.md` §5.3).
- **Do not confuse this dial with the site's AI.** Neutrality is about the agent that runs this
  distribution. The site's own AI features stay on the frozen stack's provider, held server-side
  (`AGENTS.md` §6.4, §7). A harness whose model is cheap does not license swapping the site's.

## 7. Working directory and state

Three independent things, never conflated:

| Thing | What it is | Role |
|---|---|---|
| **The distro repository** | `AGENTS.md` plus `references/` and the inherited kit | Knowledge. Read-only during a build; the distro is never where a site is built. |
| **The site repository** | The owner's own repo for their site | The build target. Created during the build if it does not exist. |
| **`ad-home/`** | The owner's durable state directory: `state/` and `data/<site-id>/` | The state of record. Layout fixed by `references/state-layout.md`; do not invent subdirectories. |

- `ad-home/` lives in the **owner's workspace, outside both repositories** — a sibling of the site
  repo (for example `~/ad-home/`), never inside the distro repo and never inside the site repo's git
  history.
- It is **plain files**, which is what makes it harness-independent. A harness's own memory, thread
  history or session store is a convenience at best and is never the state of record; if the harness
  disappears tomorrow, `ad-home/` still resumes the site.
- Run each session from wherever the current stage does its work — Intake and Design may need no
  repository at all, Build and later run in the site repo — with the distro readable and `ad-home/`
  writable. Paths in the records are what bind the three together.
- No secret value ever lands in `ad-home/` (`references/state-layout.md`). A harness that logs
  conversation is not an exception.

## 8. Failure modes by harness class

Every case below is **fail closed** (`AGENTS.md` §11): tell the owner what is missing, in their
words, before work starts; name the fallback; never silently degrade. An agent that quietly drops
the records or the security audit produces a site that looks live and is unsafe or unmaintainable.

| Class | What the agent should say and do |
|---|---|
| **No subagents** | "I will do the work in this session, one step at a time — it will take longer." Run stages sequentially. At Stage 6, an independent review needs a fresh session; if none is possible, mark the review as a self-review in the run report and do not present it as independent (`references/secure.md`). |
| **No durable filesystem** (ephemeral container, sandbox that wipes) | Say where `ad-home/` must live durably and where the export lands before building. If nothing durable is available, do not start: the site cannot be resumed. Move to a runner with durable storage, or work by hand. |
| **No shell** | "I cannot run or verify the build or the deploys here." The contract's every gate is shell-based. Offer the owner-run path — you write commands and read the pasted output, they are the runner — or move to a runner with shell. Never claim a stage passed. |
| **Read-only filesystem** | The runner can read `AGENTS.md` and explain the plan, nothing more. Say so, and switch to a writable runner or work by hand. Do not begin a stage you cannot finish. |
| **No network** | Installs, migrations, deploys and the data platform are all unreachable. Stop before starting rather than mid-build; say which stages are impossible here and which runner or manual step covers them. |
| **Ephemeral or short session** | Keep the records current at every step, because the session may end at any point; resume from `ad-home/`, never from memory. With a small context window, load one stage's references only (`AGENTS.md` §8). |

## Source map

No old-kit file corresponds to this reference — it is new, built from the neutrality rule
(`AGENTS.md` §6) and the loading model (`AGENTS.md` §8). The only inherited harness content is the
old kit's install step and Non-negotiable 8; both are restated neutrally below.

| Section here | Source |
|---|---|
| §1 What this file is for | new — derived from `AGENTS.md` §6 (neutrality rule); `PLAN_AI_DISTRIBUTION.md` §8 |
| §2 The universal path | new — derived from `AGENTS.md` §6.1, §6.3, §8, §10, §11; container for `GUIDE_FROM_SCRATCH.md` Step 1 (install a harness and connect a model), stated neutrally and made runner-agnostic |
| §3 By hand | new — derived from `AGENTS.md` §6.3; `GUIDE_FROM_SCRATCH.md` as the human-followed fallback, `SKILL_INTERACTIVE_PORTFOLIO.md` and `DATABASE_SCHEMA.md` as the deep technical source |
| §4 The per-harness adapter | new — derived from `AGENTS.md` §6.2; container for `GUIDE_FROM_SCRATCH.md` Step 5 (placing the skill file into the harness), reduced to a pointer |
| §5 Capabilities | new — derived from `AGENTS.md` §6.1, §6.3 and the Stage 6 fresh-session review; container for `GUIDE_FROM_SCRATCH.md` Step 1.3 ("delegates work") |
| §6 Model choice | `SKILL_INTERACTIVE_PORTFOLIO.md` Non-negotiable 8; `GUIDE_FROM_SCRATCH.md` Steps 1.5–1.6; `AGENTS.md` §5.8, §6.4 |
| §7 Working directory and state | `references/state-layout.md`; `AGENTS.md` §10 |
| §8 Failure modes | new — derived from `AGENTS.md` §6.3 and §11 (fail closed) |
