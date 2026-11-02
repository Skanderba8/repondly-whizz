-- Prepared integration coverage for an owner-run staging project after migration 004.
-- Synthetic fixtures only. Everything is rolled back; do not use for production verification.
begin;
insert into auth.users(id, email) values
  ('ff000000-0000-4000-8000-000000000001', 'reporting-employee@example.invalid'),
  ('ff000000-0000-4000-8000-000000000002', 'reporting-manager@example.invalid');
insert into public.workspace_members(user_id, role) values
  ('ff000000-0000-4000-8000-000000000001', 'employee'), ('ff000000-0000-4000-8000-000000000002', 'manager');
insert into public.tracker_stores(id, name, timezone) values
  ('ff000000-0000-4000-8000-000000000010', 'Synthetic reporting fixture', 'America/New_York');
insert into public.tracker_people(user_id, display_name, report_name) values
  ('ff000000-0000-4000-8000-000000000001', 'Reporting Employee Fixture', 'Reporting Employee Fixture'),
  ('ff000000-0000-4000-8000-000000000002', 'Reporting Manager Fixture', 'Reporting Manager Fixture');
insert into public.productivity_reports(owner_id, store_id, work_date, points, rtf_revenue_cents, activity, source_chat_id, source_message_id, source_sent_at) values
  ('ff000000-0000-4000-8000-000000000001', 'ff000000-0000-4000-8000-000000000010', '2026-07-01', 100, 10000, '{"rtf":3,"rtf_revenue_cents":10000}', 'reporting-fixture', 1, '2026-07-02T17:00:00Z'),
  ('ff000000-0000-4000-8000-000000000001', 'ff000000-0000-4000-8000-000000000010', '2026-07-02', 146, null, '{"rtf":0}', 'reporting-fixture', 2, '2026-07-03T17:00:00Z'),
  ('ff000000-0000-4000-8000-000000000002', 'ff000000-0000-4000-8000-000000000010', '2026-07-03', 10, 0, '{"rtf":0,"rtf_revenue_cents":0}', 'reporting-fixture', 3, '2026-07-04T17:00:00Z');
insert into public.bonus_entries(id, owner_id, store_id, work_date, kind, screenshot_path, screenshot_hash) values
  ('ff000000-0000-4000-8000-000000000020', 'ff000000-0000-4000-8000-000000000001', 'ff000000-0000-4000-8000-000000000010', '2026-07-02', 'review', 'ff000000-0000-4000-8000-000000000001/ff000000-0000-4000-8000-000000000020', repeat('a', 64));
insert into public.bonus_entries(id, owner_id, store_id, work_date, kind, subscription_number, dd_proof_added) values
  ('ff000000-0000-4000-8000-000000000021', 'ff000000-0000-4000-8000-000000000001', 'ff000000-0000-4000-8000-000000000010', '2026-07-02', 'doordash', 'SYNTHETIC-ONLY', true);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'ff000000-0000-4000-8000-000000000001', true);
do $$
declare result jsonb; history jsonb; empty_result jsonb;
begin
  result := public.tracker_reporting(auth.uid(), '2026-07-01', '2026-11-02', 'week');
  assert (result #>> '{summary,points}')::numeric = 246, 'Report sums must reconcile';
  assert (result #>> '{summary,point_value}')::numeric = 123, 'Point value';
  assert (result #>> '{summary,commission}')::numeric = 2.5, 'RTF rate and cents conversion';
  assert (result #>> '{summary,extra_bonus}')::numeric = 9.5, 'All three extras';
  assert (result #>> '{summary,total_earnings}')::numeric = 132.5, 'Combined known earnings';
  assert (result #>> '{summary,commission_missing}')::integer = 1, 'Missing RTF stays partial';
  assert jsonb_array_length(result -> 'members') = 0, 'Employees cannot compare peers';
  assert result #>> '{series,0,start}' = '2026-07-01', 'Clip first Sunday-based bucket';
  assert result #>> array['series', (jsonb_array_length(result -> 'series') - 1)::text, 'end'] = '2026-11-02', 'Clip last bucket';
  history := public.tracker_snapshot(auth.uid(), '2026-07-01', '2026-11-02', 0, null);
  assert (history ->> 'history_count')::integer = 4, 'History range and entries';
  assert (history ->> 'points')::numeric = 246, 'History and analytics agree';
  empty_result := public.tracker_reporting(auth.uid(), '2026-11-01', '2026-11-02', 'day');
  assert empty_result #>> '{summary,points}' is null, 'Missing reports are not zero';
  assert empty_result #>> '{availability,first_report}' = '2026-07-01', 'Availability independent of filter';
  begin
    perform public.tracker_reporting(null, '2026-07-01', '2026-07-31', 'day');
    raise exception 'Expected team access denial';
  exception when raise_exception then
    if sqlerrm <> 'Manager access required' then raise; end if;
  end;
  begin
    perform public.tracker_reporting('ff000000-0000-4000-8000-000000000002', '2026-07-01', '2026-07-31', 'day');
    raise exception 'Expected cross-account denial';
  exception when raise_exception then
    if sqlerrm <> 'Mapped profile access required' then raise; end if;
  end;
end;
$$;
select set_config('request.jwt.claim.sub', 'ff000000-0000-4000-8000-000000000002', true);
do $$
declare own jsonb; team jsonb;
begin
  own := public.tracker_reporting(auth.uid(), '2026-07-01', '2026-07-31', 'day');
  assert (own #>> '{summary,points}')::numeric = 10, 'Independent manager identity';
  team := public.tracker_reporting(null, '2026-07-01', '2026-11-02', 'week');
  assert exists (select 1 from jsonb_array_elements(team -> 'members') m where m ->> 'user_id' = 'ff000000-0000-4000-8000-000000000001' and (m ->> 'points')::numeric = 246), 'Manager sees employee without moving records';
  assert (public.tracker_snapshot(null, '2026-07-01', '2026-11-02', 0, null) ->> 'history_count')::integer >= 5, 'Manager team history';
end;
$$;
reset role;
rollback;
