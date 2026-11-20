-- Neal Guides Vault: the approved starting sections (decisions 5-9).
-- No cards, no tags, no users. The admin adds more from the panel.
-- Safe to run more than once.

insert into public.sections (slug, name, kind, sort_order) values
  ('fc-gameplay-clips', 'FC Gameplay Clips', 'gameplay',   10),
  ('effects',           'Effects',           'effect',     20),
  ('music',             'Music',             'music',      30),
  ('backgrounds',       'Backgrounds',       'background', 40)
on conflict (slug) do nothing;

insert into public.subsections (section_id, slug, name, sort_order)
select s.id, 'shorts', 'Shorts', 10
  from public.sections s
 where s.slug = 'fc-gameplay-clips'
on conflict (section_id, slug) do nothing;
