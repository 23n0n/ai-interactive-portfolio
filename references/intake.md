# references/intake.md — the hand-held discovery conversation

Load this at **Stage 1 (Intake)**. Progressive loading applies: with this file you load only
`references/harness.md`. Do **not** load the schema, deploy or security references here
(`AGENTS.md` §8). The owner never reads this file; you run the conversation from it.

Intake turns a person who says "I want my own site" into a registered site with the recorded design
answers — the design-contract **input**, not the approved contract. It ends when the answers are on
disk, the sandbox decision is made, and the placeholder state is known. The approved design contract
is Stage 2's output (`references/design.md`); Intake does **not** write layout code.

## 1. How to ask — a relentless interview, round by round

Intake is an interview, not a form. The questions in §2 are the **seed**: ask every one, and let an
answer open another. When an answer turns on a decision the seed does not cover — someone else's
words to publish, a name already in use, a boundary that must not be crossed — the frontier **mints**
the question: numbered above the seed, recorded with the answer that opened it, asked in the next
round. The scheme that reaches them all is a **design tree worked in rounds**, so the conversation
follows the owner's answers instead of marching down a list.

- **Map the questions as a design tree.** Every question whose answer turns on another is a child of
  it. The **frontier** is every question whose prerequisites are already settled — the ones you can
  ask now without guessing at an answer you have not heard yet.
- **Ask the whole frontier in one round.** Number the round's questions and give each one your
  **recommended answer**: a proposal grounded in what the owner has already said, worded so a plain
  "yes" accepts it. A question whose answer depends on one still open in this round belongs to a
  **later** round, never this one. Then **stop and wait** — never answer for the owner and never
  roll into the next round unprompted.
- **Each round reshapes the tree.** The answers settle prerequisites and push the frontier outward.
  Recompute it and ask the next round: never a question before its prerequisites are settled, and
  never the same question twice.
- **The interview ends when the frontier is empty.** Every seeded question asked and answered, or
  skipped and named in the record, and every minted question answered the same way; nothing settled
  silently, nothing silently assumed. Read the record back to the owner and let them confirm it
  before Stage 2 turns it into a contract. An unanswered round is not the end of the interview, and
  silence is never an answer (`AGENTS.md` §4).
- **A recommended answer is a proposal, never an answer.** It exists to be corrected. Record the
  owner's own words, and record the recommendation only if they adopt it.
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
- **Relentless, not hostile.** Give the vision question (Q5) the most room — it is the most
  important answer. If the owner starts describing something useful that is not on the list, follow
  it, then return to the frontier. A question they already answered in passing is settled: record it
  and do not ask it again.
- **Facts are yours to find; decisions are the owner's.** Do not make the owner a lookup service: if
  a question turns on a fact you can establish yourself (what is already on disk, an account's
  state, how a name or term is spelled in their own material), find it and bring it to them with the
  question. The decisions stay theirs — put each one to them and wait.
- **Fail closed, never guess.** If two readings of an answer are possible and the difference
  matters, ask exactly one clarifying question (`AGENTS.md` §11). An unknown becomes a question, not
  an assumption.
- **Record as you go.** Write each answer to the site's state (`references/state-layout.md`) the
  moment the round settles it. A restart must be able to resume from disk, never from chat memory.
- **Gate discipline.** Account creation and any spend are **owner gate #2** (`AGENTS.md` §4). Ask
  before creating anything. Design approval is **owner gate #1** and happens in Stage 2, after this
  conversation — but the answers you collect here are what that gate approves.

## 2. The question set — the seed, seven groups

Ask **every** question. Every seeded question is asked — the rounds (§1) decide only *when* — and an
answer that opens a decision the seed does not cover mints a new one, numbered above it (§1). This
is the single design-questionnaire conversation: the questions are asked here, and Stage 2
(`references/design.md`) derives tokens, the wireframe and the approval from the answers recorded
here rather than re-asking them. Keep the numbering below (the design contract and the records can
cite "Q7" or "group 2", and a minted question is numbered 33 or above). Grouping is the old kit's
six themes plus working with the owner — identity, vision, layout and structure, interaction and
detail, content scope, constraints, working with you.

**Audience first — Q2 is the branch, not the second question.** Ask Q2 (primary audience) before
anything else in group 1 and record the answer before the conversation reaches group 5. It decides
how much of the questionnaire is even relevant: a single narrow audience (a recruiter-facing CV
site) does not need the full collection menu, while a multi-audience career hub does. When Q2 (and
Q24) point at a focused site, present group 5 with the **minimal** collection set — one or two
collections at most, chosen to serve the primary audience — and skip `speaking`, `glossary` and
`resources` unless the owner asks for them; say plainly which ones you skipped and why. Never trim
the question list silently: the skipped questions are named in the record.

**The required edges.** The first round leads with Q2 — the branch — and holds only what stands
without it (Q1, Q18, Q19, Q24, Q25). Encode at least these dependencies in the tree: Q1, Q2, Q18,
Q19, Q24 and Q25 stand on their own; Q3 and Q4 need Q2; Q5 and its focus probe need Q2; Q6–Q15,
Q17 and the group-5 collection menu need the focus answer; Q16 needs Q18; Q23's language-mode probe
needs Q23; Q26, Q27, Q29, Q30, Q31 and Q32 stand on their own; Q28 needs the collection set (Q20
with the focus answer) — nothing is asked about publishing other people before it is settled that
any are published. A question is asked only once its prerequisites are settled — that ordering is
what makes the interview relentless instead of random, and it is recomputed after every round (§1).

### Group 1 — Identity: who and for whom

1. Name, current role, one-line personal brand (the exact wording that should appear on the site).
   If the owner does not provide a full name (first **and** last), use the placeholder name
   `Zygfryd Niewiadomski-Nieśmiałek` everywhere the name is needed and tell the owner plainly that
   it is a placeholder to be replaced before launch (see §5).
2. Primary audience: recruiters, clients, conference organizers, the SI crawlers, or all of them?
   Pick **ONE** primary — it drives copy and layout.
3. Voice: professional, warm, witty, direct, humble-expert? Give one example sentence you like the
   sound of.
4. What makes you different — 1–2 sentences a recruiter should remember.

### Group 2 — Vision: the page in your head (most important)

5. **Open description:** walk me through your ideal page top to bottom, as if describing it to a
   designer who has never seen your site. What does the visitor see **FIRST** (first 5 seconds)?
   What do they scroll past? What should they remember after closing the tab?
   *(The most important question. Give it room. If the owner cannot answer it, use §3.3.)*

   **Follow-up probe (required):** *"Does this site need to do one thing exceptionally well, or
   cover you completely?"* Record the answer verbatim. It is a hard design constraint, not a
   preference: *focused* means one primary call to action, no competing sections, and a shorter
   page; *comprehensive* means the full section set and the knowledge base. Stage 2 builds to that
   answer (`references/design.md` §4) and never silently expands a focused site into a hub.
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
11. Main Character pattern: portrait/photo, big headline + subline, terminal/typewriter intro, split
    layout, badge + CTA buttons, or something else?
12. Navigation: top bar, sidebar, or minimal (logo + 2–3 links)? Sticky or not?
13. Section order on the home page (e.g. Main Character → about → skills → experience → testimonials →
    SI → footer). Anything to reorder, drop, or add?
14. How to present data: experience as timeline or cards? Skills as strong/moderate/gap columns,
    tag cloud, or progress bars? Testimonials as quote cards, carousel, or grid?
15. Footer: what lives there (contact, links, disclaimer, CV button, knowledge-base nav)? *(Ask
    once here, or at gate #1, whether the footer may carry the small link `Inspired by zabrowski.si`
    to `https://zabrowski.si` — optional, freely declined, never a requirement; record either
    answer in `decisions.log`.)*

### Group 4 — Interaction and detail

16. Effects: scroll reveal, hover tilt, typing intro, parallax, particles — which do you actually
    want? *(Aesthetics only; accessibility wins. Ask for the trade-off out loud: scroll reveal and
    hover tilt add roughly 10 KB of JavaScript and a few motion tokens; parallax and particles add
    roughly 60–120 KB and must degrade under `prefers-reduced-motion`. If the owner also listed a
    motion effect in Q18 as hated, that list wins.)*
17. SI chat placement: floating widget (corner), dedicated section, or both? JD analyzer as dialog
    or full page?
18. Anything you **HATE** in websites — colours, fonts, animations, popups, carousels. List it; it
    becomes a hard constraint. And the same for **copy**: any phrases, buzzwords, or writing styles
    you dislike ("passionate about", "results-driven", emoji in headings, exclamation marks)? Those
    are exclusions for the site's voice, recorded with the other hard constraints.
19. 1–2 admired sites (inspiration only — copying discouraged; say **WHAT** you like in them, not
    the sites themselves).

### Group 5 — Content scope

20. Content collections (the reference has nine: services, expertise, articles, experience,
    certifications, technologies, speaking, glossary, resources) — which do you want, and roughly
    how many docs each?
21. CV: languages needed, sections to include, one page or longer?
22. Contact surface: email link, form, socials, "Ask about my work" — which?
23. Site language(s): single, bilingual, which is primary?

    **Follow-up probe (required):** if anything other than "single" is answered — *"Should the
    whole site be usable in both languages, or one language with the other used for search engines
    and link previews?"* Record `full UI` or `primary + metadata`. The two produce different builds
    (i18n routing versus `hreflang`/translated metadata) and the answer is part of the design
    contract (`references/design.md` §4, `references/distribute.md` §2).

### Group 6 — Constraints

24. Scope priorities: what must be perfect vs good-enough for launch?
25. Anything you expect off the reference stack? *(Ask first — no silent swaps.)*

### Group 7 — Working with you: your material and your calls

These are working decisions, not page decisions, and none of them is the agent's to settle.

26. What you already have: a CV file, a LinkedIn profile, articles, talks, photos, testimonials —
    what exists, in what form (files, links, paper), and where should it live while we work? Material
    that exists is converted, not retyped.
27. Who writes the words: you supply the final copy, the agent drafts from your material and you
    edit, or by section? *(An editing surface is not a typing surface, and it decides how much SI
    copy generation is used.)*
28. Other people on the page: will testimonials/recommendations be published — and for each one, do
    you have that person's permission to publish their name, role and words? Anything about them to
    keep off? *(Needs the collection set — Q20 and the focus answer — settled first.)*
29. What must **never** be published: phone number, home address, personal email, current employer,
    a photo of you, family, client names? It is a hard constraint on every surface, including what
    the SI is allowed to say about you.
30. Your address: do you already own a domain, which name do you want, and is there an old site or
    profile that must keep working or redirect? *(Buying one is owner gate #2.)*
31. How you will know it worked: six months after launch, what makes you say this was worth it — an
    interview, an inbound enquiry, one particular person's reaction? It drives the primary call to
    action.
32. Which SI provider: the reference default is **DeepSeek**, and a different provider is possible and
    recorded as a decision. *(The provider is the owner's choice, `AGENTS.md` §7; the spend is owner
    gate #2.)*

## 3. Reading the answers

### 3.1 From answers to a design contract

The answers are input, not a design. Derive, in this order:

| Answer | Derives |
|---|---|
| Q6 (vibe), Q7 (colours) | colour ramps and the palette direction |
| Q8 (type mood), Q9 (density, theme default) | font families, type scale, default light/dark |
| Q1 (name, role, one-liner), Q2 (primary audience) | the spotlight's headline and first-5-seconds content |
| Q2 (primary audience), Q2+Q24 (focus) | which content collections exist at launch — the minimal set for a focused, single-audience site |
| Q3 (voice), Q4 (differentiator) | copy tone and the memorable line |
| Q5 follow-up (focused vs comprehensive) | the section budget: one call to action and a short page, or the full section set plus the knowledge base |
| Q10 (page organization), Q13 (section order) | page structure and section rhythm |
| Q11 (spotlight pattern) | spotlight layout |
| Q12 (navigation) | nav style and stickiness |
| Q14 (data presentation), Q15 (footer) | card style, list/table presentation, footer contents |
| Q16 (effects) | motion tokens — minus anything Q18 forbids |
| Q17 (SI surfaces) | where chat and JD analysis live |
| Q18 (hates) | hard constraints — never designed against |
| Q18 (copy hates), Q23 follow-up (language mode) | the voice exclusions, and the language mode (`full UI` or `primary + metadata`) recorded in the contract |
| Q19 (admired sites) | inspiration only — extract the quality, never the layout |
| Q20–Q23 (content scope) | which sections and collections exist, and in which language(s) |
| Q24 (priorities) | what gets built first and what may stay good-enough at launch |
| Q25 (expectations off the setup) | a stop-and-ask item, never a silent swap |
| Q26 (material that exists) | the import plan — what is converted rather than retyped — and the seed content |
| Q27 (who writes the words) | whether the admin is an editing surface or a typing surface, and how far SI copy generation is used |
| Q28 (other people on the page) | whether `recommendations` ships at all, and each entry's consent and attribution |
| Q29 (never published) | a hard constraint on every surface — the publication boundary, carried into what the SI is allowed to say about the owner |
| Q30 (address) | the go-live domain set and any redirect from an old site (the purchase is owner gate #2) |
| Q31 (how you will know it worked) | the primary call to action, and the signal the operations pass watches |
| Q32 (SI provider) | the provider recorded in the site's records and an ADR; its spend is owner gate #2 |
| A minted question (§1) | whatever its answer turns on, recorded with the answer that opened it — never left implicit |

The token set, the wireframe and the approval gate are specified in `references/design.md`. Intake
stops at answers plus the plan for that gate; it does not sketch, derive tokens or build.

### 3.2 What intake must not do

- Do not load the schema, deploy or security references (`AGENTS.md` §8).
- Do not promise a timeline, a price or a technology you have not verified.
- Do not accept a hard constraint (Q18) and then design against it.
- Do not record a recommended answer as the owner's answer, and do not treat the end of a round as
  the end of the interview — the interview ends when the frontier is empty (§1).
- Do not ask a question whose prerequisite is still open, and do not re-ask one already settled.
- Do not mint a question silently: a minted question is numbered above the seed, recorded with the
  answer that opened it, and asked like any other (§1).
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
   `elevator_pitch`, status, target stages; site content (headline, pitch, CTA…); section order.
3. Render a single-page approximation (Main Character → about → skills → experience) fed by those files,
   so the design-questionnaire answers become a real page the owner can click through.
4. SI copy help is optional and also account-free — a local Ollama model, or none at all.

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
  `no` before the go-live gate (owner gate #3, `AGENTS.md` §4);
- carry the flag into the design contract so the name is replaced before launch. The requirement is
  anchored in `AGENTS.md` §11.3 ("No placeholders left in a live artifact") and in
  `references/state-layout.md`, whose manifest rule is that `placeholder name in use` must be `no`
  before the go-live gate. A live site must never ship the placeholder.

## 6. What to record before leaving intake

- `decisions.log`: an `intake` line — registration, the accounts state, and the sandbox decision
  (taken / declined / not offered). The verbatim answers are the design contract input and are
  recorded alongside, or referenced from, the `design-contract` line written in Stage 2.
- The **language mode** and the **focus/comprehensive answer** are recorded with the answers, and
  any collection question skipped under the §2 triage rule is named in the record.
- The record carries the **rounds**: which frontier each round asked, what settled it, and every
  question skipped and why. A question the owner declined to answer is recorded as declined — never
  silently dropped, never filled in by a recommendation (§1). A question the frontier **minted** is
  recorded the same way, with its number and the answer that opened it (§1).
- The **group-7 answers land where their stage reads them**: Q30 in the registry and manifest
  `domain`, Q32 in `Stack decisions` and the `SI features` account row, Q29 in the manifest's
  `never published` line (`references/state-layout.md`), Q28 alongside each testimonial's consent,
  and Q26, Q27 and Q31 in the answers record as the working plan. The verbatim answers stay the
  source for all of them.
- `manifest.md`: the identity block (name as it appears, role/one-liner, primary audience, voice,
  placeholder flag, the `never published` boundary), the stack decisions, the accounts table, the
  URLs, and open items.
- **No secrets.** Accounts and statuses only — never keys, tokens or passwords
  (`references/state-layout.md`).
- **Accounts and spend are owner gate #2.** Ask before creating anything; never invent credentials
  (`AGENTS.md` §4, §11). Harness-specific install notes belong in `references/harness.md`.

## 7. Setting up the accounts — what each one is for

§6 records the account **state**; this section is the **procedure** behind it. Account creation and
any spend are **owner gate #2** — ask before creating anything, one account (or one step) at a time,
and never invent credentials (`AGENTS.md` §4, §11; §6 above). No new gate is introduced here. One
account per sub-block: say what it is for in the owner's words, then keep the facts straight. If a
detail below is not stated, **confirm it at setup with the owner** — do not guess a key format,
scope or version.

### 7.1 GitHub — the home for the site's source

> "This is where your site's source code lives. It also runs the checks and publishes the site when
> we are ready."

Facts:

- What it is for: the code repository plus the build / validate / deploy automation (CI/CD). Free.
- Sign up with email, password and username, verify the confirmation email, and **enable 2FA** —
  mandatory for this project's security bar.
- Create the project repository. It may be **Public or Private**; add `.gitignore: Node` and a
  license.
- CI secrets live under **Settings → Secrets and variables → Actions**, with Environments `staging`
  and `production` — the credential procedure is in `references/deploy.md`.

### 7.2 Cloudflare — hosting, the human check, and DNS

> "This is the service that puts your site online, adds the 'prove you are human' check before
> downloads, and manages your domain's routing."

Facts:

- What it is for: hosting (**Workers**), **Turnstile** (the bot gate for the CV download), and DNS.
  Free tier.
- Sign up at `dash.cloudflare.com`, verify the email, choose the **Free** plan.
- **Turnstile** (dashboard → Turnstile → Add site):
  - Widget name: e.g. `portfolio-cv`.
  - **Hostname**: your domain — or `*` while developing.
  - **Widget mode: Managed**.
  - It issues two keys. The **Site key** is public — it goes in the browser (`VITE_TURNSTILE_SITE_KEY`,
    a `VITE_` build-time variable). The **Secret key** is private — server-side only, set as a
    Supabase secret. **Never swap them**, and the secret must never reach the browser.
- **Workers**: create a Worker (name e.g. `my-portfolio`). Deploying happens later from CI — this
  step only **reserves the name**.
- **Custom domain** (after the first deploy): Worker → Settings → Domains & Routes → Add → Custom
  domain; add the apex and `www`. Cloudflare provisions DNS automatically when the domain is on
  Cloudflare DNS (§7.5).
- CI credentials: the Cloudflare API token scopes are `Account > Workers Scripts > Edit` and
  `Zone > Workers Routes > Edit`; they are stored as the GitHub secret `CLOUDFLARE_API_TOKEN`, with
  the account id in the GitHub variable `CLOUDFLARE_ACCOUNT_ID`. The full CI credential set is in
  `references/deploy.md`.

### 7.3 Supabase — the site's database, sign-in and server functions

> "This is where your content is stored and where the site checks who is allowed to see or change
> it."

Facts:

- What it is for: Postgres + RLS, Auth, Storage and Edge Functions. Free tier.
- Create an **organization**, then a **New project**: project name, **Database password** (save it
  in a password manager), the region nearest the audience, Free tier. The database password is set
  at project creation and is what `supabase link` needs if it prompts (via `SUPABASE_DB_PASSWORD`).
- The Project URL is `https://<project-ref>.supabase.co`. The `<project-ref>` is a **22-character
  string** and is the value `supabase link --project-ref ...` needs.
- **API keys** (Project Settings → API):
  - **Publishable key** (`sb_publishable_...`) — public, safe in the browser (build variable
    `VITE_SUPABASE_PUBLISHABLE_KEY`).
  - **Service role key** (`sb_secret_...`) — private, server-side only (set as a Supabase secret).
- Keep the project on the **free tier** — this build deliberately uses no paid features.
- **Where secrets live:** server storage only — **Supabase secrets** (for the edge functions) and
  **Wrangler secrets** (for the Cloudflare Worker). Secrets never go in `.env.local`, which holds
  **PUBLIC build-time variables only** and is gitignored; no secret may appear in the browser
  bundle. The security rules are in `references/secure.md`.

### 7.4 The SI provider key — server-side only

> "The SI that answers visitors about you needs a key. It stays on the server, so nobody can read it
> from the page."

Facts:

- Create the SI provider account and API key. The reference provider is **DeepSeek**
  (`platform.deepseek.com`); the provider is the owner's choice, and a different one is recorded as a
  decision. The key is shown **only once**, starts with `sk-...`, and must be saved somewhere safe.
  Treat it as a secret: never commit it, never paste it into public chats.
- The site's SI features (chat, JD analysis) run from **Supabase edge functions** and consume the key
  as a **server-side secret** named `deepseek`. Set the server secrets once with:

```sh
supabase secrets set TURNSTILE_SECRET=<cloudflare-turnstile-secret> \
  SUPABASE_SERVICE_ROLE_KEY=<sb_secret_...> \
  deepseek=<sk-...>
```

- It must never reach the browser: the built bundle must not contain `sk-` (DeepSeek),
  `sb_secret_` (service role) or `0x3…` (Turnstile secret).

### 7.5 Domain — your own web address (optional, recommended)

> "Your own web address, like yourname.com. This is the one that costs money, so we only do it if you
> want it."

Facts:

- Optional but recommended; roughly **$10/year**. This costs money, so it is **owner gate #2** — ask
  first.
- Easiest: buy it in Cloudflare (dashboard → Domain Registration → search → register). It lands on
  Cloudflare DNS automatically, so Worker custom domains and Turnstile just work.
- Or buy it anywhere (Namecheap, GoDaddy, …), then in Cloudflare **Add a site** → Free plan → change
  the **nameservers** at the registrar to the two Cloudflare nameservers shown → wait for
  propagation (minutes to hours).
- Point both the apex and `www` at the Worker (§7.2).

## Source map

| Section here | Old-kit section |
|---|---|
| §1 How to ask | `SKILL_INTERACTIVE_PORTFOLIO.md` — "Design questionnaire (run BEFORE layout)" intro ("Ask user ALL questions (adapt language; note answers verbatim — they are the design contract)" plus the round-over-a-design-tree scheme and a frontier that mints questions); `GUIDE_FOR_HUMANS.md` — "Step 6 — Phase A: the design questionnaire" |
| §2 The question set (Q1–Q32, groups 1–7) | `SKILL_INTERACTIVE_PORTFOLIO.md` — "Design questionnaire (run BEFORE layout)", groups 1–6 and questions 1–25, substance preserved, plus group 7 (Q26–Q32) |
| §2 Q1 placeholder sentence | `SKILL_INTERACTIVE_PORTFOLIO.md` — "Design questionnaire" Q1 placeholder paragraph |
| §3.1 From answers to design contract | `SKILL_INTERACTIVE_PORTFOLIO.md` — "Design questionnaire" derive paragraph (design tokens, type scale, spacing rhythm, layout concept, responsive + accessibility) |
| §3.3 Owner cannot answer Q5 | `SKILL_INTERACTIVE_PORTFOLIO.md` — "If the user cannot answer #5, re-derive it from answers #6–#19 and present the sketch — approval is still required" |
| §4 The local, no-account sandbox | `SKILL_INTERACTIVE_PORTFOLIO.md` — "Optional — a local, no-account sandbox first (before you commit)" (including its "Boundaries" list); "When to use" sandbox offer; `GUIDE_FOR_HUMANS.md` — the "Optional — no accounts yet?" note before Step 1 |
| §5 Placeholder rule | `SKILL_INTERACTIVE_PORTFOLIO.md` — Q1 placeholder paragraph; `GUIDE_FOR_HUMANS.md` — "Step 6 — Phase A: the design questionnaire" placeholder note |
| §6 What to record | `SKILL_INTERACTIVE_PORTFOLIO.md` — "note answers verbatim — they are the design contract"; Non-negotiables 1 and 3; `GUIDE_FOR_HUMANS.md` — "Step 2 — Create the remaining accounts" (account state, no secrets) |
| §7 Setting up the accounts (intro / gate) | `GUIDE_FOR_HUMANS.md` — "Step 2 — Create the remaining accounts" (the cost table); `SKILL_INTERACTIVE_PORTFOLIO.md` — "Phase 0 — Prerequisites" (account list, missing? walk user through); `AGENTS.md` §4 (owner gate #2) |
| §7.1 GitHub | `GUIDE_FOR_HUMANS.md` — "Step 2 → 2.1 GitHub" (signup, 2FA, repo public/private, `.gitignore: Node`, license; Step 12 CI secrets + Environments) |
| §7.2 Cloudflare | `GUIDE_FOR_HUMANS.md` — "Step 2 → 2.2 Cloudflare (account + Turnstile + Workers + DNS)" (Free plan; Turnstile widget name / hostname / mode **Managed** / site key vs secret; Worker name reservation; custom domain; API token scopes and GitHub secret/variable names); "Step 4.2" (`VITE_TURNSTILE_SITE_KEY`); "Step 11" (Turnstile secret as a Supabase secret) |
| §7.3 Supabase | `GUIDE_FOR_HUMANS.md` — "Step 2 → 2.3 Supabase" (organization, New project, database password, Project URL, 22-char project-ref, `sb_publishable_...` / `sb_secret_...`, free tier); "Step 8" (`supabase link --project-ref`); "Step 4.2" (`.env.local` PUBLIC only; secrets never there); "Step 11" (Supabase secrets); `SKILL_INTERACTIVE_PORTFOLIO.md` — "Phase 0 — Prerequisites" (`SUPABASE_DB_PASSWORD`) |
| §7.4 The SI provider key | `GUIDE_FOR_HUMANS.md` — "Step 1.1 Create the DeepSeek account and API key" (`sk-...`, shown once, treat as a secret); "Step 11" (server secret named `deepseek`; no `sk-` / `sb_secret_` / `0x3…` in the browser bundle) |
| §7.5 Domain | `GUIDE_FOR_HUMANS.md` — "Step 2 → 2.4 Domain (optional but recommended)" (Cloudflare registration, or registrar + Cloudflare `Add a site` + nameservers + propagation); Step 2 cost table (~$10/yr) |
