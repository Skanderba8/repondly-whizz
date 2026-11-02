begin;

-- Read-only aggregates. Invoker rights preserve the existing employee/manager RLS boundary.
create function public.tracker_dashboard(p_start date, p_end date, p_today date)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare week_start date;
begin
  if auth.uid() is null or not exists (select 1 from public.workspace_members where user_id = auth.uid()) then
    raise exception 'Workspace access required';
  end if;
  if p_start is null or p_end is null or p_today is null or p_end < p_start or p_end - p_start > 31 then
    raise exception 'Invalid reporting range';
  end if;
  week_start := p_today - extract(dow from p_today)::integer;
  return jsonb_build_object('members', coalesce((
    select jsonb_agg(to_jsonb(member) order by member.display_name, member.user_id) from (
      select p.user_id, p.display_name,
        r.points, r.weekly_points, r.monthly_points, r.total_points, r.report_count,
        r.commission, r.commission_missing, r.last_import,
        b.review_count, b.review_cents, b.doordash_count, b.doordash_cents,
        coalesce((select jsonb_agg(to_jsonb(d) order by d.work_date) from (
          select work_date, sum(points) as points from public.productivity_reports
          where owner_id = p.user_id and work_date between p_start and p_end group by work_date
        ) d), '[]'::jsonb) as daily,
        coalesce((select jsonb_agg(to_jsonb(a) order by a.key) from (
          select k.key,
            sum(case when jsonb_typeof(pr.activity -> k.key) = 'number' then (pr.activity ->> k.key)::numeric end) as total,
            count(*) filter (where jsonb_typeof(pr.activity -> k.key) is distinct from 'number') as missing
          from public.productivity_reports pr
          cross join (values ('new_subscriptions'), ('bikes_and_batteries'), ('rtf'), ('rtc'), ('accessories')) k(key)
          where pr.owner_id = p.user_id and pr.work_date between p_start and p_end group by k.key
        ) a), '[]'::jsonb) as activity
      from public.tracker_people p
      cross join lateral (
        select sum(points) filter (where work_date between p_start and p_end) as points,
          sum(points) filter (where work_date between week_start and week_start + 6) as weekly_points,
          sum(points) filter (where date_trunc('month', work_date) = date_trunc('month', p_today)) as monthly_points,
          sum(points) as total_points,
          count(*) filter (where work_date between p_start and p_end) as report_count,
          sum(rtf_commission) filter (where work_date between p_start and p_end) as commission,
          count(*) filter (where work_date between p_start and p_end and rtf_revenue_cents is null) as commission_missing,
          max(imported_at) as last_import
        from public.productivity_reports where owner_id = p.user_id
      ) r
      cross join lateral (
        select count(*) filter (where kind = 'review') as review_count,
          coalesce(sum(bonus_cents) filter (where kind = 'review'), 0) as review_cents,
          count(*) filter (where kind = 'doordash') as doordash_count,
          coalesce(sum(bonus_cents) filter (where kind = 'doordash'), 0) as doordash_cents
        from public.bonus_entries where owner_id = p.user_id and work_date between p_start and p_end
      ) b
    ) member
  ), '[]'::jsonb));
end;
$$;
revoke all on function public.tracker_dashboard(date, date, date) from public;
grant execute on function public.tracker_dashboard(date, date, date) to authenticated;
commit;
