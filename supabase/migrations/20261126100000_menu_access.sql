-- Neal Guides Vault: per-editor access by side menu (owner's choice "A",
-- 2026-11-26). Replaces tag-based access.
--
-- Plain English:
--   * "All access" on (the default): the editor sees everything, as before.
--   * "All access" off: the admin ticks side-menu items for the editor:
--       - a GROUP      -> every section and subsection in it, including
--                         sections added to that group later;
--       - a SECTION    -> the whole section, all its subsections;
--       - a SUBSECTION -> only that subsection.
--     The editor sees only those items in the side menu, and only the cards
--     inside them (browse, search, counts, card pages and downloads).
--   * Admins always see everything.
--   * Enforced here, in the database, not only in the page.
--
-- Before this migration: 0 restricted editors and 0 tag grants, so the old
-- user_filter_access table is dropped without moving any data.

-- ------------------------------------------------------------------ table
create table public.user_menu_access (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  group_id      uuid references public.section_groups (id) on delete cascade,
  section_id    uuid references public.sections (id) on delete cascade,
  subsection_id uuid references public.subsections (id) on delete cascade,
  created_at    timestamptz not null default now(),
  -- exactly one target per row
  constraint user_menu_access_one_target check (num_nonnulls(group_id, section_id, subsection_id) = 1)
);
create unique index user_menu_access_group_uq      on public.user_menu_access (user_id, group_id)      where group_id is not null;
create unique index user_menu_access_section_uq    on public.user_menu_access (user_id, section_id)    where section_id is not null;
create unique index user_menu_access_subsection_uq on public.user_menu_access (user_id, subsection_id) where subsection_id is not null;
create index user_menu_access_group_idx      on public.user_menu_access (group_id);
create index user_menu_access_section_idx    on public.user_menu_access (section_id);
create index user_menu_access_subsection_idx on public.user_menu_access (subsection_id);

-- Browser roles may read (own rows, or all for the admin); writes only via
-- the admin Edge Functions (service role).
grant select on public.user_menu_access to authenticated;
alter table public.user_menu_access enable row level security;
create policy uma_select on public.user_menu_access for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));

-- ---------------------------------------------------------------- helpers
-- Full access: active, unexpired, and all_access on or admin.
create function private.has_full_menu(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_user
      and p.is_active
      and (p.expires_at is null or p.expires_at > now())
      and (p.all_access or p.role = 'admin')
  );
$$;

-- The whole section (every card in it): full access, or its group or the
-- section itself was ticked.
create function private.can_view_whole_section(p_section uuid, p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_full_menu(p_user)
      or (private.user_is_active(p_user) and exists (
            select 1
            from public.sections s
            join public.user_menu_access a on a.user_id = p_user
            where s.id = p_section
              and (a.section_id = s.id or a.group_id = s.group_id)));
$$;

-- A subsection: the whole section, or the subsection itself was ticked.
create function private.can_view_subsection(p_sub uuid, p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.subsections ss
    where ss.id = p_sub
      and (private.can_view_whole_section(ss.section_id, p_user)
           or (private.user_is_active(p_user) and exists (
                 select 1 from public.user_menu_access a
                 where a.user_id = p_user and a.subsection_id = ss.id)))
  );
$$;

-- A section shows in the menu when the whole section is allowed or at least
-- one of its subsections is.
create function private.can_view_section(p_section uuid, p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.can_view_whole_section(p_section, p_user)
      or (private.user_is_active(p_user) and exists (
            select 1
            from public.user_menu_access a
            join public.subsections ss on ss.id = a.subsection_id
            where a.user_id = p_user and ss.section_id = p_section));
$$;

-- A group shows in the menu when it was ticked or anything inside it was.
create function private.can_view_group(p_group uuid, p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_full_menu(p_user)
      or (private.user_is_active(p_user) and exists (
            select 1
            from public.user_menu_access a
            left join public.sections s     on s.id = a.section_id
            left join public.subsections ss on ss.id = a.subsection_id
            left join public.sections s2    on s2.id = ss.section_id
            where a.user_id = p_user
              and (a.group_id = p_group or s.group_id = p_group or s2.group_id = p_group)));
$$;

-- Cards: same rules. A card in a subsection is visible when that subsection
-- is allowed; a card in the section's main list needs the whole section.
create or replace function private.can_view_card(p_card uuid, p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.profiles p
    join public.cards c on c.id = p_card
    join public.sections s on s.id = c.section_id
    where p.id = p_user
      and p.is_active
      and (p.expires_at is null or p.expires_at > now())
      and c.status = 'published'
      and (
        p.all_access
        or p.role = 'admin'
        or exists (
          select 1 from public.user_menu_access a
          where a.user_id = p.id
            and (a.group_id = s.group_id
                 or a.section_id = s.id
                 or (c.subsection_id is not null and a.subsection_id = c.subsection_id))
        )
      )
  );
$$;

-- Tags: visible with full access, or when they appear on a card the user
-- can see. (The old "granted tag" branch is gone with tag-based access.)
create or replace function private.can_view_filter(p_filter uuid, p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_full_menu(p_user)
      or exists (select 1 from public.card_filters cf
                 where cf.filter_id = p_filter
                   and private.can_view_card(cf.card_id, p_user));
$$;

-- Tag merge no longer moves user grants (there are none).
create or replace function private.admin_merge_filters(p_from uuid, p_into uuid)
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
  delete from public.filters where id = p_from;
  insert into public.audit_log (actor_id, actor_email, action, details)
  select p.id, p.email, 'admin_merge_filters', jsonb_build_object('from', p_from, 'into', p_into)
    from public.profiles p where p.id = (select auth.uid());
end;
$$;

-- Sections the caller sees only in part (some subsections ticked, not the
-- whole section). The side menu hides "All <section>" for these.
create function private.my_partial_sections()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select s.id from public.sections s
  where private.can_view_section(s.id, (select auth.uid()))
    and not private.can_view_whole_section(s.id, (select auth.uid()));
$$;
create function public.my_partial_sections()
returns setof uuid language sql stable security invoker set search_path = '' as $$
  select private.my_partial_sections();
$$;

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated, service_role;
revoke all on function public.my_partial_sections() from public, anon;
grant execute on function public.my_partial_sections() to authenticated;

-- ---------------------------------------------------------------- policies
-- Groups, sections and subsections: visible (is_visible), active user, and
-- allowed for this user.
drop policy section_groups_select on public.section_groups;
create policy section_groups_select on public.section_groups for select to authenticated
  using (
    (select private.is_admin())
    or (is_visible and private.can_view_group(id, (select auth.uid())))
  );

drop policy sections_select on public.sections;
create policy sections_select on public.sections for select to authenticated
  using (
    (select private.is_admin())
    or (is_visible
        and exists (select 1 from public.section_groups g where g.id = sections.group_id and g.is_visible)
        and private.can_view_section(id, (select auth.uid())))
  );

drop policy subsections_select on public.subsections;
create policy subsections_select on public.subsections for select to authenticated
  using (
    (select private.is_admin())
    or (is_visible
        and exists (select 1 from public.sections s where s.id = subsections.section_id and s.is_visible)
        and private.can_view_subsection(id, (select auth.uid())))
  );

-- Admin audit of access changes is written by the admin Edge Functions.

-- ------------------------------------------------------------- old table
drop table public.user_filter_access;
