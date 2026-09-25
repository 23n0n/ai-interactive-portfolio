# Schema — Content / knowledge-base domain

> **Holds:** the content-domain base tables defined in the source §2.2 — `content_collections`,
> `content_docs`, `site_content`, `site_sections`, `fun_links`, `holiday_banners` — and the
> ContentDoc JSONB shape (source §6).
> **Loaded at:** Build — data layer (content model); content authoring / Distribute for the shape in
> §6.
> **Source:** `DATABASE_SCHEMA.md` §2.2 and §6, verbatim, with one declared exception: the
> `site_sections` and `holiday_banners` seed **values** are relocated to [`seeds.md`](seeds.md)
> (declared relocations R1/R2 — see `README.md`). The source's own seed pointer lines
> (`… Seed rows (adapt wording):` / `… Seed rows`) are reproduced here byte-for-byte; only the
> value lines that followed them moved. No SQL is changed.
> **Cross-references:** §2.1 → `profile.md`; §2.3 → `ai-ops.md`; §6 → §6 below; views/RPCs/policies
> for these tables → `access.md`; seed values → `seeds.md`; §12 audit → `audit.md`.

---

### 2.2 Content / knowledge-base domain

#### `public.content_collections` — hub containers

| Column | Type | Notes |
|---|---|---|
| `key` | text PK | e.g. `services`, `expertise`, `articles`, `experience`, `certifications`, `technologies`, `speaking`, `glossary`, `resources` |
| `base` | text NOT NULL | URL path segment (equals `key` in the reference) |
| `sort_order` | integer NOT NULL | default `0` |
| `publish_status` | text NOT NULL | default `'published'` (`draft`/`published`) |
| `hub` | jsonb NOT NULL | default `'{}'`; keys: `h1`, `description` |
| `created_at`, `updated_at` | timestamptz NOT NULL | |

Partial index: `content_collections_public_order_idx (sort_order) WHERE
publish_status = 'published'`. Trigger: `set_updated_at`.

#### `public.content_docs` — knowledge-base documents

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `collection_key` | text NOT NULL | FK → `content_collections(key)` ON DELETE CASCADE |
| `slug` | text NOT NULL | unique per collection: `UNIQUE (collection_key, slug)` |
| `sort_order` | integer NOT NULL | default `0` |
| `publish_status` | text NOT NULL | default `'published'` |
| `doc` | jsonb NOT NULL | default `'{}'`; the whole document — see ContentDoc shape (§6) |
| `created_at`, `updated_at` | timestamptz NOT NULL | |

Indexes: `content_docs_collection_idx (collection_key, sort_order)`;
`content_docs_public_collection_order_idx (collection_key, sort_order) WHERE
publish_status = 'published'`;
`content_docs_public_route_idx (collection_key, slug) WHERE publish_status =
'published'`; `content_docs_public_related_idx gin ((doc -> 'related')) WHERE
publish_status = 'published'`; `content_docs_public_tags_idx gin ((doc ->
'tags')) WHERE publish_status = 'published'`. Trigger: `set_updated_at`.

#### `public.site_content` — editable UI text values

| Column | Type | Notes |
|---|---|---|
| `key` | text PK | e.g. `spotlight.name`, `disclaimer.text`, `footer.contact` |
| `group_name` | text NOT NULL | default `'general'` |
| `label` | text NOT NULL | default `''` (admin UI label) |
| `notes` | text | |
| `value` | text NOT NULL | default `''` |
| `publish_status` | text NOT NULL | default `'published'` |
| `sort_order` | integer NOT NULL | default `0` |
| `created_at`, `updated_at` | timestamptz NOT NULL | |

Partial index: `site_content_public_order_idx (sort_order) WHERE publish_status =
'published'`. Trigger: `set_updated_at`.

#### `public.site_sections` — homepage section registry

`id` (uuid PK), `section_key` (text NOT NULL UNIQUE), `label` (text NOT
NULL), `description` (text default `''`), `is_visible` (boolean default
`true`), `display_order` (integer default `0`), `created_at`, `updated_at`.
Partial index: `site_sections_visible_order_idx (display_order) WHERE
is_visible = true`. Trigger: `set_updated_at`. Seed rows (adapt wording):

> Seed values relocated verbatim to [`seeds.md`](seeds.md) — declared relocation **R1**
> (source §2.2 lines 280–281). The pointer line above is the source's own, unchanged.

#### `public.fun_links` — just-for-fun links

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `href` | text NOT NULL | |
| `title` | text NOT NULL | |
| `description` | text NOT NULL | default `''` |
| `tag` | text NOT NULL | default `''` |
| `icon` | text NOT NULL | default `'terminal'` (icon key from the icon set) |
| `is_active` | boolean NOT NULL | default `true` |
| `display_order` | integer NOT NULL | default `0` |
| `created_at`, `updated_at` | timestamptz NOT NULL | |

Partial index: `fun_links_active_order_idx (display_order) WHERE is_active =
true`. Trigger: `set_updated_at`.

#### `public.holiday_banners` — recurring seasonal banners

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `banner_key` | text NOT NULL UNIQUE | e.g. `newyear`, `christmas`, `sysadmin-day` |
| `emoji` | text NOT NULL | default `'🎉'` |
| `message` | text NOT NULL | |
| `gradient_from`, `gradient_via`, `gradient_to` | text NOT NULL | HSL triplets, default `'210 60% 30%'` / `'225 50% 35%'` / `'240 60% 30%'` |
| `particles` | text[] NOT NULL | default `ARRAY['✨','🎉','⭐']` |
| `dismiss_animation` | text NOT NULL | default `'burst'` (`burst`/`fade`/`confetti`) |
| `start_date`, `end_date` | date NOT NULL | active window |
| `is_active` | boolean NOT NULL | default `true` |
| `display_order` | integer NOT NULL | default `0` |
| `created_at`, `updated_at` | timestamptz NOT NULL | |

Partial index: `holiday_banners_active_window_idx (start_date, end_date,
display_order) WHERE is_active = true`. Trigger: `set_updated_at`. Seed rows

> Seed values relocated verbatim to [`seeds.md`](seeds.md) — declared relocation **R2**
> (source §2.2 lines 318–320). The pointer line above is the source's own, unchanged.

---

## 6. ContentDoc JSONB shape (`content_docs.doc`)

```jsonc
{
  "h1": "Document title",          // rendered <h1>, required
  "label": "Short nav label",      // fallback: h1
  "description": "SEO/related-link blurb",
  "intro": "Lead paragraph",
  "tags": ["tag-a", "tag-b"],      // used for related-link tag matching
  "related": ["collection/slug", "other/collection/slug"], // direct refs
  "faqs": [{ "q": "...", "a": "..." }],
  "blocks": [
    { "type": "p", "text": "..." },
    { "type": "h2", "text": "..." },
    { "type": "h3", "text": "..." },
    { "type": "list", "ordered": false, "items": ["...", "..."] },
    { "type": "steps", "items": [{ "title": "Step title", "text": "Step text" }] },
    { "type": "table", "caption": "...", "headers": ["..."], "rows": [["..."]] },
    { "type": "checklist", "title": "...", "items": ["...", "..."] },
    { "type": "callout", "title": "...", "text": "..." },
    { "type": "diagram", "diagram": "<diagram-key>", "caption": "..." },
    { "type": "rich", "html": "<p>sanitized allow-list HTML</p>" }
  ]
}
```

`rich` HTML is sanitized server-side (parse5 allow-list: `img` with an
**https** source only — no `http:`, no `data:` URIs, no SVG — restricted to the
hosts in the CSP `img-src` allowlist; self-hosted `kb-images` objects are the
default, third-party origins are the exception) at read time. An approved external image is
downloaded, validated and stored in `kb-images` before it is referenced; the site serves images
from controlled storage, so an approved third-party host is an exception that is mirrored, not
hot-linked. The admin TipTap editor produces
`blocks`; the AI generation functions produce the same shape.
