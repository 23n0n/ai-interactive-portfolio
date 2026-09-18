# references/intake.md — the hand-held discovery conversation

Load this at **Stage 1 (Intake)**. Progressive loading applies: with this file you load only
`references/harness.md` (planned). Do **not** load the schema, deploy or security references here
(`AGENTS.md` §8). The owner never reads this file; you run the conversation from it.

Intake turns a person who says "I want my own site" into a registered site with a recorded design
contract. It ends when the answers are on disk, the sandbox decision is made, and the placeholder
state is known. It does **not** write layout code — that is Stage 2 (`references/design.md`).

## 1. How to ask

- **One question at a time.** Send a question, wait for the answer, acknowledge it in one line,
  then ask the next. Never paste the question list at the owner. The list below is your checklist,
  not a script.
- **The owner's own language.** Ask in the language they are speaking. The questions below are the
  canonical intent; render each one into their language and into plain words.
- **No infrastructure vocabulary.** Do not say "Supabase", "RLS", "Workers", "edge function",
  "Wrangler", "Postgres", "CI", "schema", "repository" in front of the owner unless they ask, or a
  decision genuinely needs informed consent (`AGENTS.md` §2). Ask about the site, never about the
  stack. Q25 is the one place where the stack can come up; describe it as "how the site is set up"
  and translate whatever they say.
- **Note answers verbatim — they are the design contract.** Record the owner's own words, in the
  language they answered in. Do not paraphrase, tidy, summarise or "improve" them. If an answer is
  vague, ask one follow-up question; never fill the gap yourself.
- **Conversational, not an interrogation.** Give the vision question (Q5) the most room — it is the
  most important answer. If the owner starts describing something useful that is not on the list,
  follow it, then return to the checklist. Skip a question they already answered in passing.
- **Fail closed, never guess.** If two readings of an answer are possible and the difference
  matters, ask exactly one clarifying question (`AGENTS.md` §11). An unknown becomes a question, not
  an assumption.
- **Record as you go.** Write each answer to the site's state (`references/state-layout.md`) as it
  arrives. A restart must be able to resume from disk, never from chat memory.
- **Gate discipline.** Account creation and any spend are **owner gate #2** (`AGENTS.md` §4). Ask
  before creating anything. Design approval is **owner gate #1** and happens in Stage 2, after this
  conversation — but the answers you collect here are what that gate approves.

## 2. The question set — all 25, six groups

Ask **every** question. Keep the numbering below (the design contract and the records can cite
"Q7" or "group 2"). Grouping is the old kit's six themes: identity, vision, layout and structure,
interaction and detail, content scope, constraints.

### Group 1 — Identity: who and for whom

1. Name, current role, one-line personal brand (the exact wording that should appear on the site).
   If the owner does not provide a full name (first **and** last), use the placeholder name
   `Zygfryd Niewiadomski-Nieśmiałek` everywhere the name is needed and tell the owner plainly that
   it is a placeholder to be replaced before launch (see §5).
2. Primary audience: recruiters, clients, conference organizers, the AI crawlers, or all of them?
   Pick **ONE** primary — it drives copy and layout.
3. Voice: professional, warm, witty, direct, humble-expert? Give one example sentence you like the
   sound of.
4. What makes you different — 1–2 sentences a recruiter should remember.

### Group 2 — Vision: the page in your head (most important)

5. **Open description:** walk me through your ideal page top to bottom, as if describing it to a
   designer who has never seen your site. What does the visitor see **FIRST** (first 5 seconds)?
   What do they scroll past? What should they remember after closing the tab?
   *(The most important question. Give it room. If the owner cannot answer it, use §3.3.)*
6. One word (or two) for vibe: calm, bold, technical, warm, futuristic, minimal, playful,
   corporate.
7. 2–3 colours that represent you — or let the agent propose a palette from the vibe word and
   defend it.
8. Type mood: serif/editorial, geometric, technical/mono, friendly/rounded, or mixed (e.g. serif
   headings + mono accents).
9. Density: minimal/airy vs rich/dense. Light, dark, or both — and which is the default?

### Group 3 — Layout and structure

10. Page organization: single scrolling home with sections, separate pages, or both (home + hub/doc
    pages)?
11. Spotlight pattern: portrait/photo, big headline + subline, terminal/typewriter intro, split
    layout, badge + CTA buttons, or something else?
12. Navigation: top bar, sidebar, or minimal (logo + 2–3 links)? Sticky or not?
13. Section order on the home page (e.g. spotlight → about → skills → experience → testimonials →
    AI → footer). Anything to reorder, drop, or add?
14. How to present data: experience as timeline or cards? Skills as strong/moderate/gap columns,
    tag cloud, or progress bars? Testimonials as quote cards, carousel, or grid?
15. Footer: what lives there (contact, links, disclaimer, CV button, knowledge-base nav)?

### Group 4 — Interaction and detail

16. Effects: scroll reveal, hover tilt, typing intro, parallax, particles — which do you actually
    want? *(Aesthetics only; accessibility wins.)*
17. AI chat placement: floating widget (corner), dedicated section, or both? JD analyzer as dialog
    or full page?
18. Anything you **HATE** in websites — colours, fonts, animations, popups, carousels. List it; it
    becomes a hard constraint.
19. 1–2 admired sites (inspiration only — copying discouraged; say **WHAT** you like in them, not
    the sites themselves).

### Group 5 — Content scope

20. Content collections (the reference has nine: services, expertise, articles, experience,
    certifications, technologies, speaking, glossary, resources) — which do you want, and roughly
    how many docs each?
21. CV: languages needed, sections to include, one page or longer?
22. Contact surface: email link, form, socials, "Ask AI about me" — which?
23. Site language(s): single, bilingual, which is primary?

### Group 6 — Constraints

24. Scope priorities: what must be perfect vs good-enough for launch?
25. Anything you expect off the reference stack? *(Ask first — no silent swaps.)*

## 3. Reading the answers

### 3.1 From answers to a design contract

The answers are input, not a design. Derive, in this order:

| Answer | Derives |
|---|---|
| Q6 (vibe), Q7 (colours) | colour ramps and the palette direction |
| Q8 (type mood), Q9 (density, theme default) | font families, type scale, default light/dark |
| Q1 (name, role, one-liner), Q2 (primary audience) | the spotlight's headline and first-5-seconds content |
| Q3 (voice), Q4 (differentiator) | copy tone and the memorable line |
| Q10 (page organization), Q13 (section order) | page structure and section rhythm |
| Q11 (spotlight pattern) | spotlight layout |
| Q12 (navigation) | nav style and stickiness |
| Q14 (data presentation), Q15 (footer) | card style, list/table presentation, footer contents |
| Q16 (effects) | motion tokens — minus anything Q18 forbids |
| Q17 (AI surfaces) | where chat and JD analysis live |
| Q18 (hates) | hard constraints — never designed against |
| Q19 (admired sites) | inspiration only — extract the quality, never the layout |
| Q20–Q23 (content scope) | which sections and collections exist, and in which language(s) |
| Q24 (priorities) | what gets built first and what may stay good-enough at launch |
| Q25 (expectations off the setup) | a stop-and-ask item, never a silent swap |

The token set, the wireframe and the approval gate are specified in `references/design.md`. Intake
stops at answers plus the plan for that gate; it does not sketch, derive tokens or build.

### 3.2 What intake must not do

- Do not load the schema, deploy or security references (`AGENTS.md` §8).
- Do not promise a timeline, a price or a technology you have not verified.
- Do not accept a hard constraint (Q18) and then design against it.
- Do not treat a re-derived or proposed vision as approved. Approval is owner gate #1, in Stage 2.
- Do not leave the answers only in chat. If it is not on disk, it did not happen.

### 3.3 When the owner cannot answer the vision question (Q5)

This is common and is not a failure. Do:

1. **Re-derive from the other answers (Q6–Q19).** Vibe, colours, type, density, nav preference,
   section order, hates and admired qualities are enough to propose a page.
2. **Show a sketch.** Build an ASCII wireframe of the home page top to bottom, following the
   derivation rules in `references/design.md`, and present it as a proposal: "here is the page I
   understood from your answers".
3. **Let them react.** A concrete sketch is easier to correct than a blank prompt. Iterate freely —
   revisions before approval are free.
4. **Still ask for approval.** Re-deriving the vision does **not** approve it. Owner gate #1 is a
   clear yes from the owner, recorded in the decisions log.
5. **If they answer later,** replace the proposal then; never build sections before gate #1.

## 4. The local, no-account sandbox — an early option

**Timing.** Offer this **early** in intake, when the owner has no accounts yet (GitHub / Cloudflare
/ Supabase / DeepSeek) and wants to see their idea before committing. It can come before or
alongside the questionnaire; its value is highest before any signup. It is a normal early option in
the hand-held path — not a tier, not a separate product.

**The offer** (adapt to the owner's language):

> "Want to see your layout + copy live in a browser first, locally, with no accounts? ~20–30 min,
> throwaway — nothing is created or charged."

**What it is** — a 100% local, disposable prototype:

1. Scaffold a throwaway Vite + React + Tailwind app in a temp folder (no repo, no accounts, no
   cloud).
2. **Dummy DB = flat files.** A small `dummy/` directory of JSON/TS modules (`profile.json`,
   `content.json`, `sections.json`) exposing the **same shape** the real build reads: name, title,
   `elevator_pitch`, status, target stages; site copy (headline, pitch, CTA…); section order.
3. Render a single-page approximation (spotlight → about → skills → experience) fed by those files,
   so the design-questionnaire answers become a real page the owner can click through.
4. AI copy help is optional and also account-free — a local Ollama model, or none at all.

**Boundaries — keep these intact:**

- It is a **throwaway sandbox, not the deliverable.** The production build still uses the full
  reference stack and the non-negotiables: RLS, the real data layer, the security gate.
- The flat-file model is **disposable** — it never becomes the production data layer and must not
  leak into the real schema/RLS design.
- Once the owner commits to accounts and the real build starts, **skip it**.
- **Commitment-free:** nothing is created on any platform and nothing is charged. Delete the temp
  folder and you leave no trace — the owner can stop any time.
- The sandbox does not replace owner gate #1: the approved design contract still comes from Stage 2
  (`references/design.md`).

## 5. Placeholder rule

If the owner does not provide a full name (first **and** last):

- use the placeholder name `Zygfryd Niewiadomski-Nieśmiałek` everywhere the name is needed;
- tell the owner plainly that it is a placeholder, not a final name;
- record `placeholder name in use: yes` in `manifest.md` (`references/state-layout.md`); it must be
  `no` before the go-live gate;
- carry the flag into the design contract and the pre-launch checklist so the name is replaced
  before launch. A live site must never ship the placeholder.

## 6. What to record before leaving intake

- `decisions.log`: an `intake` line — registration, the accounts state, and the sandbox decision
  (taken / declined / not offered). The verbatim answers are the design contract input and are
  recorded alongside, or referenced from, the `design-contract` line written in Stage 2.
- `manifest.md`: the identity block (name as it appears, role/one-liner, primary audience, voice,
  placeholder flag), the accounts table, and open items.
- **No secrets.** Accounts and statuses only — never keys, tokens or passwords
  (`references/state-layout.md`).
- **Accounts and spend are owner gate #2.** Ask before creating anything; never invent credentials
  (`AGENTS.md` §4, §11). Harness-specific install notes belong in `references/harness.md`
  (planned); until it exists, the old kit's Step 1 (install the harness and connect the model) is
  the fallback.

## Source map

| Section here | Old-kit section |
|---|---|
| §1 How to ask | `SKILL_INTERACTIVE_PORTFOLIO.md` — "Design questionnaire (run BEFORE layout)" intro ("Ask user ALL questions (adapt language; note answers verbatim — they are the design contract)"); `GUIDE_FROM_SCRATCH.md` — "Step 6 — Phase A: the design questionnaire" |
| §2 The question set (Q1–Q25, groups 1–6) | `SKILL_INTERACTIVE_PORTFOLIO.md` — "Design questionnaire (run BEFORE layout)", groups 1–6 and questions 1–25, substance preserved |
| §2 Q1 placeholder sentence | `SKILL_INTERACTIVE_PORTFOLIO.md` — "Design questionnaire" Q1 placeholder paragraph |
| §3.1 From answers to design contract | `SKILL_INTERACTIVE_PORTFOLIO.md` — "Design questionnaire" derive paragraph (design tokens, type scale, spacing rhythm, layout concept, responsive + accessibility) |
| §3.3 Owner cannot answer Q5 | `SKILL_INTERACTIVE_PORTFOLIO.md` — "If the user cannot answer #5, re-derive it from answers #6–#19 and present the sketch — approval is still required" |
| §4 The local, no-account sandbox | `SKILL_INTERACTIVE_PORTFOLIO.md` — "Optional — a local, no-account sandbox first (before you commit)" (including its "Boundaries" list); "When to use" sandbox offer; `GUIDE_FROM_SCRATCH.md` — the "Optional — no accounts yet?" note before Step 1 |
| §5 Placeholder rule | `SKILL_INTERACTIVE_PORTFOLIO.md` — Q1 placeholder paragraph; `GUIDE_FROM_SCRATCH.md` — "Step 6 — Phase A: the design questionnaire" placeholder note |
| §6 What to record | `SKILL_INTERACTIVE_PORTFOLIO.md` — "note answers verbatim — they are the design contract"; Non-negotiables 1 and 3; `GUIDE_FROM_SCRATCH.md` — "Step 2 — Create the remaining accounts" (account state, no secrets) |
