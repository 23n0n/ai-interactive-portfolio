# Make your own site with an SI agent

*Vibecoded for vibecoders by Piotr Żabrowski :-)*

This repository is a **knowledge package plus a skill distribution** for building personal sites
like [`zabrowski.si`](https://zabrowski.si) — an interactive portfolio/CV with an SI chat about you,
a knowledge base with an admin panel, a gated CV download and machine-readable surfaces for search
and SI. You do not read a manual and you do not run the build yourself: you clone this repository,
hand it to the SI agent you already use, and say **"I want my own site"**. The agent carries the
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
| **5. Distribute** | The machine-readable layer that lets search engines and SI describe your site correctly. |
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

Neutrality is about the SI that runs this distribution — not about the site's technology. One layer
of that technology is yours to pick: the AI provider behind your site's SI features, where DeepSeek
ships as the reference (below).

## What is in the repository

| Path | What it is |
|---|---|
| `AGENTS.md` | **The contract.** The agent's instructions: the six stages, the four owner gates and the non-negotiables. The place to start. |
| `references/` | The knowledge package, loaded by the agent one stage at a time: intake, design, build, deploy, security, assurance, distribution, operations, pitfalls, state layout, harness notes, the `jev` SI security layer (pre-provider screening of visitor text, `references/prompt-guard.md`), and the frozen schema split by domain. |
| `scripts/` | The distribution's own tools: five shell helpers for workspace state (workspace home and lock handling — `ad-home.sh` plus the sourced `ad-lock.sh` — a new site `ad-new-site.sh`, updates `ad-update.sh`, status `ad-status.sh`) and `check-docs.py`, which checks this repository's internal consistency (see **Checks** below). |
| `examples/` | A worked run. `examples/ad-home/` shows the on-disk state a registered site produces — registry, manifest, decisions log and run reports — and `examples/local-sandbox/` is the throwaway no-account prototype the intake stage can offer: a runnable Vite + React app with its own tests, docs and ADR, wired to flat dummy files instead of a database. |
| `skills/` | The **convention for optional per-harness wrappers**: if a harness discovers skills only in a fixed directory, its adapter is one file, `skills/<harness>/SKILL.md`, that does nothing but point at `AGENTS.md`. No wrapper ships here — the tree holds only `skills/README.md` — and `references/harness.md` §5 carries the template. |
| `GUIDE_FROM_SCRATCH.md` | The older human-followed walkthrough. The **deep reference source** for technical detail; **not the primary path** any more. |
| `SKILL_INTERACTIVE_PORTFOLIO.md` | The older build procedure, including the design questionnaire. Deep reference source; **not the primary path**. |
| `DATABASE_SCHEMA.md` | The **frozen schema of record** — every table, column, view, RPC, policy, grant, storage rule and seed. The agent applies it; you do not need to read it. |

The build skill is measured before it ships. A benchmark that lives beside this distribution, not
inside it, scores the skill document on how strongly it steers an agent across six behaviour
families — owner gates, owner-facing reporting, durable state, the design gate, staged loading and
the security defaults. The four rules the skill's Non-negotiables gained most recently are the ones
that benchmark's first run showed were missing; the benchmark and its run records are deliberately
not part of this tree.

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

## The technology

Almost everything is fixed so the site stays maintainable and its security controls keep working, and
nothing is swapped quietly. In plain terms, this is the machinery that makes the site open quickly,
keeps your content and your SI key out of a visitor's reach, and runs the few interactive pieces —
the chat about you, the admin panel and the gated CV download — for you. What that protection
actually is, and what it is not, is spelled out under **Security** below:

- **Hosting:** Cloudflare Workers + Static Assets, deployed with Wrangler.
- **Data:** Supabase Postgres with row-level security, Auth, Storage and Edge Functions.
- **Front end:** React 19 + Vite + TanStack Start (SSR) and TanStack Router.
- **Styling:** Tailwind CSS v4 + shadcn/ui.
- **Protection:** Cloudflare Turnstile.
- **Toolchain:** Bun and Wrangler 4.
- **The site's own SI features:** the AI provider behind them is **your choice** — DeepSeek is the
  reference provider and the default, called from server-side functions with the key held
  server-side, and a different provider is a decision the agent records rather than one it makes for
  you. On top of the structural controls sits the SI security layer, which is **opt-out**: a
  pre-provider screen (`jev`) that vetoes hostile visitor text before the model is asked anything, on
  by default and switched off only if you say so.
- **Database:** `DATABASE_SCHEMA.md` is the source of truth and is not edited to fit a shortcut.

None of this names a version number: the stack choices are fixed, but the agent always resolves the
**newest available** version of each package and records what it installed.

If something genuinely cannot be done on this stack, the agent stops and asks you rather than
swapping it silently and mentioning it later. That is the inherited **no silent swaps** rule
(`AGENTS.md` §7).

## Security

An interactive portfolio holds your identity, your CV and a key that spends your money, and it runs
three pieces a visitor can talk to. A builder that waves at "security" without saying what protects
what is not worth trusting, so here is the model in plain terms, with the file that specifies each
part for the agent.

**The boundary is the data layer, not the rate limit.** Rate limits, input caps, response caching
and Turnstile limit abuse and runaway SI spend. They do not stop a determined attacker, and nothing
here is presented as if they did (`references/secure.md` §1). What actually decides who can read
what is row-level security in Postgres: enabled on every table, enforced by policies and grants,
and reached by the public only through vetted views.

- **Reading.** The anonymous role can read public views only — it holds no privilege on any base
  table, so a private column cannot leak through a query the site did not intend. Admin reads
  require the admin role. A public view that is not marked `security_invoker` runs as its owner and
  bypasses the policies underneath it; the agent treats that as a launch blocker and audits the whole
  view layer with SQL, never by eye (`references/secure.md` §4).
- **Writing.** Nothing is written from the browser. Every mutation goes through a server-side edge
  function holding the service-role key. That key bypasses row-level security entirely, so it never
  reaches the browser bundle and a secret scan runs over what actually ships — a leaked service-role
  key is total read and write access, and no policy mitigates it.
- **Your SI key.** The provider key — DeepSeek's in the reference build — lives as a server-side
  secret, read only inside the edge function that calls the model. It is never in the browser, never
  committed, and never echoed into a log (`references/secure.md` §2).
- **The SI security layer.** In front of the model sits the pre-provider screen (`jev`): a typed
  judgment on the visitor's text that vetoes a hostile request before the model is asked anything.
  It is **opt-out**: on by default, not an add-on you must ask for, and you can switch it off. It is
  validated against each surface's own legitimate traffic before it ships. It is a paid third-party
  API, so its cost is disclosed and confirmed at the spend gate — but the default is on, and turning
  it off is the decision that gets recorded.
- **The interactive surfaces.** The CV download is gated by Turnstile verified server-side, and only
  on the request that mints a short-lived, single-use signed download token; the challenge never
  travels in a URL. The chat and job-description analysis carry no challenge — they are bounded by
  per-IP rate limits keyed on the platform-set IP header, strict input caps and response caching.
  The functions reject the wrong method (`405`) and a non-JSON body (`415`), and CORS is an
  allowlist, never a wildcard — CORS is a browser rule, not access control, so it is never the only
  gate on a function.
- **Admin.** Public signup is off; the administrator is provisioned by hand and recorded by user
  id. The admin login carries TOTP two-factor authentication enforced in the database, not the UI,
  so a session that has not completed the second factor cannot write. Every change to a role,
  password, MFA enrolment or account status revokes the affected sessions.
- **Transport and the browser.** HTTPS only, HSTS for at least 180 days, and a per-response header
  suite: a content-security policy with a per-response nonce and no `unsafe-inline` scripts,
  `frame-ancestors 'none'` on every page, `nosniff`, a referrer policy and a permissions policy. If
  the database is unreachable the site fails closed rather than serving stale content.
- **Uploads.** The public image bucket is for publishable material only and says so in the admin
  screen. Uploaded images are decoded, re-encoded and stripped of metadata before they are stored,
  SVG is excluded, and approved external images are copied into controlled storage rather than
  hot-linked.
- **The supply chain.** CI scans both the source tree and the built artifact for secrets and
  dependencies, produces a software bill of materials, pins every third-party action to a full
  commit, runs static analysis and signed provenance, and every account that can deploy carries
  phishing-resistant multi-factor authentication (`references/secure.md` §2).

**Verified, not asserted.** Before anything is called done the agent runs the full row-level
security audit with SQL, the authentication-case matrix against every server-side endpoint, a live
header assertion across every route including error responses, and an independent security review
in a fresh session that has no memory of the build; every finding is fixed or registered as a
recorded risk. The controls are machine-checkable where the platform allows it, and a release that
omits required evidence fails rather than shipping. The full specification is in
[`references/secure.md`](references/secure.md); the evidence a release must be able to show, and the
rules for accepted risk, are in [`references/assurance.md`](references/assurance.md).

**What is accepted, not fixed.** On the free plans there is no managed web application firewall and
the model provider sets no console-level spending limit, and the reference build accepts both — with
the reasoning and the trigger that would supersede them written down, not remembered
(`references/assurance.md` §3). The threat model behind every control here is abuse and cost, not a
targeted attacker; when that assumption stops holding, the acceptances are revisited rather than
quietly left in place.

## Licence

MIT — see [`LICENSE`](LICENSE).
