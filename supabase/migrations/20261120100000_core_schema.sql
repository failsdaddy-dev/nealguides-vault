-- Neal Guides Vault: core schema (tables, types, indexes).
-- Access rules live in 20261120100100_access_rules.sql.
--
-- Same design as RohTre Vault's final schema, consolidated into one clean
-- set for a fresh project (no 2FA history, no forced password change),
-- with these Neal Guides changes:
--   * section kinds: gameplay | effect | music | background
--   * subsections (e.g. FC Gameplay Clips > Shorts); a card may sit in one
--   * still-image previews (preview_image) next to clips and music previews
--   * download links accept any https host; a host badge is computed
--     (google-drive | mega | dropbox | wetransfer | other)
--   * new editors see every published card by default (all_access = true)
--   * Cloudinary folder prefix nealguides-vault/

create extension if not exists pg_trgm with schema extensions;

-- Helpers that RLS calls run as SECURITY DEFINER, so they live outside the
-- exposed API schemas.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create type public.user_role    as enum ('admin', 'editor');
create type public.card_status  as enum ('draft', 'published');
create type public.section_kind as enum ('gameplay', 'effect', 'music', 'background');
create type public.link_kind    as enum ('project', 'download');
-- youtube: preview clip on the card, optional full YouTube video on click
-- audio:   music preview in the audio player
-- image:   still image preview
create type public.media_type   as enum ('youtube', 'audio', 'image');

-- ---------------------------------------------------------------- profiles
-- One row per login. Created by trigger when the admin creates an auth user.
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text not null,
  display_name text not null default '' check (length(display_name) <= 80),
  role         public.user_role not null default 'editor',
  is_active    boolean not null default true,
  all_access   boolean not null default true,   -- decision 14: editors see all published cards
  expires_at   timestamptz,                     -- optional auto-disable date
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------- sections
create table public.sections (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 60),
  name       text not null check (length(name) between 1 and 60),
  kind       public.section_kind not null,
  sort_order int not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------- subsections
create table public.subsections (
  id         uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.sections (id) on delete cascade,
  slug       text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 60),
  name       text not null check (length(name) between 1 and 60),
  sort_order int not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  unique (section_id, slug),
  unique (id, section_id)              -- target for the cards composite key below
);
create index subsections_section_idx on public.subsections (section_id, sort_order);

-- ---------------------------------------------------------------- filters (tags)
create table public.filter_groups (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 60),
  name       text not null check (length(name) between 1 and 60),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Filter slugs are globally unique so URLs stay short: ?f=fc-26,goals
create table public.filters (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.filter_groups (id) on delete restrict,
  slug       text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 80),
  name       text not null check (length(name) between 1 and 80),
  is_quick   boolean not null default false,  -- shown in the chip row
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index filters_group_order_idx on public.filters (group_id, sort_order, name);
create index filters_name_trgm_idx   on public.filters using gin (name extensions.gin_trgm_ops);

-- ---------------------------------------------------------------- cards
create table public.cards (
  id                uuid primary key default gen_random_uuid(),
  section_id        uuid not null references public.sections (id) on delete restrict,
  subsection_id     uuid,                                     -- optional; must be in the same section
  slug              text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 120),
  title             text not null check (length(title) between 1 and 200),
  description       text not null default '' check (length(description) <= 5000),
  youtube_id        text check (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  preview_start     int not null default 0 check (preview_start >= 0),
  preview_end       int check (preview_end is null or preview_end > preview_start),
  loom_url          text check (loom_url ~ '^https://(www\.)?loom\.com/' and length(loom_url) <= 500),
  source_url        text check (source_url ~ '^https://[^/?#@[:space:]]+(/[^[:space:]]*)?$' and length(source_url) <= 2000),
  status            public.card_status not null default 'draft',
  sort_order        int not null default 0,                   -- admin's manual order
  media_type        public.media_type not null default 'youtube',
  preview_clip      jsonb,
  audio_preview     jsonb,
  preview_image     jsonb,
  -- Set by triggers from card_links so the UI can grey out buttons and show
  -- host badges without ever receiving the links themselves.
  has_project_files boolean not null default false,
  has_downloads     boolean not null default false,
  link_hosts        text[] not null default '{}',
  filter_text       text not null default '',                 -- tag names, kept by trigger, for search
  search_tsv        tsvector generated always as (
                      setweight(to_tsvector('simple'::regconfig, title), 'A') ||
                      setweight(to_tsvector('simple'::regconfig, filter_text), 'B') ||
                      setweight(to_tsvector('simple'::regconfig, description), 'C')
                    ) stored,
  published_at      timestamptz,
  created_by        uuid references auth.users (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (section_id, slug),
  -- A card's subsection must belong to the card's section. Deleting the
  -- subsection moves its cards back to the section root.
  foreign key (subsection_id, section_id)
    references public.subsections (id, section_id) on delete set null (subsection_id),

  -- Preview limits hold even if the admin form is bypassed.
  constraint cards_preview_clip_ok check (
    preview_clip is null or (
      jsonb_typeof(preview_clip) = 'object'
      and preview_clip ->> 'url' ~ '^https://res\.cloudinary\.com/[A-Za-z0-9_-]+/video/upload/'
      and preview_clip ->> 'public_id' ~ '^nealguides-vault/previews/[A-Za-z0-9_./-]+$'
      and (preview_clip ->> 'bytes')::numeric between 1 and 2 * 1024 * 1024
      and (preview_clip ->> 'duration')::numeric between 0.1 and 10.5
    )),
  constraint cards_audio_preview_ok check (
    audio_preview is null or (
      jsonb_typeof(audio_preview) = 'object'
      and audio_preview ->> 'url' ~ '^https://res\.cloudinary\.com/[A-Za-z0-9_-]+/video/upload/'
      and audio_preview ->> 'public_id' ~ '^nealguides-vault/music/[A-Za-z0-9_./-]+$'
      and audio_preview ->> 'format' = 'mp3'
      and (audio_preview ->> 'bytes')::numeric between 1 and 1024 * 1024
      and (audio_preview ->> 'duration')::numeric between 0.1 and 30.5
      and (audio_preview -> 'peaks' is null or (jsonb_typeof(audio_preview -> 'peaks') = 'array'
                                               and jsonb_array_length(audio_preview -> 'peaks') <= 400))
    )),
  constraint cards_preview_image_ok check (
    preview_image is null or (
      jsonb_typeof(preview_image) = 'object'
      and preview_image ->> 'url' ~ '^https://res\.cloudinary\.com/[A-Za-z0-9_-]+/image/upload/'
      and preview_image ->> 'public_id' ~ '^nealguides-vault/images/[A-Za-z0-9_./-]+$'
      and preview_image ->> 'format' in ('jpg', 'png', 'webp')
      and (preview_image ->> 'bytes')::numeric between 1 and 1024 * 1024
    ))
);
create index cards_newest_idx      on public.cards (section_id, status, published_at desc, id desc);
create index cards_manual_idx      on public.cards (section_id, status, sort_order, id);
create index cards_subsection_idx  on public.cards (subsection_id) where subsection_id is not null;
create index cards_search_idx      on public.cards using gin (search_tsv);
create index cards_title_trgm_idx  on public.cards using gin (title extensions.gin_trgm_ops);

create table public.card_filters (
  card_id   uuid not null references public.cards (id) on delete cascade,
  filter_id uuid not null references public.filters (id) on delete cascade,
  primary key (card_id, filter_id)
);
create index card_filters_filter_idx on public.card_filters (filter_id, card_id);

-- ----------------------------------------------------------- card links
-- The real files: any https host (Google Drive, Mega, Dropbox, WeTransfer, ...).
-- The url column is never granted to browser roles; see access rules.
-- host / host_name are filled by trigger from the url and are readable.
create table public.card_links (
  id         uuid primary key default gen_random_uuid(),
  card_id    uuid not null references public.cards (id) on delete cascade,
  kind       public.link_kind not null,
  label      text not null check (length(label) between 1 and 60),   -- "1080p", "4K", "Premiere Pro"
  url        text not null check (
               length(url) <= 2000
               and url ~ '^https://[^/?#@[:space:]]+(/[^[:space:]]*)?$'  -- https, a host, no user:pass@
             ),
  host       text not null default 'other'
               check (host in ('google-drive', 'mega', 'dropbox', 'wetransfer', 'other')),
  host_name  text not null default '' check (length(host_name) <= 253),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index card_links_card_idx on public.card_links (card_id, kind, sort_order);

-- ---------------------------------------------------------------- access
-- Restricted editors (all_access = false) see a card when it carries at
-- least one of these tags.
create table public.user_filter_access (
  user_id   uuid not null references public.profiles (id) on delete cascade,
  filter_id uuid not null references public.filters (id) on delete cascade,
  primary key (user_id, filter_id)
);
create index user_filter_access_filter_idx on public.user_filter_access (filter_id);

-- ---------------------------------------------------------------- audit
create table public.audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid references auth.users (id) on delete set null,
  actor_email text,
  action      text not null,       -- login | open_link | open_link_denied | admin_*
  card_id     uuid references public.cards (id) on delete set null,
  link_id     uuid references public.card_links (id) on delete set null,
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log (created_at desc);
create index audit_log_card_idx    on public.audit_log (card_id, action);
create index audit_log_actor_idx   on public.audit_log (actor_id, created_at desc);
