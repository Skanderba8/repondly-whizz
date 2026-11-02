-- Owner-run in Supabase SQL Editor after the membership/tracker migrations.
-- Exact account mappings confirmed by the owner. No account creation or record transfers.
begin;

create temporary table confirmed_team_mapping (
  email text primary key,
  report_name text not null unique
) on commit drop;

insert into confirmed_team_mapping(email, report_name) values
  ('virtual-agent11@rentwhizz.com', 'Khaled Mendoza Mendivelso'),
  ('virtual-agent5@rentwhizz.com', 'Diego Riaño'),
  ('virtual-agent7@rentwhizz.com', 'Skander Abdallah Ben'),
  ('virtual-agent1@rentwhizz.com', 'Kenzi Lefouili'),
  ('virtual-agent9@rentwhizz.com', 'Juan Esteban Santos Guevara'),
  ('virtual-agent12@rentwhizz.com', 'Abdul Samad'),
  ('virtual-agent10@rentwhizz.com', 'Hakim Bedrania'),
  ('virtual-agent3@rentwhizz.com', 'Abdramane Mahamat Ali'),
  ('virtual-agent4@rentwhizz.com', 'Neimat Mohammad'),
  ('virtual-agent8@rentwhizz.com', 'Hadi Hamitouche'),
  ('virtual-agent6@rentwhizz.com', 'Naila Bensid');

-- Chams Eddine Amaima was not assigned an account number; do not infer one.
-- The separate baskander5 manager account is intentionally outside this mapping.
lock table public.tracker_people in share row exclusive mode;
do $$
declare problem text;
begin
  select string_agg(m.email, ', ' order by m.email) into problem
  from confirmed_team_mapping m
  where (select count(*) from auth.users u where lower(u.email) = m.email) <> 1;
  if problem is not null then
    raise exception 'Missing or ambiguous Auth accounts: %. Create or reconcile these accounts before rerunning.', problem;
  end if;

  select string_agg(distinct m.email, ', ' order by m.email) into problem
  from confirmed_team_mapping m
  join auth.users u on lower(u.email) = m.email
  join public.tracker_people p on p.user_id = u.id or lower(btrim(p.report_name)) = lower(btrim(m.report_name))
  where (p.user_id = u.id and lower(btrim(p.report_name)) <> lower(btrim(m.report_name)))
    or (lower(btrim(p.report_name)) = lower(btrim(m.report_name)) and p.user_id <> u.id);
  if problem is not null then
    raise exception 'Existing profile mappings conflict for: %. No profiles or records were reassigned; reconcile these mappings first.', problem;
  end if;
end;
$$;

insert into public.workspace_members(user_id, role)
select u.id, 'employee'
from confirmed_team_mapping m join auth.users u on lower(u.email) = m.email
on conflict (user_id) do nothing;

insert into public.tracker_people(user_id, display_name, report_name)
select u.id, m.report_name, m.report_name
from confirmed_team_mapping m join auth.users u on lower(u.email) = m.email
on conflict (user_id) do update
set display_name = excluded.display_name, report_name = excluded.report_name;

select u.id as user_id, u.email, w.role, p.report_name
from confirmed_team_mapping m
join auth.users u on lower(u.email) = m.email
join public.workspace_members w on w.user_id = u.id
join public.tracker_people p on p.user_id = u.id
order by p.display_name;

commit;
