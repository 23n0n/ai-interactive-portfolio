# Examples — worked examples of what this distribution produces

This directory holds two kinds of worked artifact, so you can see the **shapes** without reading the
whole reference set:

1. **`local-sandbox/`** — a working, throwaway **prototype site**: the "local, no-account sandbox" that
   `references/intake.md` §4 offers an owner before they commit to any account.
2. **`ad-home/` + `content/`** — the **state and data** a real build produces once the owner has
   committed: the durable registry, the manifest, the decisions log, a run report, and example content
   payloads.

**Everything here is fictional.** The sandbox uses the kit's own placeholder persona,
"Zygfryd Niewiadomski-Nieśmiałek". The state example uses an invented owner, "Nora Vance", on the
reserved `.example` TLD (RFC 2606, can never resolve). Neither points at a real person's live site, and
neither is a template to copy wholesale — copy the shapes, not the words or the persona.

## What is here

```
examples/
  local-sandbox/                               # a worked no-account prototype (intake.md §4)
    README.md                                  # the prototype's own README
    adr/ADR-0001-local-data-demo.md            # the DEVIATION REGISTER — read this first
    docs/PROJECT_REFERENCE_ARCHITECTURE.md     # its design system, routes, surfaces
    src/                                       # components, pages, a typed local data layer, tests
    public/                                    # llms.txt, robots.txt, sitemap.xml
    package.json, vite.config.ts, tsconfig.*.json, vitest.config.ts, eslint.config.js, index.html
  ad-home/                                     # FIXTURE copy of a state home - never point $AD_HOME here
    state/sites.json                           # the durable registry: one row per site
    data/nora-vance/manifest.md                # identity, stack decisions, accounts, URLs
    data/nora-vance/decisions.log              # append-only why-choices (design contract)
    data/nora-vance/runs/run-20260918-03/report.md   # the per-change record (publish run)
  content/                                     # payloads the build reads
    profile.json                               # `public.candidate_profile_public` projection
    content-doc.json                           # a ContentDoc (content_docs.doc, schema §6)
    site-sections.json                         # homepage section order (the §2.2 seed order)
```

## `local-sandbox/` — what it is, and what it is not

**Read `local-sandbox/adr/ADR-0001-local-data-demo.md` before anything else.** It carries a
**deviation register**: a table of every place this prototype departs from the reference stack, and why.

What it **is**:

- A disposable prototype that validates a layout and a voice **before any signup**. It runs locally:
  `npm install && npm run dev`. No accounts, no keys, no cloud.
- A real, working Vite + React 19 + TypeScript + Tailwind v4 application with 18 tests, a typed
  data layer, and a documented design system.
- An illustration of the machine-readable surfaces in miniature — it ships `public/llms.txt`,
  `public/robots.txt` and `public/sitemap.xml`.

What it is **not** — and this matters:

- **Not the frozen reference stack.** It deliberately uses a Vite client SPA instead of
  TanStack Start (SSR) + Cloudflare, and a **typed local data layer instead of Supabase**. It has no
  SSR, no Workers, no Turnstile, no edge functions and no CI. The deviation register names each one.
- **Not a security example, and it claims no security boundary.** No RLS, no auth, no storage rules,
  no rate limits. `ADR-0001` states plainly that security controls are *not claimed* for this build.
  Do not read anything here as a template for the hardened path — for that, the authority is
  `references/secure.md` plus the schema references.
- **Not the deliverable.** Per `references/intake.md` §4 the sandbox is throwaway: once the owner
  commits to accounts and the real build starts, it is skipped. Its flat data model must never leak
  into the real schema or RLS design.

## `ad-home/` + `content/` — how to read it

Start with `ad-home/state/sites.json` — the registry row. Then `ad-home/data/nora-vance/manifest.md`
for the settled facts. Then `ad-home/data/nora-vance/decisions.log`, which is the timeline: the
timestamps ascend, and the last line lands on the same instant as the registry's `updated` and the run
report's `finished`. Finish with the run report, the durable record of the publish.

`content/` is separate from the state home. It shows what a builder feeds the data layer:
`profile.json` mirrors the public profile view, `content-doc.json` is one knowledge-base document
(the `content_docs.doc` JSONB), and `site-sections.json` fixes the homepage section order.

## What this directory is NOT

- **Not part of the instruction path.** `AGENTS.md` is the contract. This directory is illustration
  only; if it ever disagrees with `AGENTS.md`, `references/state-layout.md` or the schema references,
  those win.
- **Not a schema.** `ad-home/` and `content/` add, rename and remove nothing — every key is taken from
  `references/state-layout.md` or the schema references. `local-sandbox/` is different: it has its own
  local data shapes, which are **not** the frozen schema, and its ADR says so.
- **Not real data, and never a secret store.** No key, token, password or connection string appears
  anywhere under `examples/` — only the fact that a secret exists and where it lives.
