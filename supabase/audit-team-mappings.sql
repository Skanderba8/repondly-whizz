-- Owner-run, read-only diagnostic. Run in the trusted Supabase SQL Editor.
-- Counts describe stored records, not reconciliation against Telegram messages.
with expected(email, report_name) as (
  values
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
    ('virtual-agent6@rentwhizz.com', 'Naila Bensid'),
    (null, 'Chams Eddine Amaima')
), reports as (
  select owner_id, count(*) as report_count, min(work_date) as first_work_date,
    max(work_date) as last_work_date, sum(points) as stored_points
  from public.productivity_reports
  group by owner_id
)
select e.report_name as expected_report_name, e.email as expected_email,
  u.id as account_id, u.email_confirmed_at is not null as email_confirmed,
  w.role, p.report_name as account_report_name,
  named.user_id as report_name_owner_id, named_account.email as report_name_owner_email,
  case
    when e.email is null then 'EMAIL MAPPING NEEDED'
    when u.id is null then 'AUTH ACCOUNT MISSING'
    when named.user_id is not null and named.user_id <> u.id then 'REPORT NAME BELONGS TO ANOTHER ACCOUNT'
    when w.user_id is null then 'WORKSPACE MEMBERSHIP MISSING'
    when p.user_id is null then 'TRACKER PROFILE MISSING'
    when lower(btrim(p.report_name)) <> lower(btrim(e.report_name)) then 'REPORT NAME MISMATCH'
    when u.email_confirmed_at is null then 'EMAIL NOT CONFIRMED'
    else 'MAPPING OK'
  end as mapping_status,
  coalesce(r.report_count, 0) as account_report_count,
  r.first_work_date, r.last_work_date, r.stored_points
from expected e
left join auth.users u on lower(u.email) = e.email
left join public.workspace_members w on w.user_id = u.id
left join public.tracker_people p on p.user_id = u.id
left join public.tracker_people named on lower(btrim(named.report_name)) = lower(btrim(e.report_name))
left join auth.users named_account on named_account.id = named.user_id
left join reports r on r.owner_id = u.id
order by e.report_name;
