# references/design.md — from answers to the approved design contract

Load this at **Stage 2 (Design)**. Progressive loading applies: load only this file. Do **not**
load the schema, deploy or security references here (`AGENTS.md` §8) — the owner is choosing
colours and layout, not tables. **No section code is written before owner gate #1.**

Stage 2 turns the verbatim intake answers (`references/intake.md`) into an approved design
contract: a token set, a type scale, a spacing rhythm, a layout concept, responsive and
accessibility rules, and an ASCII wireframe. The 25 design questions were asked once, in the Stage 1
conversation (`references/intake.md` §2); Stage 2 does not re-ask them — it derives from the
recorded answers. The owner approves tokens **and** sketch before any section is built.

## 1. What Stage 2 produces

1. A token set defined in Tailwind v4 `@theme` (§2).
2. A type scale and a spacing rhythm (§3).
3. A layout concept: navigation, spotlight pattern, section rhythm, card style, footer (§4).
4. Responsive and accessibility rules (§5).
5. An ASCII wireframe of the home page top to bottom (§6).
6. **Owner gate #1:** the owner's explicit approval of tokens + sketch, recorded in
   `decisions.log` as a `design-contract` line (§7).

## 2. Design tokens

Tokens live in `styles.css` under Tailwind v4 `@theme`, with base styles in the same file and
`components.json` configured for shadcn/ui. Use the exact Tailwind v4 namespaces so the tokens
generate utilities:

| Token need | Tailwind v4 `@theme` namespace | Derived from |
|---|---|---|
| Colour ramps | `--color-*` | Q7 (colours), Q6 (vibe) |
| Font families | `--font-*` | Q8 (type mood) |
| Type scale (sizes) | `--text-*` (with `--text-*--line-height` and `--text-*--letter-spacing`) | Q8, Q9 |
| Type details | `--font-weight-*`, `--tracking-*`, `--leading-*` | Q8 |
| Radius | `--radius-*` | Q6 (vibe), Q9 (density) |
| Shadow | `--shadow-*`, `--inset-shadow-*`, `--drop-shadow-*` | Q6, Q9 |
| Motion | `--ease-*`, `--animate-*` (with `@keyframes`) | Q16 (effects), minus Q18 (hates) |
| Spacing base unit | `--spacing` (all spacing utilities are multiples of it) | Q9 (density) |
| Breakpoints | `--breakpoint-*` | responsive defaults (§5) |

Example shape — every name and value below is **derived from the owner's answers and replaced by
the derived values**, never copied as a default:

```css
/* styles.css */
@import "tailwindcss";

@theme {
  /* colour ramps: canvas / surface / ink / accent, plus one semantic pair */
  --color-canvas: oklch(0.98 0.005 90);
  --color-ink: oklch(0.22 0.01 260);
  --color-accent-500: oklch(0.62 0.17 250);

  /* fonts: at most two families, plus optional mono accent */
  --font-display: "Newsreader", ui-serif, Georgia, serif;
  --font-body: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  /* type scale with paired line-heights */
  --text-2xl: 1.5rem;
  --text-2xl--line-height: 2rem;

  /* radius, shadow, motion */
  --radius-card: 0.75rem;
  --shadow-card: 0 1px 2px oklch(0.22 0.01 260 / 0.08),
                 0 8px 24px oklch(0.22 0.01 260 / 0.06);
  --ease-out-soft: cubic-bezier(0.22, 1, 0.36, 1);
  --animate-reveal: reveal 0.5s var(--ease-out-soft) both;

  /* spacing base unit */
  --spacing: 0.25rem;
}

@keyframes reveal {
  from { opacity: 0; transform: translateY(0.5rem); }
  to   { opacity: 1; transform: none; }
}
```

Rules:

- Derive every value from an answer; if an answer is missing, ask rather than defaulting silently.
- A light/dark decision (Q9) becomes real: define both themes and name the default, or define one
  and say so.
- Hard constraints from Q18 (hated colours, fonts, animations, popups, carousels) are exclusions,
  not preferences. No token may reintroduce one.
- No secret, account or schema values belong in a token.

## 3. Type scale and spacing rhythm

**Type scale.** Choose one scale and name every step; do not improvise sizes per component.

- Body text at a comfortable reading size; headings step up by roughly 1.2–1.25.
- Encode each step as `--text-*` with a paired `--text-*--line-height` so size and leading travel
  together.
- Build hierarchy with size, weight and space — not with extra font families. Two families maximum
  (display + body), plus at most one mono accent (Q8).
- Keep prose measure around 60–75 characters (`--container-*` or a `max-w` utility) for readability.

**Spacing rhythm.** Pick a base unit and use only multiples of it (Tailwind derives spacing
utilities from `--spacing`).

- One section gap token controls the vertical rhythm between sections; one inner gap token controls
  card and component padding.
- Airy (Q9) means larger section gaps and more whitespace; dense means a tighter rhythm and more
  content per screen. Record which was chosen.
- Consistent rhythm is what makes separately built sections look like one page — apply the same
  tokens in every section.

## 4. Layout concept

Define all six parts before sketching:

- **Navigation** (Q12): top bar, sidebar, or minimal (logo + 2–3 links); sticky or not. On mobile
  it collapses to a working menu, still keyboard operable.
- **Spotlight** (Q11): what holds the first 5 seconds. It must carry the one primary audience (Q2)
  and the one-line brand (Q1). Choose the pattern the owner named — portrait, headline + subline,
  terminal/typewriter intro, split layout, badge + CTA buttons, or an equivalent.
- **Section rhythm** (Q10, Q13): name every section and its order. Vary the layout between
  contained and full-bleed sections so the page has rhythm, and give each section one job. Typical
  sections available: navigation, spotlight (with the "Ask AI about me" CTA), about, skills matrix,
  experience timeline, testimonials/recommendations, just-for-fun links, disclaimer, contact,
  footer — plus the AI surfaces (Q17). Build only the ones the owner chose; drop the rest.
- **Card style** (Q14): define one card primitive — padding, radius, border/shadow, hover — and use
  it for experience, skills, testimonials and collection entries. Variation is by content, not by
  inventing new card styles.
- **Data presentation** (Q14): experience as timeline or cards; skills as strong/moderate/gap
  columns, tag cloud, or progress bars; testimonials as quote cards, carousel, or grid.
- **Footer** (Q15): contact, links, disclaimer, CV button, knowledge-base navigation — whatever the
  owner listed, nothing they did not.

Also decide now where the AI chat lives (floating widget, dedicated section, or both) and whether
JD analysis is a dialog or a full page (Q17). These are section-level decisions, not build details.

## 5. Responsive and accessibility requirements (non-negotiable)

These apply to every section and are verified by the agent, not the owner.

**Responsive**

- Design mobile-first: lay out the small screen first, then widen at `--breakpoint-*` steps.
- Test at roughly 360px, 768px and 1280px wide. No horizontal scroll at any width.
- Touch targets at least 44px; input text at least ~16px so focus does not trigger browser zoom on
  mobile.
- Below-the-fold sections may be deferred for performance; wherever that happens, each section
  declares the anchor ids it renders and hash navigation routes through the shared driver, so links
  work on first load (see the code-split/anchor rule in `SKILL_INTERACTIVE_PORTFOLIO.md`,
  "Phase 4 — Core sections": declare anchor ids, force the owning section to mount, then scroll once
  the element exists).

**Accessibility**

- **Contrast AA:** body text at least 4.5:1, large text at least 3:1, and UI borders/icons at least
  3:1 against their background. Check the actual token pairs used on screen, not the palette in
  isolation, and fix the pair (not just the swatch) when it fails.
- **Keyboard navigation:** every interactive element is reachable and operable by keyboard; focus
  order is logical; focus states are visible; a skip link reaches the main content; dialogs trap
  focus and return it on close.
- **Reduced motion:** honour `prefers-reduced-motion: reduce`. Disable or soften reveal, tilt,
  parallax and typing effects. The page must be complete and readable without any animation. Q16's
  own rule applies: *aesthetics only; accessibility wins.*
- **Semantics:** one `h1` per page, landmark regions, alt text on meaningful images, labels on
  inputs, and a correct `lang`.
- Anything the owner listed in Q18 as hated (popups, carousels, autoplaying media) is excluded.
- If an effect the owner asked for cannot be made accessible, drop it or replace it, and tell the
  owner why.

## 6. The wireframe

Produce an **ASCII wireframe of the home page, top to bottom**, from the owner's section order
(Q13) and footer (Q15). Show it to the owner and make it part of gate #1.

Rules:

- One block per section, in the owner's order, labelled with the section name and its anchor id.
- The spotlight block names what appears in the first 5 seconds.
- Note the mobile stacking/order under the wide sketch (one column, nav collapse, CTA placement).
- Drop or add blocks to match the owner's answers; this template is a shape, not a fixed page.

```
┌──────────────────────────────────────────────────┐
│ nav: logo · links · CV/CTA             [theme]   │
├──────────────────────────────────────────────────┤
│ SPOTLIGHT (#top)                                 │
│   headline …                                     │
│   subline …                     [portrait/visual]│
│   [CTA: Ask AI about me]  [CV]                   │
├──────────────────────────────────────────────────┤
│ ABOUT (#about)                                   │
├──────────────────────────────────────────────────┤
│ SKILLS (#skills)                                 │
├──────────────────────────────────────────────────┤
│ EXPERIENCE (#experience)                         │
│   timeline / cards …                             │
├──────────────────────────────────────────────────┤
│ TESTIMONIALS (#testimonials)                     │
├──────────────────────────────────────────────────┤
│ AI (#ai) — chat widget/section · JD analysis     │
├──────────────────────────────────────────────────┤
│ FUN LINKS (#fun) · DISCLAIMER (#disclaimer)      │
├──────────────────────────────────────────────────┤
│ CONTACT (#contact)                               │
├──────────────────────────────────────────────────┤
│ FOOTER (#footer)                                 │
└──────────────────────────────────────────────────┘
```

Each block later becomes a real section that declares its anchor id.

## 7. Owner gate #1 — approve the design before building

Present the tokens **and** the wireframe as one proposal, in the owner's language and in outcomes
terms:

- what the visitor sees first and what they remember;
- the colours, fonts and feel, shown as concrete values;
- the section order and the shape of the page.

Then ask plainly for approval. Rules:

- A silence, a maybe, or an unanswered question is **not** approval (`AGENTS.md` §4).
- Revisions before approval are free; iterate until the owner says yes.
- On approval, append a `design-contract` line to `decisions.log`
  (`references/state-layout.md`) recording: the date, that the owner **APPROVED**, a short summary
  of the approved tokens, that the wireframe was accepted as shown, and a pointer to where the
  approved token set lives (`styles.css`).
- **Build nothing before that line exists.** No section, no scaffold work that assumes a design.
- Later changes to the design are a new change with a new record — never a silent edit of the
  approved contract.

## 8. The original-layout rule

- **Copying the reference layout is allowed but advised against.** Guide the owner toward an
  original design that resonates with them, and say why: an original page reflects this owner's
  answers instead of someone else's site.
- Every section is designed for **this** owner, not stapled on (Non-negotiable 1).
- Inspiration is not a template. When the owner names admired sites (Q19), take **what** they like —
  the quality, the feeling — never the layout.
- **Drift check before building each section:** if the build starts reproducing the reference
  layout, stop, re-derive from the questionnaire answers, and show a revised sketch.
- If a re-derivation changes the approved contract, it goes through gate #1 again and is recorded.
- If the owner explicitly chooses to copy, record that choice in `decisions.log` together with the
  fact that copying was advised against. The owner's choice wins; the record stays honest.

## Source map

| Section here | Old-kit section |
|---|---|
| §1 Stage 2 output, §7 gate #1 | `SKILL_INTERACTIVE_PORTFOLIO.md` — "Design questionnaire (run BEFORE layout)" derive paragraph ("Show the token set + a layout sketch … and get approval before building sections"); "Phase 2 — Design system (original layout)" ("Run questionnaire; tokens + layout sketch; user approval") |
| §2 Design tokens | `SKILL_INTERACTIVE_PORTFOLIO.md` — "Phase 2 — Design system (original layout)" ("Tokens in `styles.css` (Tailwind v4 `@theme`), base styles, `components.json` for shadcn"); "Design questionnaire" derive paragraph ("design tokens (Tailwind v4 `@theme`: color ramps, fonts, radius, shadow, motion)") |
| §3 Type scale and spacing rhythm | `SKILL_INTERACTIVE_PORTFOLIO.md` — "Design questionnaire" derive paragraph ("type scale, spacing rhythm"); questionnaire Q8, Q9 |
| §4 Layout concept | `SKILL_INTERACTIVE_PORTFOLIO.md` — "Design questionnaire" derive paragraph ("layout concept (nav style, spotlight pattern, section rhythm, card style, footer)"); questionnaire Q10–Q15, Q17; "Phase 4 — Core sections" (section list) |
| §5 Responsive and accessibility | `SKILL_INTERACTIVE_PORTFOLIO.md` — "Phase 4 — Core sections" ("Responsive (mobile-first) + accessible (contrast AA, focus states, `prefers-reduced-motion`)"); questionnaire Q16 ("Aesthetics only; accessibility wins."), Q18 |
| §6 Wireframe | `SKILL_INTERACTIVE_PORTFOLIO.md` — "Design questionnaire" derive paragraph ("Show the token set + a layout sketch (ASCII wireframe of the home page top to bottom)"); `GUIDE_FROM_SCRATCH.md` — "Step 6 — Phase A: the design questionnaire" check (token set + layout sketch) |
| §7 Owner gate #1 | `SKILL_INTERACTIVE_PORTFOLIO.md` — "Design questionnaire" ("get approval before building sections"; "approval is still required"); "Phase 2 — Design system (original layout)" ("user approval") |
| §8 Original-layout rule | `SKILL_INTERACTIVE_PORTFOLIO.md` — Non-negotiable 1 ("Original layout"); "Phase 2 — Design system (original layout)" ("Copying reference layout allowed, advised against. Guide user toward original design; re-derive from questionnaire if drifting to copy."); questionnaire Q19 ("inspiration only — copying discouraged") |
