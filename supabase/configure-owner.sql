-- Owner-run only, after the membership and tracker migrations.
-- Independent manager account. Never link or move the existing employee profile/history.
begin;
insert into public.workspace_members(user_id, role)
values ('e9e9e1f6-70b0-4eca-a80d-4a0420ef7bb2', 'manager')
on conflict (user_id) do update set role = excluded.role;

insert into public.tracker_people(user_id, display_name, report_name)
values ('e9e9e1f6-70b0-4eca-a80d-4a0420ef7bb2', 'Skander Abdallah Ben (Manager)', 'Skander Abdallah Ben (Manager)')
on conflict (user_id) do nothing;
-- Existing profiles and home stores are preserved. No records or ownership are changed.
-- The original report name remains assigned to the separate employee account.
commit;
