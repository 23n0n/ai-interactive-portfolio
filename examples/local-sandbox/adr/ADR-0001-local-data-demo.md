# ADR-0001 — Local data layer for an interactive-portfolio demo

**Status:** Accepted (demo scope only)
**Date:** 2026-09-04
**Context:** The `interactive-portfolio` skill mandates a Cloudflare + Supabase
reference stack. This build is an approved **local demo** with no cloud
accounts yet ("demo lokalne, konta później"). Deploying on the real stack is
impossible without accounts/keys, so we build the full frontend stack locally.
**Decision:** Use Vite + React 19 + TypeScript + Tailwind CSS v4 + React Router
v7, with a **typed in-process data layer** (TS modules) standing in for the
Supabase data plane. All content is typed as data (collections, docs, person,
skills, experience, testimonials) exactly per the skill's "content = data, not
JSX" rule. No SSR / Cloudflare Workers / Turnstile / edge functions in this
demo build.
**Consequences:**
- Site runs fully locally (`npm run dev`) with no external services or keys.
- The data repository interface is a plain module (`src/data/content.ts`) so a
  future Supabase adapter can replace it mechanically.
- No RLS / auth / storage hardening applies yet — out of scope for a local demo.
  Security controls are NOT claimed for this build.
- Identity, testimonials and socials are placeholders (fictional persona
  "Zygfryd Niewiadomski-Nieśmiałek") to be replaced before any real launch.

## Deviation register (vs. skill reference stack)
| Skill reference | This demo | Why |
|---|---|---|
| TanStack Start (SSR) + Cloudflare Vite plugin | Vite client SPA | No Cloudflare deploy; SSR unnecessary locally |
| Supabase (Postgres/RLS/Auth) | Local typed TS data modules | No Supabase account in demo |
| Edge functions + DeepSeek | Client-side canned "dummy AI" chat | No API key / backend in demo |
| Turnstile on CV | Omitted | No real CV endpoint in demo |
| GitHub Actions deploy | Omitted | No GitHub/Cloudflare deploy target yet |
