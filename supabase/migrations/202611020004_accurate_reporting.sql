begin;

-- Numeric calculations stay in Postgres. Null owner means manager-only team scope.
create function public.tracker_reporting(p_owner uuid, p_start date, p_end date, p_bucket text)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare bucket_start date; bucket_step interval;
begin
  if auth.uid() is null or not exists (select 1 from public.workspace_members where user_id = auth.uid()) then
    raise exception 'Workspace access required';
  end if;
  if p_owner is null and not public.tracker_is_manager() then raise exception 'Manager access required'; end if;
  if p_owner is not null and not exists (select 1 from public.tracker_people where user_id = p_owner) then
    raise exception 'Mapped profile access required';
  end if;
  -- Technical bound, not a retention policy. Long ranges are grouped before returning charts.
  if p_start is null or p_end is null or p_end < p_start or p_end - p_start > 3660
    or p_bucket is null or p_bucket not in ('day', 'week', 'month') then raise exception 'Invalid reporting range'; end if;
  if (p_end - p_start + 1 > 31 and p_bucket = 'day') or (p_end - p_start + 1 > 180 and p_bucket = 'week') then
    raise exception 'Choose a coarser chart bucket';
  end if;
  bucket_start := case p_bucket when 'day' then p_start when 'week' then p_start - extract(dow from p_start)::integer else date_trunc('month', p_start)::date end;
  bucket_step := case p_bucket when 'day' then interval '1 day' when 'week' then interval '7 days' else interval '1 month' end;
  return (
    with people as materialized (select * from public.tracker_people),
    selected_people as (select * from people where p_owner is null or user_id = p_owner),
    reports as materialized (select * from public.productivity_reports where work_date between p_start and p_end),
    entries as materialized (select * from public.bonus_entries where work_date between p_start and p_end),
    events as (
      select owner_id, work_date, points, points * 0.50 as point_value, rtf_commission as commission,
        1 as report_count, case when rtf_revenue_cents is null then 1 else 0 end as commission_missing,
        0::bigint as review_cents, 0 as review_count, 0::bigint as doordash_cents, 0 as doordash_count
      from reports
      union all
      select owner_id, work_date, null, null, null, 0, 0,
        case when kind = 'review' then bonus_cents else 0 end, case when kind = 'review' then 1 else 0 end,
        case when kind = 'doordash' then bonus_cents else 0 end, case when kind = 'doordash' then 1 else 0 end
      from entries
    ), selected_events as (select e.* from events e join selected_people p on p.user_id = e.owner_id),
    buckets as (
      select d::date as bucket, greatest(d::date, p_start) as start,
        least((d + bucket_step)::date - 1, p_end) as finish
      from generate_series(bucket_start::timestamp, p_end::timestamp, bucket_step) d
    ), tagged as (
      select owner_id::text as scope, e.* from events e
      union all select 'summary', e.* from selected_events e
      union all select 'bucket:' || (case p_bucket when 'day' then work_date when 'week' then work_date - extract(dow from work_date)::integer else date_trunc('month', work_date)::date end)::text, e.* from selected_events e
    ), keys as (
      select user_id::text as scope from people union all select 'summary'
      union all select 'bucket:' || bucket::text from buckets
    ), metrics as (
      select k.scope, count(t.work_date) as record_count, coalesce(sum(t.report_count), 0) as report_count,
        sum(t.points) as points, sum(t.point_value) as point_value, sum(t.commission) as commission,
        coalesce(sum(t.commission_missing), 0) as commission_missing,
        coalesce(sum(t.review_cents), 0) as review_cents, coalesce(sum(t.review_count), 0) as review_count,
        coalesce(sum(t.doordash_cents), 0) as doordash_cents, coalesce(sum(t.doordash_count), 0) as doordash_count,
        case when count(t.work_date) > 0 then coalesce(sum(t.commission), 0) + coalesce(sum(t.review_cents + t.doordash_cents), 0) / 100.0 end as extra_bonus,
        case when count(t.work_date) > 0 then coalesce(sum(t.point_value), 0) + coalesce(sum(t.commission), 0) + coalesce(sum(t.review_cents + t.doordash_cents), 0) / 100.0 end as total_earnings
      from keys k left join tagged t on t.scope = k.scope group by k.scope
    ), categories as (
      select k.key,
        sum(case when jsonb_typeof(r.activity -> k.key) = 'number' then (r.activity ->> k.key)::numeric end) as count,
        sum(case when jsonb_typeof(r.activity -> (k.key || '_revenue_cents')) = 'number' then (r.activity ->> (k.key || '_revenue_cents'))::numeric end) / 100.0 as revenue,
        count(r.id) filter (where jsonb_typeof(r.activity -> k.key) is distinct from 'number') as count_missing,
        count(r.id) filter (where jsonb_typeof(r.activity -> (k.key || '_revenue_cents')) is distinct from 'number') as revenue_missing
      from (values ('new_subscriptions'), ('bikes_and_batteries'), ('rtf'), ('rtc'), ('accessories')) k(key)
      left join (select r.* from reports r join selected_people p on p.user_id = r.owner_id) r on true group by k.key
    ), availability as (
      select min(work_date) as first_report, max(work_date) as last_report,
        max(imported_at) as last_import, max(source_sent_at) as last_source_sent,
        (select min(work_date) from public.bonus_entries b join selected_people p on p.user_id = b.owner_id) as first_entry,
        (select max(work_date) from public.bonus_entries b join selected_people p on p.user_id = b.owner_id) as last_entry
      from public.productivity_reports r join selected_people p on p.user_id = r.owner_id
    )
    select jsonb_build_object(
      'summary', (select to_jsonb(m) - 'scope' from metrics m where scope = 'summary'),
      'series', (select coalesce(jsonb_agg((to_jsonb(m) - 'scope') || jsonb_build_object('start', b.start, 'end', b.finish) order by b.start), '[]'::jsonb) from buckets b join metrics m on m.scope = 'bucket:' || b.bucket::text),
      'categories', (select jsonb_agg(to_jsonb(c) order by c.key) from categories c),
      'members', case when public.tracker_is_manager() then (select coalesce(jsonb_agg((to_jsonb(m) - 'scope') || jsonb_build_object('user_id', p.user_id, 'display_name', p.display_name) order by p.display_name, p.user_id), '[]'::jsonb) from people p join metrics m on m.scope = p.user_id::text) else '[]'::jsonb end,
      'availability', (select to_jsonb(a) from availability a),
      'mapped_members', (select count(*) from selected_people),
      'members_with_reports', (select count(*) from selected_people p join metrics m on m.scope = p.user_id::text where m.report_count > 0)
    )
  );
end;
$$;
revoke all on function public.tracker_reporting(uuid, date, date, text) from public;
grant execute on function public.tracker_reporting(uuid, date, date, text) to authenticated;
create or replace function public.tracker_snapshot(p_owner uuid, p_start date, p_end date, p_page integer default 0, p_kind text default null)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
begin
  if p_start is null or p_end is null or p_end < p_start or p_end - p_start > 3660
    or p_page is null or p_page < 0 or p_page > 100000
    or (p_kind is not null and p_kind not in ('productivity', 'review', 'doordash')) then raise exception 'Invalid reporting range'; end if;
  if auth.uid() is null or not exists (select 1 from public.workspace_members where user_id = auth.uid()) then raise exception 'Workspace access required'; end if;
  if p_owner is null and not public.tracker_is_manager() then raise exception 'Manager access required'; end if;
  if p_owner is not null and not exists (select 1 from public.tracker_people where user_id = p_owner) then raise exception 'Access unavailable'; end if;
  return (
    with reports as (
      select * from public.productivity_reports where (p_owner is null or owner_id = p_owner) and work_date between p_start and p_end
    ), entries as (
      select * from public.bonus_entries where (p_owner is null or owner_id = p_owner) and work_date between p_start and p_end
    ), all_history as (
      select id, owner_id, (select display_name from public.tracker_people where user_id = reports.owner_id) as display_name, work_date, store_id, 'productivity'::text as kind, points, null::integer as bonus_cents,
        ''::text as note, null::text as subscription_number, null::boolean as dd_proof_added,
        null::text as screenshot_path, imported_at as recorded_at, source_sent_at, activity, rtf_revenue_cents
      from reports
      union all
      select id, owner_id, (select display_name from public.tracker_people where user_id = entries.owner_id) as display_name, work_date, store_id, kind, null, bonus_cents, note, subscription_number, dd_proof_added,
        screenshot_path, created_at, null, null, null from entries
    ), history as (select * from all_history where p_kind is null or kind = p_kind)
    select jsonb_build_object(
      'points', (select sum(points) from reports),
      'report_count', (select count(*) from reports),
      'commission', (select sum(rtf_commission) from reports),
      'commission_missing', (select count(*) from reports where rtf_revenue_cents is null),
      'review_cents', (select coalesce(sum(bonus_cents), 0) from entries where kind = 'review'),
      'review_count', (select count(*) from entries where kind = 'review'),
      'doordash_cents', (select coalesce(sum(bonus_cents), 0) from entries where kind = 'doordash'),
      'doordash_count', (select count(*) from entries where kind = 'doordash'),
      'proof_missing', (select count(*) from entries where kind = 'doordash' and not dd_proof_added),
      'last_import', (select max(imported_at) from reports),
      'daily', (select coalesce(jsonb_agg(to_jsonb(d) order by d.work_date), '[]'::jsonb) from (
        select work_date, sum(points) as points from reports group by work_date
      ) d),
      'history_count', (select count(*) from history),
      'history', (select coalesce(jsonb_agg(to_jsonb(h) order by h.work_date desc, h.recorded_at desc, h.id), '[]'::jsonb) from (
        select * from history order by work_date desc, recorded_at desc, id limit 25 offset p_page * 25
      ) h)
    )
  );
end;
$$;
revoke all on function public.tracker_snapshot(uuid, date, date, integer, text) from public;
grant execute on function public.tracker_snapshot(uuid, date, date, integer, text) to authenticated;


commit;

