begin;
create or replace function public.manager_records(
  p_start date,p_end date,p_people uuid[] default null,p_stores uuid[] default null,
  p_kind text default null,p_page integer default 0,p_search text default ''
) returns jsonb language plpgsql stable security invoker set search_path = '' as $$
begin
  if auth.uid() is null or not public.tracker_is_manager() then raise exception 'Manager access required'; end if;
  if p_start is null or p_end is null or p_end<p_start or p_end-p_start>3660 or p_page is null or p_page<0 or p_page>100000
    or (p_kind is not null and p_kind not in ('productivity','review','doordash','bonuses')) or length(coalesce(p_search,''))>120
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
      select * from records where (p_kind is null or kind=p_kind or (p_kind='bonuses' and kind in ('review','doordash'))) and (coalesce(btrim(p_search),'')='' or
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


commit;
