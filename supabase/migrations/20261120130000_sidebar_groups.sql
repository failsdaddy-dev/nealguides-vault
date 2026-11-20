-- Neal Guides Vault: sidebar groups (Group -> Section -> Subsection).
--
-- Plain English:
--   * A group is a top-level button in the side menu, e.g. "Vault". Tapping
--     it opens its sections (FC Gameplay Clips, Effects, Music, Backgrounds).
--   * The admin can create any number of groups and any number of sections
--     inside each (e.g. a "Socials" group with Tweet videos, IG Shorts, Reels).
--   * Every section belongs to exactly one group. The existing four sections
--     move into a new "Vault" group, so nothing changes for editors.
--   * Hiding a group hides its sections from editors (admins still see them).
--   * A group that still has sections can't be deleted (move them first).

create table public.section_groups (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 60),
  name       text not null check (length(name) between 1 and 60),
  sort_order int not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.section_groups (slug, name, sort_order) values ('vault', 'Vault', 10)
on conflict (slug) do nothing;

alter table public.sections
  add column group_id uuid references public.section_groups (id) on delete restrict;
update public.sections
   set group_id = (select id from public.section_groups where slug = 'vault')
 where group_id is null;
alter table public.sections alter column group_id set not null;
create index sections_group_idx on public.sections (group_id, sort_order);

-- A new section without a group goes into the first group.
create function private.sections_default_group()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.group_id is null then
    select g.id into new.group_id from public.section_groups g order by g.sort_order, g.name limit 1;
  end if;
  return new;
end;
$$;
create trigger sections_default_group before insert on public.sections
  for each row execute function private.sections_default_group();

-- ------------------------------------------------------------ access rules
grant select, insert, update, delete on public.section_groups to authenticated;
alter table public.section_groups enable row level security;

create policy section_groups_select on public.section_groups for select to authenticated
  using ((select private.is_admin()) or (is_visible and (select private.is_active_user())));
create policy section_groups_admin_insert on public.section_groups for insert to authenticated
  with check ((select private.is_admin()));
create policy section_groups_admin_update on public.section_groups for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy section_groups_admin_delete on public.section_groups for delete to authenticated
  using ((select private.is_admin()));

-- Sections: editors see a section only when it and its group are visible.
drop policy sections_select on public.sections;
create policy sections_select on public.sections for select to authenticated
  using (
    (select private.is_admin())
    or (is_visible
        and (select private.is_active_user())
        and exists (select 1 from public.section_groups g where g.id = sections.group_id and g.is_visible))
  );

-- Admin audit for groups, like sections.
create trigger section_groups_audit after insert or delete on public.section_groups
  for each row execute function private.audit_admin_change();

-- Reorder groups too.
create or replace function private.admin_reorder(p_kind text, p_ids uuid[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  if p_kind = 'cards' then
    update public.cards c set sort_order = o.n * 10
      from unnest(p_ids) with ordinality as o (id, n) where c.id = o.id;
  elsif p_kind = 'section_groups' then
    update public.section_groups g set sort_order = o.n * 10
      from unnest(p_ids) with ordinality as o (id, n) where g.id = o.id;
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

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated, service_role;
