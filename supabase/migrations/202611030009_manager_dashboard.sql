begin;

-- Manager-only reads retain the caller's RLS context and never accept a role from the browser.
create or replace function public.manager_dashboard(
  p_start date, p_end date, p_people uuid[] default null, p_stores uuid[] default null, p_bucket text default 'day'
) returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare span integer; prior_start date; first_bucket date; step interval;
begin
  if auth.uid() is null or not public.tracker_is_manager() then raise exception 'Manager access required'; end if;
  if p_start is null or p_end is null or p_end < p_start or p_end - p_start > 3660
    or p_bucket is null or p_bucket not in ('day','week','month') then raise exception 'Invalid reporting range'; end if;
  span := p_end - p_start + 1;
  if (p_bucket = 'day' and span > 93) or (p_bucket = 'week' and span > 730) then raise exception 'Choose a wider chart bucket'; end if;
  if coalesce(cardinality(p_people),0) > 100 or coalesce(cardinality(p_stores),0) > 100
    or exists (select 1 from unnest(p_people) i where not exists (select 1 from public.tracker_people p where p.user_id = i))
    or exists (select 1 from unnest(p_stores) i where not exists (select 1 from public.tracker_stores s where s.id = i)) then
    raise exception 'Invalid people or stores';
  end if;
  prior_start := p_start - span;
  first_bucket := case p_bucket when 'day' then p_start when 'week' then p_start - extract(dow from p_start)::integer else date_trunc('month',p_start)::date end;
  step := case p_bucket when 'day' then interval '1 day' when 'week' then interval '7 days' else interval '1 month' end;
  return (
    with people as materialized (
      select * from public.tracker_people where p_people is null or user_id = any(p_people)
    ), stores as materialized (
      select * from public.tracker_stores where p_stores is null or id = any(p_stores)
    ), reports as materialized (
      select r.* from public.productivity_reports r join people p on p.user_id = r.owner_id join stores s on s.id = r.store_id
      where r.work_date between prior_start and p_end
    ), entries as materialized (
      select b.* from public.bonus_entries b join people p on p.user_id = b.owner_id join stores s on s.id = b.store_id
      where b.work_date between prior_start and p_end
    ), events as materialized (
      select owner_id,store_id,work_date,points,rtf_commission as commission,
        case when jsonb_typeof(activity -> 'total_revenue_cents') = 'number' then (activity ->> 'total_revenue_cents')::numeric / 100 end as revenue,
        1 as reports, case when rtf_revenue_cents is null then 1 else 0 end as commission_missing,
        0::bigint as review_cents,0 as reviews,0::bigint as doordash_cents,0 as doordash,imported_at as imported
      from reports
      union all
      select owner_id,store_id,work_date,null,null,null,0,0,
        case when kind='review' then bonus_cents else 0 end,case when kind='review' then 1 else 0 end,
        case when kind='doordash' then bonus_cents else 0 end,case when kind='doordash' then 1 else 0 end,null
      from entries
    ), buckets as (
      select d::date as bucket,greatest(d::date,p_start) as start,least((d+step)::date-1,p_end) as finish
      from generate_series(first_bucket::timestamp,p_end::timestamp,step) d
    ), tagged as (
      select case when work_date >= p_start then 'current' else 'previous' end as scope,e.* from events e
      union all select 'person:' || owner_id::text,e.* from events e where work_date >= p_start
      union all select 'priorperson:' || owner_id::text,e.* from events e where work_date < p_start
      union all select 'store:' || store_id::text,e.* from events e where work_date >= p_start
      union all select 'bucket:' || (case p_bucket when 'day' then work_date when 'week' then work_date-extract(dow from work_date)::integer else date_trunc('month',work_date)::date end)::text,e.* from events e where work_date >= p_start
      union all select 'priorbucket:' || (case p_bucket when 'day' then work_date+span when 'week' then work_date+span-extract(dow from work_date+span)::integer else date_trunc('month',work_date+span)::date end)::text,e.* from events e where work_date < p_start
    ), scopes as (
      select 'current' as scope union all select 'previous'
      union all select 'person:' || user_id::text from people
      union all select 'priorperson:' || user_id::text from people
      union all select 'store:' || id::text from stores
      union all select 'bucket:' || bucket::text from buckets
      union all select 'priorbucket:' || bucket::text from buckets
    ), totals as (
      select k.scope,coalesce(sum(e.points),0) as points,coalesce(sum(e.revenue),0) as revenue,
        coalesce(sum(e.commission),0) as commission,coalesce(sum(e.reviews),0) as review_count,
        coalesce(sum(e.doordash),0) as doordash_count,coalesce(sum(e.review_cents),0)/100.0 as review_money,
        coalesce(sum(e.doordash_cents),0)/100.0 as doordash_money,
        coalesce(sum(e.reports),0) as report_count,count(e.work_date) as record_count,
        count(distinct e.work_date) filter(where e.reports=1) as reported_days,
        count(*) filter(where e.reports=1 and e.revenue is null) as revenue_missing,
        coalesce(sum(e.commission_missing),0) as commission_missing,
        max(e.work_date) as latest_work_date,max(e.imported) as latest_import
      from scopes k left join tagged e on e.scope=k.scope group by k.scope
    ), metrics as (
      select scope,(to_jsonb(t)-'scope') || jsonb_build_object('point_value',points*0.5,
        'extra_bonus',commission+review_money+doordash_money,
        'total_earnings',points*0.5+commission+review_money+doordash_money) as value from totals t
    ), category_keys(key) as (
      values ('new_subscriptions'),('bikes_and_batteries'),('rtf'),('rtc'),('accessories')
    ), category_scopes as (
      select 'total' as scope union all select user_id::text from people
    ), category_reports as (
      select 'total' as scope,r.* from reports r where work_date >= p_start
      union all select owner_id::text,r.* from reports r where work_date >= p_start
    ), categories as (
      select s.scope,k.key,
        coalesce(sum(case when jsonb_typeof(r.activity -> k.key)='number' then (r.activity ->> k.key)::numeric end),0) as count,
        coalesce(sum(case when jsonb_typeof(r.activity -> (k.key || '_revenue_cents'))='number' then (r.activity ->> (k.key || '_revenue_cents'))::numeric end),0)/100.0 as revenue,
        count(r.id) filter(where jsonb_typeof(r.activity -> k.key) is distinct from 'number') as count_missing,
        count(r.id) filter(where jsonb_typeof(r.activity -> (k.key || '_revenue_cents')) is distinct from 'number') as revenue_missing
      from category_scopes s cross join category_keys k left join category_reports r on r.scope=s.scope group by s.scope,k.key
    )
    select jsonb_build_object(
      'summary',(select value from metrics where scope='current'),
      'previous',(select value from metrics where scope='previous'),
      'previous_start',prior_start,'previous_end',p_start-1,
      'series',(select coalesce(jsonb_agg(jsonb_build_object('start',b.start,'end',b.finish,'metrics',m.value,'previous',v.value) order by b.start),'[]'::jsonb) from buckets b join metrics m on m.scope='bucket:'||b.bucket::text join metrics v on v.scope='priorbucket:'||b.bucket::text),
      'people',(select coalesce(jsonb_agg(jsonb_build_object('user_id',p.user_id,'display_name',p.display_name,'home_store_id',p.home_store_id,'metrics',m.value,'previous',v.value,
        'categories',(select jsonb_agg(to_jsonb(c)-'scope' order by c.key) from categories c where c.scope=p.user_id::text)) order by p.display_name,p.user_id),'[]'::jsonb) from people p join metrics m on m.scope='person:'||p.user_id::text join metrics v on v.scope='priorperson:'||p.user_id::text),
      'stores',(select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'metrics',m.value) order by s.name),'[]'::jsonb) from stores s join metrics m on m.scope='store:'||s.id::text),
      'categories',(select jsonb_agg(to_jsonb(c)-'scope' order by c.key) from categories c where c.scope='total')
    )
  );
end;
$$;
revoke all on function public.manager_dashboard(date,date,uuid[],uuid[],text) from public,anon;
grant execute on function public.manager_dashboard(date,date,uuid[],uuid[],text) to authenticated;

create or replace function public.manager_records(
  p_start date,p_end date,p_people uuid[] default null,p_stores uuid[] default null,
  p_kind text default null,p_page integer default 0,p_search text default ''
) returns jsonb language plpgsql stable security invoker set search_path = '' as $$
begin
  if auth.uid() is null or not public.tracker_is_manager() then raise exception 'Manager access required'; end if;
  if p_start is null or p_end is null or p_end<p_start or p_end-p_start>3660 or p_page is null or p_page<0 or p_page>100000
    or (p_kind is not null and p_kind not in ('productivity','review','doordash')) or length(coalesce(p_search,''))>120
    or coalesce(cardinality(p_people),0)>100 or coalesce(cardinality(p_stores),0)>100 then raise exception 'Invalid record filters'; end if;
  if exists(select 1 from unnest(p_people) i where not exists(select 1 from public.tracker_people p where p.user_id=i))
    or exists(select 1 from unnest(p_stores) i where not exists(select 1 from public.tracker_stores s where s.id=i)) then raise exception 'Invalid people or stores'; end if;
  return (
    with records as (
      select r.id,r.owner_id,p.display_name,r.work_date,r.store_id,'productivity'::text as kind,r.points,
        r.rtf_commission*100 as bonus_cents,''::text as note,null::text as subscription_number,null::boolean as dd_proof_added,
        null::text as screenshot_path,r.imported_at as recorded_at,r.source_sent_at,r.activity,r.rtf_revenue_cents,s.name as store_name
      from public.productivity_reports r join public.tracker_people p on p.user_id=r.owner_id join public.tracker_stores s on s.id=r.store_id
      where r.work_date between p_start and p_end and (p_people is null or r.owner_id=any(p_people)) and (p_stores is null or r.store_id=any(p_stores))
      union all
      select b.id,b.owner_id,p.display_name,b.work_date,b.store_id,b.kind,null,b.bonus_cents,b.note,b.subscription_number,b.dd_proof_added,
        b.screenshot_path,b.created_at,null,null,null,s.name
      from public.bonus_entries b join public.tracker_people p on p.user_id=b.owner_id join public.tracker_stores s on s.id=b.store_id
      where b.work_date between p_start and p_end and (p_people is null or b.owner_id=any(p_people)) and (p_stores is null or b.store_id=any(p_stores))
    ), filtered as (
      select * from records where (p_kind is null or kind=p_kind) and (coalesce(btrim(p_search),'')='' or
        position(lower(btrim(p_search)) in lower(display_name||' '||store_name||' '||coalesce(subscription_number,'')))>0)
    )
    select jsonb_build_object('count',(select count(*) from filtered),
      'records',(select coalesce(jsonb_agg(to_jsonb(r)-'store_name' order by r.work_date desc,r.recorded_at desc,r.id),'[]'::jsonb) from (
        select * from filtered order by work_date desc,recorded_at desc,id limit 25 offset p_page*25
      ) r))
  );
end;
$$;
revoke all on function public.manager_records(date,date,uuid[],uuid[],text,integer,text) from public,anon;
grant execute on function public.manager_records(date,date,uuid[],uuid[],text,integer,text) to authenticated;

create index if not exists productivity_store_date on public.productivity_reports(store_id,work_date);
create index if not exists bonus_store_date on public.bonus_entries(store_id,work_date);
commit;
