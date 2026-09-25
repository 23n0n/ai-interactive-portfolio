# Demo Interactive Portfolio

A **local demo** built with the `interactive-portfolio` skill. Purple/creative,
light-only, witty + warm. Placeholder persona **Zygfryd Niewiadomski-Nieśmiałek**.

> ⚠️ All content (identity, roles, testimonials, email/socials) is **fictional**
> demo data. Replace it before any real launch.

## Stack
Vite 8 · React 19 · TypeScript 5.9 · Tailwind CSS v4 · React Router v7 ·
Testing Library + Vitest. Local typed data layer in `src/data/content.ts`
stands in for Supabase (see `adr/ADR-0001-local-data-demo.md`). **No cloud
accounts, no backend, no security boundary** — this is a local demo only.

## Run
```bash
npm install        # or: bun install
npm run dev        # dev server  → http://localhost:5199
npm run build      # production build → dist/
npm run preview    # serve the build → http://localhost:4173
```

The committed `.npmrc` pins the public npm registry and `bun.lock` pins the
resolved tree, so a fresh install in CI cannot silently resolve through a
private mirror.

## Verify
```bash
npm run typecheck
npm run lint
npm test           # 21 tests: data layer, per-route render smoke tests, anchor deep links
npm run build
```

## Routes
| Path | Page |
|---|---|
| `/` | Home (typewriter hero, about, skills, experience, collections, testimonials) |
| `/services`, `/services/:slug` | Services hub + docs |
| `/technologies`, `/technologies/:slug` | Technologies hub + docs |
| `/cv` | CV (English, Print/Save-as-PDF) |
| `/contact` | Contact + dummy AI chat |
| `*` | 404 |

## Docs
- `docs/PROJECT_REFERENCE_ARCHITECTURE.md` — design system, routes, surfaces
- `adr/ADR-0001-local-data-demo.md` — why local data / deviation from the stack

## Next steps (require real accounts — not in this demo)
Move to the Supabase + Cloudflare stack and run Phase 7–8 of the skill:
deploy, RLS/auth/storage hardening, Turnstile, edge functions, CI/CD, backups.
