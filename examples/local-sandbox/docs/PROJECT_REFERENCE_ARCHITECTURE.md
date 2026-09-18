# Demo Interactive Portfolio — Project Reference

Local demo build of the `interactive-portfolio` skill. Approved design v2.

## Stack (see adr/ADR-0001-local-data-demo.md for deviations)
- Vite 8 + React 19 + TypeScript 5.9
- Tailwind CSS v4 (`@theme` design tokens in `src/styles.css`)
- React Router v7
- lucide-react icons, clsx + tailwind-merge + class-variance-authority
- Local data layer: `src/data/content.ts` (typed, replaces Supabase in demo)

## Design system (design v2, approved)
- **Palette:** purple/creative, light-only. Cream bg `#faf9fc`, ink text
  `#2a2333`, primary purple ramp (`#c4b5fd`…`#6d28d9`), AI lime accent
  (`#84cc16`), warm amber callouts.
- **Voice:** witty + warm. **Density:** rich.
- **Motion:** typewriter hero + gentle scroll-reveal + parallax feel; all
  disabled under `prefers-reduced-motion`.
- **Fonts:** Fraunces (display), Inter (body), JetBrains Mono (accents).

## Routes
| Path | Page |
|---|---|
| `/` | Home (hero/typewriter, about, skills, experience, collections preview, testimonials) |
| `/services` | Services hub |
| `/services/:slug` | Service doc |
| `/technologies` | Technologies hub |
| `/technologies/:slug` | Technology doc |
| `/contact` | Contact + dummy AI chat |
| `/cv` | CV (English) — printable via Print/Save-as-PDF |
| `*` | 404 |

Content hubs/docs are **data** rendered at runtime (`renderBlock` in
`src/pages/collection.tsx`); related links resolve by explicit refs + backlinks
+ tag matches (`resolveRelated`).

## Placeholder notice
Identity, roles, testimonials, email/socials and all body copy are fictional
demo content for the persona **Zygfryd Niewiadomski-Nieśmiałek**. Must be
replaced before any real launch.

## Commands
- `npm run dev` — dev server (http://localhost:5199)
- `npm run typecheck` / `npm run lint` / `npm run build` / `npm run preview`

## Machine-readable + accessibility surfaces (demo)
- Static (served from `public/`): `robots.txt`, `sitemap.xml`, `llms.txt`
- JSON-LD (`schema.org` `Person` + `WebSite` graph) in `index.html`
- Accessibility: skip-to-content link, `main` landmark (`tabIndex=-1`, focus after
  route change via `ScrollToTop`), `aria-label`s, focus-visible rings, semantic
  landmarks; all animation disabled under `prefers-reduced-motion`.
- Note: no SSR, so machine-readable surfaces are static (a full SPA cannot
  emit per-route dynamic robots/sitemap/llms without a server).

## Verification
- `npm run typecheck` / `npm run lint` / `npm test` / `npm run build` all green.
- Smoke tests (`src/pages/routes.test.tsx`, vitest + jsdom + testing-library): every
  public route renders, nav/footer links present, dummy-AI chat answers a query,
  404 shows for unknown routes. jsdom mocks for `IntersectionObserver`,
  `matchMedia`, `print` in `src/test/setup.ts`.
- Data-layer tests (`src/data/content.test.ts`): collections resolve, doc slugs
  unique, related links resolve without self-reference and stay ≤6.

## Security status
This is a **local demo**: no auth, no RLS, no edge functions, no secrets.
No security boundary is claimed. Real hardening is out of scope until the
build moves to the Supabase/Cloudflare stack with real accounts.
