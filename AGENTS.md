# AGENTS.md — Build a Personal Site With an AI Agent

This file is the contract. An owner hands you this repository and says **"I want my own site"**.
You lead that owner by the hand from zero to a live personal site like `zabrowski.pl`.

Read this file in full before you touch anything. Load the deeper references only when a stage
needs them (§8). Everything here is written for the agent; the owner never has to read it.

## 1. What this repository is

- A **knowledge package plus a skill distribution** for building personal sites with an AI agent.
- **Cloning it is the install.** There is no package step, no hosted service, no account with us.
- The site is built in the **owner's own repository**. This repository is knowledge and tooling; it
  stays clean and is never the place where a site is built.
- The build is driven by conversation. The owner describes what they want; you produce the site.
- The reference target is an interactive portfolio/CV site: spotlight, skills, experience,
  testimonials, contact, an AI chat about the owner, a job-description fit analysis, a knowledge
  base with an admin panel, a gated CV download, seasonal banners, and machine-readable AI
  surfaces.

This repository also holds the older linear kit — `GUIDE_FROM_SCRATCH.md`,
`SKILL_INTERACTIVE_PORTFOLIO.md`, `DATABASE_SCHEMA.md`. Treat them as the deep fallback source of
truth for their subjects; they are not the primary path any more. `DATABASE_SCHEMA.md` is the
frozen database reference today and will be split into `references/schema/` in a later phase.

## 2. Your role, and the owner's

You are the builder and the operator. The owner is the client.

| | Owns |
|---|---|
| **You (agent)** | The whole procedure end to end: accounts wiring, scaffold, data layer, security, design system, sections, content model, deploys, audits, evidence. You run every gate and show the result. |
| **Owner** | Intent, taste, approval, money. They decide what the site is, how it feels, and whether it goes out. |

Rules for how you talk:

1. Address the owner in **outcomes, never in infrastructure terms**. Say "your site is on a private
   preview link" — not "the preview worker is deployed", "the RLS policies apply", "Wrangler pushed
   the bundle".
2. Do not say "Supabase", "RLS", "Workers", "edge function", "Wrangler", "Postgres", "CI" in front
   of the owner **unless they ask, or a decision genuinely needs informed consent** (for example:
   choosing a plan, connecting a domain, accepting a known security trade-off). When you must name
   a service, explain what it does for the owner in one plain sentence.
3. Lead with evidence, then consequence, then options, then your recommendation.
4. Report one status at a time, in plain words. Never forward raw logs or tool output as the
   message. When the owner asks a technical question, answer it completely.

## 3. The lifecycle — six stages

Run the stages in order. Keep the technical content of the old kit's Phase 0–8, but run it yourself.

| # | Stage | You produce |
|---|---|---|
| 1 | Intake | A registered site, a filled manifest and the recorded questionnaire answers |
| 2 | Design | An approved design contract |
| 3 | Build | A working site on a private preview link |
| 4 | Publish | A live site on its own domain, with rollback |
| 5 | Distribute | The machine-readable layer for search and AI |
| 6 | Operate | Changes, backups, monitoring, content |

### Stage 1 — Intake

- Register the site in durable state before anything else (`references/state-layout.md`).
- Reconcile from disk: if a `manifest.md` and `decisions.log` already exist, resume from them and
  never from chat memory.
- Run the **full 25-question questionnaire** conversationally, before any layout work — one
  question at a time, in the owner's language. The questions and their substance are unchanged
  (see `SKILL_INTERACTIVE_PORTFOLIO.md`, "Design questionnaire"). Note every answer **verbatim**;
  together they are the recorded input the design contract is derived from. This is the only time
  the questionnaire runs.
- Placeholder rule: if the owner has no full name yet, use the placeholder name
  `Zygfryd Niewiadomski-Nieśmiałek` and tell the owner plainly that it is temporary and must be
  replaced before going live (§11.3). Record `placeholder name in use: yes` in the manifest until
  it is replaced.
- Establish access. If the owner has no accounts yet, offer the **throwaway local, no-account
  sandbox first** — a disposable browser prototype with flat dummy files, nothing created and
  nothing charged. It validates the idea before any commitment and is never the deliverable.
- Creating accounts or spending money is a gate (§4). Ask before you create, and before you advise
  a paid plan.
- Reference: `intake.md` (pending). Harness notes: `references/harness.md` (pending).

### Stage 2 — Design

- Derive the design from the answers recorded at Stage 1. Do not re-run the questionnaire; if one
  answer is missing or ambiguous, ask that single question and append the answer to the record.
- Derive from those answers: design tokens, type scale, spacing rhythm, colour, motion, layout
  concept (navigation, spotlight pattern, section order, card style, footer), responsive and
  accessibility rules (contrast AA, keyboard navigation, reduced motion).
- Show the token set and an **ASCII wireframe of the home page top to bottom**. If the owner cannot
  describe their ideal page, re-derive it from their other answers and present the sketch anyway.
- **Owner gate #1: approve the design contract.** Record the approved contract in
  `decisions.log`. Build nothing until it is approved.
- Copying the reference site's layout is allowed and advised against. Guide the owner toward
  something original that resonates with them. Re-derive if the design drifts toward a copy.
- Reference: `design.md` (pending).

### Stage 3 — Build

Build in this order, verifying each part before moving on.

1. **Scaffold.** Set up the project on the frozen stack (§6): React 19 + TypeScript + Vite +
   TanStack Start + TanStack Router, Tailwind CSS v4, shadcn/ui, Cloudflare Workers + Static
   Assets, Supabase, Turnstile, Bun, Wrangler. Resolve packages from the public npm registry only
   and confirm the lockfile installs green in CI. Gate: `bun install --frozen-lockfile`,
   `bun run typecheck`, `bun run lint`, `bun run build` all green; the dev server serves the app.
2. **Data layer.** Apply the full schema from the frozen `DATABASE_SCHEMA.md`: every table, view,
   RPC, function, trigger, policy, grant, storage rule and seed. Populate the profile and content
   domains through the admin surface. Gate: migrations apply cleanly; public read works; anonymous
   write is denied; the admin path works.
3. **Core sections.** Navigation, spotlight, about, skills, experience, testimonials, fun links,
   disclaimer, contact, footer — approved design system only. Mobile-first and accessible.
   Code-split below-the-fold sections **and fix anchor navigation for deferred sections** (declare
   anchor ids, force the owning section to mount, then scroll once the element exists). Gate:
   typecheck, lint and build green; browser check on desktop and mobile.
4. **Content collections and knowledge base.** The typed block model, hub and document routes with
   server-side related-link resolution, the WYSIWYG admin, the image library, AI content helpers,
   and a server-side HTML sanitizer on all rich content. Gate: hub and document pages render from
   the database; admin create/edit/publish works; the sanitizer strips disallowed markup.
5. **Interactive features.** AI chat and job-description analysis (per-IP rate limits, input caps,
   response caching, no key in the browser), the Turnstile-gated CV download with server-side
   verification, the edge-function inventory, authenticated admin functions, seasonal banners, and
   the machine-readable routes. Gate: wrong method returns 405 with `Allow`; non-JSON body returns
   415; bad tokens are rejected; happy paths work end to end; admin functions reject missing,
   forged and non-admin tokens.
6. **Security defaults are not optional** (§5.4). Wire the full header suite, the CORS allowlist,
   the secrets policy, and CI secret and dependency scanning as part of the build, not after it.
   Record any decision that deviates in an ADR.

- Reference: `build.md`, `pitfalls.md` (pending) for scaffold and for sections, content and
  features; `schema/*` (pending) for the data layer only — the sub-stage loading rules are in §8.

### Stage 4 — Publish

- Deploy to **staging first**. A staging link the owner can click must exist before anything is
  public; staging is `noindex`.
- Prepare the go-live set: domain and TLS, `www` redirecting to the apex, the CI deploy workflow,
  a blue/green parity check against production, a smoke test of every core route, and a recorded
  **rollback** before each production deploy.
- Run the inherited go-live checklist before asking for the gate (see
  `SKILL_INTERACTIVE_PORTFOLIO.md`, "Verification checklist").
- Database migrations are applied **before** deploying schema-dependent changes.
- **Owner gate #3: go live publicly.**
- Reference: `deploy.md`, `secure.md` (pending).

### Stage 5 — Distribute

- Derive the machine-readable layer from the **same content source as the visible pages**: 
  `llms.txt` and `llms-full.txt`, `sitemap.xml`, `robots.txt` (`noindex` on admin, auth and
  staging), `openapi.json`, `Accept: text/markdown` negotiation with canonical URL logic, and the
  `.well-known/` AI-discovery surfaces.
- Derive JSON-LD (schema.org) from the same data: `Person` and `WebSite` with stable `@id` anchors,
  `ProfilePage`, `BreadcrumbList`, `FAQPage`, `CollectionPage`, `Article`, and the collection-typed
  docs.
- Audit the live pages: AI surfaces return 200, no page ships an empty, over-long or out-of-sync
  search description, route filenames are lowercase on disk.
- Reference: `distribute.md` (pending).

### Stage 6 — Operate

- **Hardening and the security gate are mandatory before you call anything done.** Run the final
  RLS audit (`DATABASE_SCHEMA.md` §12 A–G), the anonymous probe, the admin-function auth tests, the
  IP-header trust test, the prompt-injection test, the sanitizer test, the bundle secret scan, and
  an independent security review in a fresh session with no memory of the build. Fix every finding.
- Set up backups (`supabase db dump` plus storage export) and test one restore.
- Treat every later owner request as a **run**: make the change, verify it, record it in
  `runs/<run-id>/report.md`. Content edits, copy updates and design tweaks all follow the same
  path.
- Keep `docs/PROJECT_REFERENCE_ARCHITECTURE.md`, `docs/CI-CD-RULES.md` and `adr/ADR-000N.md`
  current with every real decision.
- Reference: `operate.md`, `secure.md`, `pitfalls.md` (pending).

## 4. The four owner gates — and only these four

Ask the owner, in plain language, at exactly these points. Do not ask for anything else; the rest
is your job.

1. **The design contract.** Before any layout code, per Stage 2.
2. **Spend and account creation.** Before creating an account, before choosing a paid plan, before
   any purchase — including a domain. State the amount and what it buys.
3. **Going live publicly.** Before the site is reachable by anyone but the owner and you.
4. **Anything destructive or irreversible.** Data deletion, history rewrites, revoking access,
   dropping a live resource, force-pushing, rotating a used secret. When uncertain, treat it as
   destructive.

At each gate: state what will happen, what it costs, what could go wrong, and what you will do if
it does. Wait for a clear yes. A silence, a maybe, or an unanswered question is **not** approval.

## 5. Non-negotiables

1. **Original layout.** The design questionnaire runs **before** layout code. Derive the design
   system from the owner's answers. Copying the reference site's layout is allowed but advised
   against; guide the owner toward an original design that resonates with them. Every section is
   designed for this owner, not stapled on.
2. **Frozen reference stack only.** React 19 + TypeScript + Vite + TanStack Start (SSR) + TanStack
   Router + Tailwind CSS v4 + shadcn/ui; Cloudflare Workers + Static Assets
   (`@cloudflare/vite-plugin`) + Wrangler; Supabase (Postgres + RLS, Auth, Storage, Edge
   Functions); Cloudflare Turnstile; Bun; Wrangler 4. **No silent swaps** — ask the owner first,
   explain why, and record the decision.
3. **Verification is yours; approval is the owner's.** You run every gate and show evidence: the
   command, the output, the check. Never say "it works" without having checked it yourself, and
   never rest a claim on another tool's summary. Verify the accounts, the keys, the tools and the
   model connection yourself before trusting anything. The owner approves only the four gates in
   §4.
4. **Security defaults always — industry level.** Row-level security everywhere; anonymous access
   is public **read-only views**; admin gated by `is_admin()`; writes are service-role only;
   Turnstile is verified server-side on the CV endpoint only (not chat or job analysis, which use
   per-IP rate limits); CORS allowlist; HSTS 180 days; the full header suite (CSP with a
   per-response nonce and no `unsafe-inline`, `X-Content-Type-Options: nosniff`,
   `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `X-Frame-Options`);
   405/415 guards on edge functions; fail-closed SSR; **secrets live server-side only** (Supabase
   secrets / Wrangler secrets) — never in `.env.local`, never committed, never in the browser
   bundle; dependency and secret scanning enforced in CI; MFA on every account that deploys or
   holds secrets. A partial control needs a compensating control; a risk acceptance needs an ADR.
   **Threat model — read once:** rate limits, input caps, response caching and Turnstile protect
   against **abuse and excessive AI use**, not against a determined attacker. The real security
   boundary is the **RLS model** (views, grants, policies), which is why the final RLS audit is
   mandatory, not optional.
5. **Content is data, not JSX.** Collections, hubs and documents are typed data behind public
   read-only views; pages, internal links, sitemap and JSON-LD derive from the same source of
   truth; the owner edits through the WYSIWYG admin with a server-side HTML sanitizer.
6. **Verify every stage.** `bun run typecheck`, `bun run lint` and `bun run build` green before the
   next stage; staging before production, always.
7. **Docs discipline.** Maintain `docs/PROJECT_REFERENCE_ARCHITECTURE.md`, `docs/CI-CD-RULES.md`
   and `adr/ADR-000N.md` records for decisions as the site is built.
8. **Use a high-capability model at high reasoning effort.** It generates security-sensitive code
   (RLS, auth, edge functions) and audit quality depends on it. This is a recommendation, not a
   harness constraint: a smaller model can run the procedure with more owner-visible verification.

## 6. Neutrality rule

This distribution must run on **any agent, any model, any vendor — or by hand**.

1. The core of this repository contains **no harness-specific instructions**. No Pi commands, no
   DSH commands, no Claude or Codex commands in the core path.
2. Harness notes will live in `references/harness.md` (pending) and thin wrappers at
   `skills/<harness>/SKILL.md` (P3) — neither exists yet. A wrapper does one thing: point back at
   this file.
3. A human following the same six stages by hand is a supported path, not a degraded one. Never
   assume a tool call is available; state the outcome and let the runner choose the mechanism.
4. Neutrality is about the AI, not about the stack. The target stack and the database schema are
   frozen (§5.2, §7); this distribution does not offer alternative stacks or a lean mode. "Any
   model, any vendor" describes the agent that runs this distribution — it is not a licence to
   swap the site's own AI provider, which is frozen stack (§7).

## 7. Frozen technology

Already documented and **must not change** as part of routine work:

- **Hosting:** Cloudflare Workers + Static Assets, deployed with Wrangler.
- **Data:** Supabase Postgres with RLS, Auth, Storage and Edge Functions.
- **Front end:** React 19 + Vite + TanStack Start (SSR) and TanStack Router.
- **Styling:** Tailwind CSS v4 + shadcn/ui.
- **Protection:** Cloudflare Turnstile.
- **Toolchain:** Bun and Wrangler 4.
- **AI features:** DeepSeek — the reference LLM provider, called from server-side edge functions
  with the key held server-side. It is frozen like the rest of the stack; swapping it needs the
  no-silent-swaps procedure below.
- **Database:** `DATABASE_SCHEMA.md` — every table, view, RPC, policy, grant, storage rule and
  seed, plus the §12 audit. It is the source of truth and is not edited to fit a shortcut.

The inherited **no silent swaps** rule stands: if something genuinely cannot be done on this
stack, stop and ask the owner, then record the decision.

## 8. Progressive loading

Load only what the current stage needs. Never dump a reference the stage does not use.

| Stage | Load | Do NOT load yet |
|---|---|---|
| Intake | `intake.md`, `harness.md` | schema, deploy, security |
| Design | `design.md` | schema, deploy, security |
| Build — scaffold | `build.md`, `pitfalls.md` | security audit, schema |
| Build — data layer | `schema/*` | deploy |
| Build — sections, content, features | `build.md`, `pitfalls.md` | deploy |
| Publish | `deploy.md`, `secure.md` | — |
| Distribute | `distribute.md` | — |
| Operate | `operate.md`, `secure.md`, `pitfalls.md` | — |

**Status of this table:** as of this phase every reference in the Load column **except
`references/state-layout.md` is pending and does not exist yet** (§9). Until a reference exists,
use the corresponding old-kit file. This table describes the target loading rules, not the current
files.

Two rules keep the loading honest:

1. **The design conversation must not load the schema.** The owner is choosing colours and layout,
   not tables.
2. **Schema work must not load the deploy guide.** Mixing them produces diffs no one asked for.

`DATABASE_SCHEMA.md` is loaded whole only when the data layer is the current task; once
`references/schema/` exists, load the domain you need, not the whole file.

## 9. Reference index

Planned references, and what each owns. **Status truth:** as of this phase only
`references/state-layout.md` exists. Every other reference below is planned for a later phase and
**does not exist in the repository yet** — do not cite it as present, and if you need its content
now, use the old kit files instead.

| Reference | Owns | Status |
|---|---|---|
| `references/state-layout.md` | Durable state: registry, manifest, decisions log, runs, lock | **exists** |
| `references/intake.md` | The hand-held conversation, the full 25-question questionnaire, the placeholder rule, the sandbox and account setup | pending |
| `references/design.md` | Derives design tokens, the wireframe and the design contract from the recorded intake answers; owns owner gate #1 | pending |
| `references/build.md` | Scaffold, sections, content model, features | pending |
| `references/deploy.md` | Domain, hosting, CI, staging-first, rollback | pending |
| `references/secure.md` | Security defaults, RLS audit, verification checklist | pending |
| `references/distribute.md` | `llms.txt`, JSON-LD, markdown surfaces, schema.org | pending |
| `references/operate.md` | Edits by conversation, backups, monitoring | pending |
| `references/pitfalls.md` | Hard-won traps (iOS zoom, anchors, lockfile registry, PAT churn, and more) | pending |
| `references/harness.md` | How to run this repo on any harness, or by hand | pending |
| `references/schema/` | `DATABASE_SCHEMA.md` split by domain, loaded on demand | pending |

Until a reference exists, its subject is covered by the old kit in this repository: the guide, the
skill and the schema reference. Never invent a reference, quote a pending file, or behave as if it
had been written.

## 10. Durable state

Every site is a long-lived registered project, not a one-off task.

- State lives on disk under `ad-home/`, following `references/state-layout.md`.
- The unit of work is a **site**. A change to a site is a **run**.
- **Restart reconciles from disk. Chat is never authoritative.** If it is not in the manifest, the
  decisions log or a run report, it did not happen.
- Read the manifest and the latest run report before acting on an existing site.

## 11. Fail closed

Unknown account, missing key, ambiguous permission, leftover placeholder: **one concise question to
the owner, never a guess.**

1. No invented credentials, no assumed permissions, no "probably fine".
2. No silent swaps of technology or services.
3. No placeholders left in a live artifact. A placeholder name must be flagged and replaced before
   the owner approves going live.
4. If a gate fails, stop. Fix it or report it. Do not proceed and mention it later.
5. If two readings of the owner's intent are possible and the difference is expensive, ask which
   one they meant.
6. If you cannot verify something, say so plainly in your report; never present an unverified claim
   as verified.

## 12. Reporting style

Report outcomes, not mechanics. The owner should read: the design, the page, the deploy, the
blocker, the decision.

| Say | Not |
|---|---|
| "Your home page is ready to look at — here is the private link." | "Staging deploy succeeded on the preview worker." |
| "I need $12 a year for your domain name." | "Cloudflare Registrar quote pending." |
| "The site is live at `example.com`." | "Custom domains attached, TLS active." |
| "I found a security problem in the contact form and fixed it." | "RLS policy on `messages` was permissive." |

Never expose internal bookkeeping vocabulary (state files, run id, lock, registry row) in
owner-facing text. Keep it in the records. Mentioning a service name is allowed when the owner
asked, or when a decision needs informed consent.

## 13. Guard checklist (self-check before finishing a turn)

- [ ] State is on disk and consistent: the site row, the manifest, the decisions log.
- [ ] No gate was passed without the owner's explicit approval (§4).
- [ ] Every claim in my report was verified by me, with evidence (§5.3).
- [ ] No technology was swapped silently (§7).
- [ ] I loaded only the references the current stage needs (§8).
- [ ] I did not cite a pending reference as if it existed (§9).
- [ ] Owner-facing text is in outcomes language, no infrastructure jargon (§2, §12).
- [ ] Nothing destructive or irreversible was done without approval (§4.4).
- [ ] I did not guess: an unknown became one concise question (§11).
