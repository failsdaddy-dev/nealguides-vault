-- Neal Guides Vault: triggers and the functions the app calls.

-- =================================================================== triggers

-- New auth user -> profile. Role is always 'editor' here; user metadata is
-- user-editable, so it is never trusted for role or access.
create function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, coalesce(new.email, ''), left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 80));
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Every successful sign-in updates last_sign_in_at -> audit "login".
create function private.handle_user_login()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.last_sign_in_at is distinct from old.last_sign_in_at then
    insert into public.audit_log (actor_id, actor_email, action)
    values (new.id, new.email, 'login');
  end if;
  return new;
end;
$$;
create trigger on_auth_user_login
  after update of last_sign_in_at on auth.users
  for each row execute function private.handle_user_login();

create function private.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger profiles_touch before update on public.profiles
  for each row execute function private.touch_updated_at();
create trigger cards_touch before update on public.cards
  for each row execute function private.touch_updated_at();

create function private.cards_before_write()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, (select auth.uid()));
  end if;
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;
create trigger cards_before_write before insert or update on public.cards
  for each row execute function private.cards_before_write();

-- Host badge from the link's address (decision 22: any https host).
create function private.link_host(p_url text)
returns text language sql immutable set search_path = '' as $$
  select case
    when h ~ '(^|\.)(drive|docs)\.google\.com$'                  then 'google-drive'
    when h ~ '(^|\.)mega\.(nz|io)$'                              then 'mega'
    when h ~ '(^|\.)dropbox\.com$' or h = 'dl.dropboxusercontent.com' then 'dropbox'
    when h ~ '(^|\.)wetransfer\.com$' or h = 'we.tl'             then 'wetransfer'
    else 'other'
  end
  from (select lower(substring(p_url from '^https://([^/?#:@]+)')) as h) x;
$$;

create function private.card_links_before_write()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.url       := btrim(new.url);
  new.label     := btrim(new.label);
  new.host      := private.link_host(new.url);
  new.host_name := coalesce(lower(substring(new.url from '^https://([^/?#:@]+)')), '');
  return new;
end;
$$;
create trigger card_links_before_write before insert or update on public.card_links
  for each row execute function private.card_links_before_write();

-- Keep has_project_files / has_downloads / link_hosts in step with card_links.
create function private.refresh_card_link_flags(p_card uuid)
returns void language sql security definer set search_path = '' as $$
  update public.cards c set
    has_project_files = exists (select 1 from public.card_links l where l.card_id = p_card and l.kind = 'project'),
    has_downloads     = exists (select 1 from public.card_links l where l.card_id = p_card and l.kind = 'download'),
    link_hosts        = coalesce((select array_agg(distinct l.host order by l.host)
                                    from public.card_links l where l.card_id = p_card), '{}')
  where c.id = p_card;
$$;

create function private.sync_card_link_flags()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.refresh_card_link_flags(coalesce(new.card_id, old.card_id));
  if tg_op = 'UPDATE' and old.card_id is distinct from new.card_id then
    perform private.refresh_card_link_flags(old.card_id);
  end if;
  return null;
end;
$$;
create trigger card_links_sync_flags
  after insert or update or delete on public.card_links
  for each row execute function private.sync_card_link_flags();

-- Keep cards.filter_text (used by search) in step with the card's tags.
create function private.refresh_card_filter_text(p_card uuid)
returns void language sql security definer set search_path = '' as $$
  update public.cards c set filter_text = coalesce((
    select string_agg(f.name, ' ' order by f.name)
    from public.card_filters cf join public.filters f on f.id = cf.filter_id
    where cf.card_id = p_card), '')
  where c.id = p_card;
$$;

create function private.card_filters_changed()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.refresh_card_filter_text(coalesce(new.card_id, old.card_id));
  return null;
end;
$$;
create trigger card_filters_refresh_search
  after insert or delete on public.card_filters
  for each row execute function private.card_filters_changed();

create function private.filter_renamed()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.refresh_card_filter_text(cf.card_id)
  from public.card_filters cf where cf.filter_id = new.id;
  return null;
end;
$$;
create trigger filters_refresh_search
  after update of name on public.filters
  for each row execute function private.filter_renamed();

-- Admin content changes -> audit log (create, delete, publish/unpublish).
-- Skipped when there is no signed-in user (migrations, service tasks).
create function private.audit_admin_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_uid   uuid := (select auth.uid());
  v_row   jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_what  text;
begin
  if v_uid is null then
    return null;
  end if;
  if tg_op = 'UPDATE' then
    -- Only the cards trigger fires on UPDATE (of status).
    if (to_jsonb(old) ->> 'status') is not distinct from (v_row ->> 'status') then
      return null;
    end if;
    v_what := case when v_row ->> 'status' = 'published' then 'publish' else 'unpublish' end;
  else
    v_what := case tg_op when 'INSERT' then 'create' else 'delete' end;
  end if;
  insert into public.audit_log (actor_id, actor_email, action, details)
  select v_uid, p.email, 'admin_' || tg_table_name || '_' || v_what,
         jsonb_build_object('id', v_row ->> 'id',
                            'name', coalesce(v_row ->> 'title', v_row ->> 'name'),
                            'slug', v_row ->> 'slug')
    from public.profiles p where p.id = v_uid;
  return null;
end;
$$;
create trigger cards_audit         after insert or delete or update of status on public.cards
  for each row execute function private.audit_admin_change();
create trigger sections_audit      after insert or delete on public.sections
  for each row execute function private.audit_admin_change();
create trigger subsections_audit   after insert or delete on public.subsections
  for each row execute function private.audit_admin_change();
create trigger filter_groups_audit after insert or delete on public.filter_groups
  for each row execute function private.audit_admin_change();
create trigger filters_audit       after insert or delete on public.filters
  for each row execute function private.audit_admin_change();

-- ===================================================== browse (RLS applies)
-- One call powers the grid, search and infinite scroll.
--   Tags: OR inside a group, AND across groups.
--   An unknown or hidden tag slug returns nothing, so a scoped link can
--   never widen into content outside its scope.
--   p_sub: a subsection slug within p_section (unknown slug -> nothing).
--   Cursor: pass the last row's sort_ts / sort_num and id back as p_after_*.
create function public.browse_cards(
  p_section        text    default null,
  p_filters        text[]  default '{}',
  p_q              text    default null,
  p_sort           text    default 'newest',   -- newest | manual | relevance
  p_after_ts       timestamptz      default null,
  p_after_num      double precision default null,
  p_after_id       uuid    default null,
  p_limit          int     default 24,
  p_include_drafts boolean default false,      -- admin preview only; RLS still decides
  p_sub            text    default null
)
returns table (
  id uuid, section_slug text, subsection_slug text, slug text, title text, description text,
  youtube_id text, preview_start int, preview_end int, loom_url text, source_url text,
  has_project_files boolean, has_downloads boolean, link_hosts text[], status public.card_status,
  media_type public.media_type, preview_clip jsonb, audio_preview jsonb, preview_image jsonb,
  filter_slugs text[], sort_ts timestamptz, sort_num double precision
)
language plpgsql stable security invoker set search_path = '' as $$
#variable_conflict use_column
declare
  v_slugs  text[] := coalesce((select array_agg(distinct lower(btrim(s))) from unnest(p_filters) s
                               where btrim(coalesce(s, '')) <> ''), '{}');
  v_ids    uuid[];
  v_groups uuid[];
  v_found  int;
  v_sub    uuid;
  v_q      text := nullif(btrim(coalesce(p_q, '')), '');
  v_tsq    tsquery;
  v_limit  int := least(greatest(coalesce(p_limit, 24), 1), 60);
  v_sort   text := case
                     when p_sort = 'relevance' and nullif(btrim(coalesce(p_q, '')), '') is not null then 'relevance'
                     when p_sort = 'manual' then 'manual'
                     else 'newest' end;
begin
  if cardinality(v_slugs) > 0 then
    select array_agg(f.id), array_agg(distinct f.group_id), count(*)
      into v_ids, v_groups, v_found
      from public.filters f where f.slug = any (v_slugs);
    if v_found < cardinality(v_slugs) then
      return;
    end if;
  end if;

  if nullif(btrim(coalesce(p_sub, '')), '') is not null then
    select ss.id into v_sub
      from public.subsections ss
      join public.sections s on s.id = ss.section_id
     where ss.slug = lower(btrim(p_sub)) and (p_section is null or s.slug = p_section)
     limit 1;
    if v_sub is null then
      return;
    end if;
  end if;

  if v_q is not null then
    select to_tsquery('simple', string_agg(quote_literal(w) || ':*', ' & '))
      into v_tsq
      from regexp_split_to_table(
             lower(regexp_replace(left(v_q, 200), '[^[:alnum:][:space:]]+', ' ', 'g')),
             '[[:space:]]+') as w
     where w <> '';
  end if;

  return query
  select c.id, s.slug, ss.slug, c.slug, c.title, c.description,
         c.youtube_id, c.preview_start, c.preview_end, c.loom_url, c.source_url,
         c.has_project_files, c.has_downloads, c.link_hosts, c.status,
         c.media_type, c.preview_clip, c.audio_preview, c.preview_image,
         coalesce((select array_agg(f.slug order by f.sort_order, f.name)
                     from public.card_filters cf join public.filters f on f.id = cf.filter_id
                    where cf.card_id = c.id), '{}'::text[]),
         k.ts,
         k.num
    from public.cards c
    join public.sections s on s.id = c.section_id
    left join public.subsections ss on ss.id = c.subsection_id
    cross join lateral (
      select coalesce(c.published_at, c.created_at) as ts,
             case v_sort
               when 'manual'    then c.sort_order::double precision
               when 'relevance' then (case when v_tsq is null then 0 else ts_rank(c.search_tsv, v_tsq) end
                                      + extensions.word_similarity(v_q, c.title))::double precision
               else 0::double precision
             end as num
    ) k
   where (p_section is null or s.slug = p_section)
     and (v_sub is null or c.subsection_id = v_sub)
     and (c.status = 'published' or p_include_drafts)
     and (v_q is null
          or (v_tsq is not null and c.search_tsv @@ v_tsq)
          or extensions.word_similarity(v_q, c.title) >= 0.5)            -- light typo tolerance
     and (v_groups is null or not exists (
            select 1 from unnest(v_groups) as g(group_id)
             where not exists (
               select 1 from public.card_filters cf
                 join public.filters f on f.id = cf.filter_id
                where cf.card_id = c.id and f.group_id = g.group_id and f.id = any (v_ids))))
     and (p_after_id is null or case v_sort
            when 'newest' then (k.ts, c.id) < (p_after_ts, p_after_id)
            when 'manual' then (k.num, c.id) > (p_after_num, p_after_id)
            else               (k.num, c.id) < (p_after_num, p_after_id) end)
   order by
     case when v_sort = 'newest'    then k.ts  end desc,
     case when v_sort = 'relevance' then k.num end desc,
     case when v_sort = 'manual'    then k.num end asc,
     case when v_sort = 'manual'    then c.id  end asc,
     case when v_sort <> 'manual'   then c.id  end desc
   limit v_limit;
end;
$$;

-- Counts per visible tag for the "More filters" panel, within a section
-- (and optionally a subsection). RLS applies, so counts only include cards
-- the caller can see.
create function public.filter_counts(p_section text default null, p_sub text default null)
returns table (filter_id uuid, card_count bigint)
language sql stable security invoker set search_path = '' as $$
  select cf.filter_id, count(*)
    from public.card_filters cf
    join public.cards c    on c.id = cf.card_id and c.status = 'published'
    join public.sections s on s.id = c.section_id
    left join public.subsections ss on ss.id = c.subsection_id
   where (p_section is null or s.slug = p_section)
     and (nullif(btrim(coalesce(p_sub, '')), '') is null or ss.slug = lower(btrim(p_sub)))
   group by cf.filter_id;
$$;

-- ======================================================== admin link editing
-- The admin reads and replaces a card's links through these, because the
-- url column is never granted to browser roles.
create function private.admin_card_links(p_card uuid)
returns table (id uuid, kind public.link_kind, label text, url text, host text, sort_order int)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  return query
    select l.id, l.kind, l.label, l.url, l.host, l.sort_order
      from public.card_links l where l.card_id = p_card
     order by l.kind, l.sort_order, l.label;
end;
$$;
create function public.admin_card_links(p_card uuid)
returns table (id uuid, kind public.link_kind, label text, url text, host text, sort_order int)
language sql stable security invoker set search_path = '' as $$
  select * from private.admin_card_links(p_card);
$$;

-- p_links: [{"kind":"download","label":"1080p","url":"https://drive.google.com/..."}, ...]
-- Up to 20 links per card. URL rules are enforced by the table's CHECK.
create function private.admin_save_card_links(p_card uuid, p_links jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  if jsonb_typeof(p_links) <> 'array' then
    raise exception 'p_links must be a JSON array' using errcode = '22023';
  end if;
  if jsonb_array_length(p_links) > 20 then
    raise exception 'at most 20 links per card' using errcode = '22023';
  end if;
  if not exists (select 1 from public.cards where id = p_card) then
    raise exception 'card not found' using errcode = '22023';
  end if;
  delete from public.card_links where card_id = p_card;
  insert into public.card_links (card_id, kind, label, url, sort_order)
  select p_card, (e ->> 'kind')::public.link_kind, btrim(e ->> 'label'), btrim(e ->> 'url'), o::int - 1
    from jsonb_array_elements(p_links) with ordinality as t(e, o);
end;
$$;
create function public.admin_save_card_links(p_card uuid, p_links jsonb)
returns void language sql security invoker set search_path = '' as $$
  select private.admin_save_card_links(p_card, p_links);
$$;

-- ===================================================== link release (server)
-- Called only by the get-asset-link Edge Function (service role) after it has
-- verified the caller's login. Checks access, writes the audit row, returns url.
create function public.release_asset_link(p_user uuid, p_link uuid)
returns text language plpgsql volatile security invoker set search_path = '' as $$
declare
  v_card  uuid;
  v_url   text;
  v_kind  public.link_kind;
  v_label text;
  v_host  text;
  v_email text;
  v_ok    boolean;
begin
  select l.card_id, l.url, l.kind, l.label, l.host into v_card, v_url, v_kind, v_label, v_host
    from public.card_links l where l.id = p_link;
  select p.email into v_email from public.profiles p where p.id = p_user;

  v_ok := v_card is not null and (
            private.can_view_card(v_card, p_user)
            or exists (select 1 from public.profiles p
                        where p.id = p_user and p.role = 'admin'
                          and private.user_is_active(p_user)));

  insert into public.audit_log (actor_id, actor_email, action, card_id, link_id, details)
  values (p_user, v_email,
          case when v_ok then 'open_link' else 'open_link_denied' end,
          case when v_ok then v_card end,
          case when v_ok then p_link end,
          jsonb_build_object('kind', v_kind, 'label', v_label, 'host', v_host, 'requested_link', p_link));

  return case when v_ok then v_url end;
end;
$$;

-- ============================================================= admin helpers
-- Replace a card's tags in one step.
create function private.admin_set_card_filters(p_card uuid, p_filters uuid[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  delete from public.card_filters where card_id = p_card and filter_id <> all (coalesce(p_filters, '{}'));
  insert into public.card_filters (card_id, filter_id)
  select p_card, f from unnest(coalesce(p_filters, '{}')) as f
  on conflict do nothing;
end;
$$;
create function public.admin_set_card_filters(p_card uuid, p_filters uuid[])
returns void language sql security invoker set search_path = '' as $$
  select private.admin_set_card_filters(p_card, p_filters);
$$;

-- Merge tag p_from into p_into: cards and user access move over, then p_from is deleted.
create function private.admin_merge_filters(p_from uuid, p_into uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  if p_from = p_into then
    raise exception 'cannot merge a tag into itself' using errcode = '22023';
  end if;
  insert into public.card_filters (card_id, filter_id)
  select card_id, p_into from public.card_filters where filter_id = p_from
  on conflict do nothing;
  insert into public.user_filter_access (user_id, filter_id)
  select user_id, p_into from public.user_filter_access where filter_id = p_from
  on conflict do nothing;
  delete from public.filters where id = p_from;
  insert into public.audit_log (actor_id, actor_email, action, details)
  select p.id, p.email, 'admin_merge_filters', jsonb_build_object('from', p_from, 'into', p_into)
    from public.profiles p where p.id = (select auth.uid());
end;
$$;
create function public.admin_merge_filters(p_from uuid, p_into uuid)
returns void language sql security invoker set search_path = '' as $$
  select private.admin_merge_filters(p_from, p_into);
$$;

-- Set sort_order from the order of ids (10, 20, 30...).
create function private.admin_reorder(p_kind text, p_ids uuid[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  if p_kind = 'cards' then
    update public.cards c set sort_order = o.n * 10
      from unnest(p_ids) with ordinality as o (id, n) where c.id = o.id;
  elsif p_kind = 'sections' then
    update public.sections s set sort_order = o.n * 10
      from unnest(p_ids) with ordinality as o (id, n) where s.id = o.id;
  elsif p_kind = 'subsections' then
    update public.subsections s set sort_order = o.n * 10
      from unnest(p_ids) with ordinality as o (id, n) where s.id = o.id;
  elsif p_kind = 'filter_groups' then
    update public.filter_groups g set sort_order = o.n * 10
      from unnest(p_ids) with ordinality as o (id, n) where g.id = o.id;
  elsif p_kind = 'filters' then
    update public.filters f set sort_order = o.n * 10
      from unnest(p_ids) with ordinality as o (id, n) where f.id = o.id;
  else
    raise exception 'unknown kind %', p_kind using errcode = '22023';
  end if;
end;
$$;
create function public.admin_reorder(p_kind text, p_ids uuid[])
returns void language sql security invoker set search_path = '' as $$
  select private.admin_reorder(p_kind, p_ids);
$$;

-- Link opens per card, for the admin's download counts.
create function private.admin_link_open_counts()
returns table (card_id uuid, opens bigint, last_opened timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  return query
    select a.card_id, count(*), max(a.created_at)
      from public.audit_log a
     where a.action = 'open_link' and a.card_id is not null
     group by a.card_id;
end;
$$;
create function public.admin_link_open_counts()
returns table (card_id uuid, opens bigint, last_opened timestamptz)
language sql stable security invoker set search_path = '' as $$
  select * from private.admin_link_open_counts();
$$;

-- ==================================================================== grants
revoke all on function public.browse_cards(text, text[], text, text, timestamptz, double precision, uuid, int, boolean, text) from public, anon;
revoke all on function public.filter_counts(text, text)              from public, anon;
revoke all on function public.admin_card_links(uuid)                 from public, anon;
revoke all on function public.admin_save_card_links(uuid, jsonb)     from public, anon;
revoke all on function public.release_asset_link(uuid, uuid)         from public, anon, authenticated;
revoke all on function public.admin_set_card_filters(uuid, uuid[])   from public, anon;
revoke all on function public.admin_merge_filters(uuid, uuid)        from public, anon;
revoke all on function public.admin_reorder(text, uuid[])            from public, anon;
revoke all on function public.admin_link_open_counts()               from public, anon;

grant execute on function public.browse_cards(text, text[], text, text, timestamptz, double precision, uuid, int, boolean, text) to authenticated;
grant execute on function public.filter_counts(text, text)            to authenticated;
grant execute on function public.admin_card_links(uuid)               to authenticated;
grant execute on function public.admin_save_card_links(uuid, jsonb)   to authenticated;
grant execute on function public.release_asset_link(uuid, uuid)       to service_role;
grant execute on function public.admin_set_card_filters(uuid, uuid[]) to authenticated;
grant execute on function public.admin_merge_filters(uuid, uuid)      to authenticated;
grant execute on function public.admin_reorder(text, uuid[])          to authenticated;
grant execute on function public.admin_link_open_counts()             to authenticated;

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated, service_role;
