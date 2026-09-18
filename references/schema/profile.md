# Schema — Profile domain

> **Holds:** the profile-domain base tables defined in the source §2.1 — `candidate_profile`,
> `experiences`, `skills`, `gaps_weaknesses`, `values_culture`, `faq_responses`, `ai_instructions`,
> `recommendations` — plus the §2.1 population note.
> **Loaded at:** Build — data layer (profile tables). The homepage, AI chat, JD analysis and CV
> generation read these tables at runtime.
> **Source:** `DATABASE_SCHEMA.md` §2.1, verbatim — the schema is unchanged.
> **Cross-references:** §6 ContentDoc shape → `content.md`; views/RPCs/policies for these tables →
> `access.md`; the §2.1 note says these tables are not seeded — seed/migration notes → `seeds.md`;
> §12 audit → `audit.md`.

---

### 2.1 Profile domain

> **Population:** the profile tables are NOT seeded by migrations in the
> reference — enter them through the admin panel (or a one-off seed
> migration): the singleton `candidate_profile` row, `experiences`,
> `skills`, `gaps_weaknesses`, `recommendations`, the private AI-context
> tables (`values_culture`, `faq_responses`, `ai_instructions`) and the
> `cv_settings` singleton. The homepage, AI chat/JD analysis and CV
> generation all read from these — nothing renders until they hold data.

#### `public.candidate_profile` — single-row persona profile

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | default `gen_random_uuid()` |
| `created_at`, `updated_at` | timestamptz NOT NULL | default `now()` |
| `name` | text NOT NULL | |
| `email` | text | admin-visible only (never in views) |
| `phone` | text | admin-visible only (never in views) |
| `title` | text | headline / role |
| `target_titles` | text[] | default `'{}'` |
| `target_company_stages` | text[] | default `'{}'` (e.g. seed, growth, enterprise) |
| `elevator_pitch` | text | |
| `career_narrative` | text | |
| `looking_for` | text | |
| `not_looking_for` | text | |
| `management_style` | text | |
| `work_style` | text | |
| `salary_min`, `salary_max` | integer | |
| `availability_status` | text | |
| `availability_date` | date | |
| `location` | text | |
| `remote_preference` | text | |
| `github_url`, `linkedin_url`, `twitter_url` | text | `linkedin_url` is the only URL projected publicly |

#### `public.experiences` — work history

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `candidate_id` | uuid NOT NULL | FK → `candidate_profile(id)` ON DELETE CASCADE |
| `created_at` | timestamptz NOT NULL | |
| `company_name` | text NOT NULL | |
| `title` | text NOT NULL | |
| `title_progression` | text | |
| `start_date`, `end_date` | date | |
| `is_current` | boolean NOT NULL | default `false` |
| `bullet_points` | text[] | default `'{}'` |
| `why_joined`, `why_left` | text | private (never public) |
| `actual_contributions` | text | private |
| `proudest_achievement` | text | private |
| `would_do_differently` | text | private |
| `challenges_faced`, `lessons_learned` | text | private |
| `manager_would_say`, `reports_would_say` | text | private |
| `quantified_impact` | jsonb | default `'{}'` |
| `display_order` | integer NOT NULL | default `0` |

Indexes: `experiences_candidate_id_idx (candidate_id)`;
`experiences_public_start_idx (start_date desc nulls last)`.

#### `public.skills` — skills matrix (strong / moderate / gap)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `candidate_id` | uuid NOT NULL | FK → `candidate_profile(id)` ON DELETE CASCADE |
| `created_at` | timestamptz NOT NULL | |
| `skill_name` | text NOT NULL | |
| `category` | text NOT NULL | CHECK `in ('strong','moderate','gap')` |
| `self_rating` | integer | CHECK between 1 and 5 |
| `evidence` | text | private |
| `honest_notes` | text | private |
| `years_experience` | integer | |
| `last_used` | date | |

Indexes: `skills_candidate_id_idx (candidate_id)`;
`skills_public_category_idx (category, skill_name)`.

#### `public.gaps_weaknesses` — honest gap framing

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `candidate_id` | uuid NOT NULL | FK → `candidate_profile(id)` ON DELETE CASCADE |
| `created_at` | timestamptz NOT NULL | |
| `gap_type` | text NOT NULL | CHECK `in ('skill','experience','environment','role_type')` |
| `description` | text NOT NULL | |
| `why_its_a_gap` | text | private |
| `interest_in_learning` | boolean NOT NULL | default `false` |

Index: `gaps_weaknesses_candidate_id_idx (candidate_id)`.

#### `public.values_culture` — what matters at work (AI context, private)

`id`, `candidate_id` (FK, cascade), `created_at`, `must_haves`,
`dealbreakers`, `management_style_preferences`, `team_size_preferences`,
`how_handle_conflict`, `how_handle_ambiguity`, `how_handle_failure` — all
text. Index: `values_culture_candidate_id_idx (candidate_id)`.
**Never exposed publicly** (no `*_public` view; feeds the AI chat context).

#### `public.faq_responses` — FAQ for the AI chat (private)

`id`, `candidate_id` (FK, cascade), `created_at`, `question` (text NOT NULL),
`answer` (text NOT NULL), `is_common_question` (boolean default `false`),
`labels` (text[] default `'{}'`). Index: `faq_responses_candidate_id_idx
(candidate_id)`. Not exposed publicly.

#### `public.ai_instructions` — honesty/tone/boundaries rules for the AI (private)

`id`, `candidate_id` (FK, cascade), `created_at`, `instruction_type` (text
NOT NULL, CHECK `in ('honesty','tone','boundaries')`), `instruction` (text
NOT NULL), `priority` (integer default `0`). Index:
`ai_instructions_candidate_id_idx (candidate_id)`. Not exposed publicly.

#### `public.recommendations` — testimonials

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `candidate_id` | uuid NOT NULL | FK → `candidate_profile(id)` ON DELETE CASCADE |
| `recommender_name` | text NOT NULL | |
| `recommender_title` | text NOT NULL | |
| `recommender_company` | text NOT NULL | |
| `recommendation_text` | text NOT NULL | original (reference: Polish) |
| `recommendation_text_en` | text | English translation, written by the `translate-recommendation` edge function; view serves `COALESCE(en, original)` |
| `tags` | text[] | default `'{}'` |
| `is_public` | boolean NOT NULL | default `true` |
| `display_order` | integer NOT NULL | default `0` |
| `created_at` | timestamptz NOT NULL | |

Indexes: `recommendations_candidate_id_idx (candidate_id)`;
`recommendations_public_order_idx (display_order) WHERE is_public = true`.
