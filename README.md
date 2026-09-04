# Portfolio — Build Kit from Scratch

*Vibe coded instruction for vibe coders by Piotr Żabrowski :-)*

Everything you need to build an interactive portfolio/CV site like
zabrowski.pl, **with AI support at every step** (DeepSeek via DSH).

## Files in this kit

| File | What it is | When you need it |
|---|---|---|
| `GUIDE_FROM_SCRATCH.md` | **Start here.** Step-by-step walkthrough: install DSH + DeepSeek key first, then accounts, tools, and the AI-driven build phase by phase — with copy-paste blocks and check gates | Read it top to bottom once, then follow Step by Step |
| `SKILL_INTERACTIVE_PORTFOLIO.md` | The build skill the AI executes (also embedded as Appendix A in the guide) | Step 5 (load it into DSH) |
| `DATABASE_SCHEMA.md` | Complete database reference: every table, column, view, RPC, policy, grant, storage rule, seed | Step 8 (the AI applies it; you do not need to read it) |
| `GUIDE_FROM_SCRATCH.pdf` | PDF render of the guide | Offline reading |
| `sanitize-id.lua` | Pandoc filter used to regenerate the PDF | Regenerating the PDF |

## Quick start

1. Follow **Step 1** of the guide: install Node, start DSH
   (`npx @deepseek-ai/dsh web`), add your DeepSeek key
   (platform.deepseek.com → API Keys), verify with the test prompt.
   **Recommended:** use a high-capability model with maximum reasoning
   effort (e.g. `DeepSeek-v4-Pro`, high effort) — the build produces
   security-sensitive code.
2. Steps 2–4: create accounts (GitHub, Cloudflare, Supabase, domain),
   install tools (Bun, git, Supabase CLI), clone your repo.
3. Step 5: paste the skill text (Appendix A of the guide, or
   `SKILL_INTERACTIVE_PORTFOLIO.md`) into DSH and answer the design
   questionnaire.
4. Steps 6–13: the AI builds phase by phase; you verify each gate and
   approve the design.
5. Step 14: launch checklist, costs, troubleshooting.

> **Important — verify everything yourself.** The AI generates the code and
> reports success, but its claims are unverified. Every `[Check]` gate in
> the guide is YOUR check — from the very first step (accounts, keys,
> tools, the AI connection) to the final RLS audit. Nothing in this kit
> replaces your own verification.

**Cost:** ~$1–3 of DeepSeek tokens for the whole build + ~$10/yr domain
(optional). **Time:** one focused day.
