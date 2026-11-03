begin;

-- Eligibility helper does not expose the membership table or any profile fields.
create or replace function public.tracker_is_employee(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null
    and (auth.uid() = p_user or public.tracker_is_manager())
    and exists(select 1 from public.workspace_members where user_id = p_user and role = 'employee');
$$;
revoke all on function public.tracker_is_employee(uuid) from public, anon;
grant execute on function public.tracker_is_employee(uuid) to authenticated;

-- Manager identities and manager-owned performance are outside the reporting roster.
alter policy "Personal or manager profiles" on public.tracker_people
  using (public.tracker_is_employee(user_id) and (user_id = auth.uid() or public.tracker_is_manager()));
alter policy "Personal or manager reports" on public.productivity_reports
  using (public.tracker_is_employee(owner_id) and (owner_id = auth.uid() or public.tracker_is_manager()));
alter policy "Personal or manager bonuses" on public.bonus_entries
  using (public.tracker_is_employee(owner_id) and (owner_id = auth.uid() or public.tracker_is_manager()));

create or replace function public.tracker_category_benchmarks(p_start date, p_end date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.workspace_members where user_id = auth.uid() and role in ('employee', 'manager')
  ) then raise exception 'Workspace access required'; end if;
  if p_start is null or p_end is null or p_end < p_start or p_end - p_start > 3660 then
    raise exception 'Invalid reporting range';
  end if;
  return (
    with categories(key) as (
      values ('new_subscriptions'), ('bikes_and_batteries'), ('rtf'), ('rtc'), ('accessories')
    ), per_person as (
      select k.key, r.owner_id,
        sum(case when jsonb_typeof(r.activity -> k.key) = 'number' then (r.activity ->> k.key)::numeric end) as count_total,
        sum(case when jsonb_typeof(r.activity -> (k.key || '_revenue_cents')) = 'number'
          then (r.activity ->> (k.key || '_revenue_cents'))::numeric end) / 100.0 as revenue_total
      from public.productivity_reports r
      join public.tracker_people p on p.user_id = r.owner_id
      join public.workspace_members w on w.user_id = p.user_id and w.role = 'employee'
      cross join categories k
      where r.work_date between p_start and p_end
      group by k.key, r.owner_id
    ), maxima as (
      select k.key, max(p.count_total) as count_max, max(p.revenue_total) as revenue_max
      from categories k left join per_person p on p.key = k.key group by k.key
    )
    select jsonb_agg(to_jsonb(m) order by m.key) from maxima m
  );
end;
$$;
revoke all on function public.tracker_category_benchmarks(date, date) from public, anon;
grant execute on function public.tracker_category_benchmarks(date, date) to authenticated;


commit;
