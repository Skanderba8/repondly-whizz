begin;

create function public.tracker_is_manager() returns boolean
language sql stable security invoker set search_path = '' as $$
  select exists (select 1 from public.workspace_members where user_id = auth.uid() and role = 'manager');
$$;
revoke all on function public.tracker_is_manager() from public;
grant execute on function public.tracker_is_manager() to authenticated;

create table public.tracker_stores (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(btrim(name)) between 1 and 120),
  timezone text not null
);
create function public.validate_tracker_timezone() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'A valid IANA timezone is required';
  end if;
  return new;
end;
$$;
create trigger validate_store_timezone before insert or update on public.tracker_stores
for each row execute function public.validate_tracker_timezone();

create table public.tracker_people (
  user_id uuid primary key references public.workspace_members(user_id),
  display_name text not null check (length(btrim(display_name)) between 1 and 160),
  report_name text not null check (length(btrim(report_name)) between 1 and 160),
  home_store_id uuid references public.tracker_stores(id)
);
create unique index tracker_report_names on public.tracker_people (lower(btrim(report_name)));

create table public.tracker_settings (
  id boolean primary key default true check (id),
  screenshot_max_bytes integer check (screenshot_max_bytes > 0)
);
insert into public.tracker_settings(id) values (true);

create table public.productivity_reports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.tracker_people(user_id),
  store_id uuid not null references public.tracker_stores(id),
  work_date date not null,
  points numeric(12,2) not null check (points >= 0),
  rtf_revenue_cents bigint check (rtf_revenue_cents >= 0),
  rtf_commission numeric generated always as (rtf_revenue_cents * 0.025 / 100) stored,
  activity jsonb not null check (jsonb_typeof(activity) = 'object'),
  source_chat_id text not null,
  source_message_id bigint not null,
  source_sent_at timestamptz not null,
  imported_at timestamptz not null default now(),
  unique (source_chat_id, source_message_id, owner_id),
  unique (owner_id, store_id, work_date)
);
create index productivity_owner_date on public.productivity_reports(owner_id, work_date);

create table public.bonus_entries (
  id uuid primary key,
  owner_id uuid not null references public.tracker_people(user_id),
  store_id uuid not null references public.tracker_stores(id),
  work_date date not null,
  kind text not null check (kind in ('review', 'doordash')),
  note text not null default '' check (length(note) <= 4000),
  subscription_number text,
  dd_proof_added boolean,
  screenshot_path text unique,
  screenshot_hash text,
  bonus_cents integer generated always as (case when kind = 'review' then 200 else 500 end) stored,
  created_at timestamptz not null default now(),
  constraint valid_bonus_details check (
    (kind = 'review' and subscription_number is null and dd_proof_added is null
      and screenshot_path = owner_id::text || '/' || id::text
      and screenshot_hash ~ '^[a-f0-9]{64}$' and screenshot_path is not null and screenshot_hash is not null)
    or (kind = 'doordash' and length(btrim(subscription_number)) between 1 and 120
      and subscription_number is not null and dd_proof_added is not null
      and screenshot_path is null and screenshot_hash is null and note = '')
  )
);
create index bonus_owner_date on public.bonus_entries(owner_id, work_date, created_at desc);

alter table public.tracker_stores enable row level security;
alter table public.tracker_people enable row level security;
alter table public.tracker_settings enable row level security;
alter table public.productivity_reports enable row level security;
alter table public.bonus_entries enable row level security;

revoke all on public.tracker_stores, public.tracker_people, public.tracker_settings, public.productivity_reports, public.bonus_entries from public, anon, authenticated;
grant select on public.tracker_stores, public.tracker_people, public.tracker_settings, public.productivity_reports, public.bonus_entries to authenticated;
grant all on public.tracker_stores, public.tracker_people, public.tracker_settings, public.productivity_reports, public.bonus_entries to service_role;

create policy "Workspace stores" on public.tracker_stores for select to authenticated
using (exists (select 1 from public.workspace_members where user_id = auth.uid()));
create policy "Workspace upload settings" on public.tracker_settings for select to authenticated
using (exists (select 1 from public.workspace_members where user_id = auth.uid()));
create policy "Personal or manager profiles" on public.tracker_people for select to authenticated
using (user_id = auth.uid() or public.tracker_is_manager());
create policy "Personal or manager reports" on public.productivity_reports for select to authenticated
using (exists (select 1 from public.workspace_members where user_id = auth.uid()) and (owner_id = auth.uid() or public.tracker_is_manager()));
create policy "Personal or manager bonuses" on public.bonus_entries for select to authenticated
using (exists (select 1 from public.workspace_members where user_id = auth.uid()) and (owner_id = auth.uid() or public.tracker_is_manager()));

create function public.save_doordash(p_id uuid, p_store_id uuid, p_work_date date, p_subscription text, p_proof boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare existing public.bonus_entries;
begin
  if auth.uid() is null or not exists (select 1 from public.workspace_members where user_id = auth.uid()) then
    raise exception 'Workspace access required';
  end if;
  if p_id is null or p_store_id is null or p_work_date is null or p_subscription is null or p_proof is null then
    raise exception 'Complete the required fields';
  end if;
  insert into public.bonus_entries(id, owner_id, store_id, work_date, kind, subscription_number, dd_proof_added)
  values (p_id, auth.uid(), p_store_id, p_work_date, 'doordash', btrim(p_subscription), p_proof)
  on conflict (id) do nothing;
  select * into existing from public.bonus_entries where id = p_id;
  if existing.owner_id <> auth.uid() or existing.kind <> 'doordash' or existing.store_id <> p_store_id
    or existing.work_date <> p_work_date or existing.subscription_number <> btrim(p_subscription)
    or existing.dd_proof_added <> p_proof then
    raise exception 'Save reference already used';
  end if;
  return p_id;
end;
$$;
revoke all on function public.save_doordash(uuid, uuid, date, text, boolean) from public;
grant execute on function public.save_doordash(uuid, uuid, date, text, boolean) to authenticated;

create function public.tracker_context() returns jsonb
language sql stable security invoker set search_path = '' as $$
select jsonb_build_object(
  'people', coalesce((select jsonb_agg(to_jsonb(p) order by p.display_name) from public.tracker_people p), '[]'::jsonb),
  'stores', coalesce((select jsonb_agg(to_jsonb(s) order by s.name) from public.tracker_stores s), '[]'::jsonb),
  'screenshot_max_bytes', (select screenshot_max_bytes from public.tracker_settings where id)
);
$$;
revoke all on function public.tracker_context() from public;
grant execute on function public.tracker_context() to authenticated;

create function public.tracker_snapshot(p_owner uuid, p_start date, p_end date, p_page integer default 0, p_kind text default null)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
begin
  if p_owner is null or p_start is null or p_end is null or p_end < p_start or p_end - p_start > 31
    or p_page is null or p_page < 0 or p_page > 100000
    or (p_kind is not null and p_kind not in ('productivity', 'review', 'doordash')) then raise exception 'Invalid reporting range'; end if;
  if not exists (select 1 from public.tracker_people where user_id = p_owner) then raise exception 'Access unavailable'; end if;
  return (
    with reports as (
      select * from public.productivity_reports where owner_id = p_owner and work_date between p_start and p_end
    ), entries as (
      select * from public.bonus_entries where owner_id = p_owner and work_date between p_start and p_end
    ), all_history as (
      select id, work_date, store_id, 'productivity'::text as kind, points, null::integer as bonus_cents,
        ''::text as note, null::text as subscription_number, null::boolean as dd_proof_added,
        null::text as screenshot_path, imported_at as recorded_at, source_sent_at, activity, rtf_revenue_cents
      from reports
      union all
      select id, work_date, store_id, kind, null, bonus_cents, note, subscription_number, dd_proof_added,
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

insert into storage.buckets(id, name, public, allowed_mime_types)
values ('review-evidence', 'review-evidence', false, array['image/jpeg', 'image/png', 'image/webp']);
-- Only the trusted upload function can create evidence. Browser access is read-only and record-scoped.
create policy "Read authorized review evidence" on storage.objects for select to authenticated
using (bucket_id = 'review-evidence' and exists (
  select 1 from public.bonus_entries e where e.screenshot_path = name and e.kind = 'review'
));

comment on table public.productivity_reports is 'Reported points only. Trusted collector inserts; conflicting daily or edited reports require explicit reconciliation.';
comment on table public.bonus_entries is 'Self-reported bonus tracker. No approval or payout verification. Fixed review $2 and DoorDash $5, separate from productivity points.';
commit;
