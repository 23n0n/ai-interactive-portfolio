# Examples — a worked example site

This directory is one small, complete example of the two kinds of artifact an ai-distribution
site produces. It exists so you can see the **shapes** without reading the whole reference set.

**Everything here is fictional.** The owner "Nora Vance", the domain `nora-vance.example`, the
employers, the URLs and the image URL are invented for this example. The `.example` TLD is
reserved (RFC 2606) and can never resolve, so nothing here points at a real person's live site.

## What is here

```
examples/
  ad-home/                                     # on-disk state home (references/state-layout.md)
    state/sites.json                           # the durable registry: one row per site
    data/nora-vance/manifest.md                # identity, stack decisions, accounts, URLs
    data/nora-vance/decisions.log              # append-only why-choices (design contract)
    data/nora-vance/runs/run-20260918-03/report.md   # the per-change record (publish run)
  content/                                     # payloads the build reads
    profile.json                               # `public.candidate_profile_public` projection
    content-doc.json                           # a ContentDoc (content_docs.doc, schema §6)
    site-sections.json                         # homepage section order (the §2.2 seed order)
```

## How to read it

Start with `ad-home/state/sites.json` — the registry row. Then `ad-home/data/nora-vance/manifest.md`
for the settled facts. Then `ad-home/data/nora-vance/decisions.log`, which is the timeline: the
timestamps ascend, and the last line lands on the same instant as the registry's `updated` and the
run report's `finished`. Finish with the run report, which is the durable record of the publish.

`content/` is separate from the state home. It shows what a builder feeds the data layer:
`profile.json` mirrors the public profile view, `content-doc.json` is one knowledge-base document
(the `content_docs.doc` JSONB), and `site-sections.json` fixes the homepage section order.

## What this is NOT

- **Not a template to copy wholesale.** It is one filled-in instance. Copy the shapes, not the words
  or the persona.
- **Not a second implementation.** There is no application code here — no Worker, no SQL, no
  components, no config. Only state files and content payloads.
- **Not part of the instruction path.** `AGENTS.md` is the contract. This directory is illustration
  only; if it ever disagrees with `AGENTS.md`, `references/state-layout.md` or the schema
  references, those win.
- **Not a schema.** It adds, renames and removes nothing. Every key is taken from
  `references/state-layout.md` or the schema references (`DATABASE_SCHEMA.md` and its per-domain
  split).
- **Not real data, and never a secret store.** No key, token, password or connection string appears
  anywhere in `ad-home/` — only the fact that a secret exists and where it lives.
