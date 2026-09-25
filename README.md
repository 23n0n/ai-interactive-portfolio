# Make your own site with an AI agent

*Vibecoded for vibecoders by Piotr Żabrowski :-)*

This repository is a **knowledge package plus a skill distribution** for building personal sites
like [`zabrowski.pl`](https://zabrowski.pl) — an interactive portfolio/CV with an AI chat about you,
a knowledge base with an admin panel, a gated CV download and machine-readable surfaces for search
and AI. You do not read a manual and you do not run the build yourself: you clone this repository,
hand it to the AI agent you already use, and say **"I want my own site"**. The agent carries the
procedure — accounts, scaffold, data layer, security, design, content, deploys — and leads you by
the hand from nothing to a live site on your own domain. You are the owner: you set the intent,
the taste and the money, and you make the decisions.

## How to use it

```bash
gh repo clone 23n0n/ai-interactive-portfolio
```

Then open the clone with your agent and say:

> I want my own site.

That is the whole install. **Cloning is the install** — there is nothing to build, compile, deploy,
register or sign up for here. This repository is knowledge and procedure, not a hosted service, and
it is not where your site is built: the agent builds the site in your own repository.

The agent's instructions are the contract in [`AGENTS.md`](AGENTS.md). If your agent reads a
repository-root `AGENTS.md` automatically, it will pick the contract up on its own; otherwise point
the session at that file. You are welcome to read `AGENTS.md` yourself, but you do not have to —
it is written for the agent, and the agent is meant to carry it for you.

## What happens next

The agent runs six stages, in order:

| Stage | In plain terms |
|---|---|
| **1. Intake** | A conversation about you and the site you want; your answers are recorded. |
| **2. Design** | The agent derives a design from your answers and shows you a sketch before building. |
| **3. Build** | The site is built and put on a private preview link you can click. |
| **4. Publish** | It goes live on your own domain, with a recorded way back if something breaks. |
| **5. Distribute** | The machine-readable layer that lets search engines and AI describe your site correctly. |
| **6. Operate** | Changes by conversation, backups and monitoring — the site's ordinary life after day one. |

You are asked to decide at four points, and nowhere else:

1. **The design** — before any layout is built.
2. **Money and accounts** — before an account is created or anything is paid for, including a domain.
3. **Going live** — before the site is reachable by anyone but you.
4. **Anything destructive or irreversible** — deleting data, revoking access, dropping something live.

Everything else is the agent's job, including running the technical checks and showing you the
results. [`AGENTS.md`](AGENTS.md) is the authoritative version of the stages, the gates and the
rules; the summary above is deliberately short and does not replace it.

## Works with any agent, any model, or by hand

Nothing here requires a particular harness, model or vendor. The contract is plain Markdown and
written procedure: any agent that can read files and run shell commands can run it, and a person who
wants to follow the same six stages by hand is a fully supported path, not a degraded one. How to
point a session at this repository, what to check before starting, which model fits which stage, and
what to do when a runner lacks a capability are all in
[`references/harness.md`](references/harness.md).

Neutrality is about the AI that runs this distribution — not about the site's technology, which is
frozen (below).

## What is in the repository

| Path | What it is |
|---|---|
| `AGENTS.md` | **The contract.** The agent's instructions: the six stages, the four owner gates and the non-negotiables. The place to start. |
| `references/` | The knowledge package, loaded by the agent one stage at a time: intake, design, build, deploy, security, assurance, distribution, operations, pitfalls, state layout, harness notes, and the frozen schema split by domain. |
| `scripts/` | The distribution's own tools: five shell helpers for workspace state (workspace home and lock handling — `ad-home.sh` plus the sourced `ad-lock.sh` — a new site `ad-new-site.sh`, updates `ad-update.sh`, status `ad-status.sh`) and `check-docs.py`, which checks this repository's internal consistency (see **Checks** below). |
| `examples/` | A worked run. `examples/ad-home/` shows the on-disk state a registered site produces — registry, manifest, decisions log and run reports — and `examples/local-sandbox/` is the throwaway no-account prototype the intake stage can offer: a runnable Vite + React app with its own tests, docs and ADR, wired to flat dummy files instead of a database. |
| `skills/` | The **convention for optional per-harness wrappers**: if a harness discovers skills only in a fixed directory, its adapter is one file, `skills/<harness>/SKILL.md`, that does nothing but point at `AGENTS.md`. No wrapper ships here — the tree holds only `skills/README.md` — and `references/harness.md` §5 carries the template. |
| `GUIDE_FROM_SCRATCH.md` | The older human-followed walkthrough. The **deep reference source** for technical detail; **not the primary path** any more. |
| `SKILL_INTERACTIVE_PORTFOLIO.md` | The older build procedure, including the design questionnaire. Deep reference source; **not the primary path**. |
| `DATABASE_SCHEMA.md` | The **frozen schema of record** — every table, column, view, RPC, policy, grant, storage rule and seed. The agent applies it; you do not need to read it. |

Also in the tree: `GUIDE_FROM_SCRATCH.pdf`, an **offline render** of the guide, and
`sanitize-id.lua`, the Pandoc filter that render needs.

The PDF is a *build artifact*, so it goes stale whenever the guide changes. To rebuild it:

```sh
brew install pandoc typst
pandoc GUIDE_FROM_SCRATCH.md -o GUIDE_FROM_SCRATCH.pdf \
  --pdf-engine=typst --lua-filter=sanitize-id.lua --toc
```

Two notes on the flags, because both are easy to get wrong:

- **`--toc` must keep its default depth.** `--toc-depth=1` looks harmless but the guide's only H1 is the
  title, so it renders an *empty* table of contents — 30 pages with no TOC entries instead of 31
  pages and 50.
- **The Lua filter stays.** It rewrites heading ids and in-document links into typst-safe labels (a
  `sec-` prefix, collapsed hyphen runs). The original render used it, and dropping it changes every
  label. It is harmless — same pages, same links — but it keeps the ids stable across rebuilds.

The Markdown is the source of truth; if the two ever disagree, trust `GUIDE_FROM_SCRATCH.md`.

## Checks

The distribution is prose, so its failures are silent: a cross-reference to a file that moved, the
schema split drifting from its source, a migration line number that shifted under an edit, a
planning artifact that leaked back into the tree. One command checks them all:

```sh
python3 scripts/check-docs.py
```

It prints what it checked, lists any findings and exits non-zero on them. There is nothing to
install — standard-library Python, no service, no network — so it also runs unchanged in any CI
pipeline you point at it; the repository ships the check, not a pipeline definition. Run it before a
push and drift lands as a failing check instead of as a stale cross-reference a reader has to
notice.

## The frozen stack

The reference target technology and the database schema are fixed, and neither is swapped quietly.
In plain terms, this is the machinery that makes the site open quickly, keeps your content and your
AI key out of a visitor's reach, and runs the few interactive pieces — the chat about you, the admin
panel and the gated CV download — for you:

- **Hosting:** Cloudflare Workers + Static Assets, deployed with Wrangler.
- **Data:** Supabase Postgres with row-level security, Auth, Storage and Edge Functions.
- **Front end:** React 19 + Vite + TanStack Start (SSR) and TanStack Router.
- **Styling:** Tailwind CSS v4 + shadcn/ui.
- **Protection:** Cloudflare Turnstile.
- **Toolchain:** Bun and Wrangler 4.
- **The site's own AI features:** DeepSeek, called from server-side functions with the key held
  server-side.
- **Database:** `DATABASE_SCHEMA.md` is the source of truth and is not edited to fit a shortcut.

If something genuinely cannot be done on this stack, the agent stops and asks you rather than
swapping it silently and mentioning it later. That is the inherited **no silent swaps** rule
(`AGENTS.md` §7).

## Licence

MIT — see [`LICENSE`](LICENSE).
