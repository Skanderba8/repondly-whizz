begin;

alter table public.bonus_entries add column review_version integer not null default 0 check (review_version >= 0);
alter table public.bonus_entries drop constraint valid_bonus_details;
alter table public.bonus_entries add constraint valid_bonus_details check (
  (kind = 'review' and subscription_number is null and dd_proof_added is null
    and (screenshot_path = owner_id::text || '/' || id::text
      or screenshot_path ~ ('^' || owner_id::text || '/' || id::text || '/[a-f0-9-]{36}$'))
    and screenshot_hash ~ '^[a-f0-9]{64}$' and screenshot_path is not null and screenshot_hash is not null)
  or (kind = 'doordash' and length(btrim(subscription_number)) between 1 and 120
    and subscription_number is not null and dd_proof_added is not null
    and screenshot_path is null and screenshot_hash is null and note = '')
);

-- Durable mutation receipts and screenshot cleanup. No note/image content is retained.
create table public.review_mutations (
  id uuid primary key,
  record_id uuid not null,
  actor_id uuid not null,
  owner_id uuid not null,
  action text not null check (action in ('edit', 'delete')),
  request_hash text not null check (request_hash ~ '^[a-f0-9]{64}$'),
  previous_version integer not null,
  old_store_id uuid not null,
  old_work_date date not null,
  new_store_id uuid,
  new_work_date date,
  cleanup_paths text[] not null default '{}',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index review_mutations_record on public.review_mutations(record_id);
alter table public.review_mutations enable row level security;
revoke all on public.review_mutations from public, anon, authenticated;
grant all on public.review_mutations to service_role;

-- Prevent a delayed create retry from resurrecting a deleted review.
create function public.guard_deleted_review() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.kind = 'review' then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.id::text, 0));
    if exists (select 1 from public.review_mutations where record_id = new.id and action = 'delete') then
      raise exception using errcode = '23514', message = 'Deleted review reference cannot be reused';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_deleted_review() from public, anon, authenticated;
create trigger guard_deleted_review before insert on public.bonus_entries
for each row execute function public.guard_deleted_review();

-- Service-only: the Edge Function supplies the verified Auth identity, never browser identity.
create function public.apply_review_mutation(
  p_operation uuid, p_actor uuid, p_id uuid, p_action text, p_version integer,
  p_request_hash text, p_store uuid default null, p_date date default null,
  p_note text default null, p_image_path text default null, p_image_hash text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  entry public.bonus_entries;
  receipt public.review_mutations;
  role_name text;
  paths text[] := '{}';
begin
  select role into role_name from public.workspace_members where user_id = p_actor;
  if role_name is null then raise exception using errcode = '42501', message = 'Workspace access required'; end if;
  if p_operation is null or p_id is null or p_action not in ('edit', 'delete')
    or p_action is null or p_version is null or p_version < 0
    or p_request_hash is null or p_request_hash !~ '^[a-f0-9]{64}$' then
    raise exception using errcode = '22023', message = 'Invalid review change';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_operation::text, 1));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_id::text, 0));
  select * into receipt from public.review_mutations where id = p_operation;
  if found then
    if receipt.actor_id <> p_actor or receipt.record_id <> p_id or receipt.action <> p_action
      or receipt.request_hash <> p_request_hash then
      raise exception using errcode = '40001', message = 'Change reference conflicts';
    end if;
    if receipt.owner_id <> p_actor and role_name <> 'manager' then
      raise exception using errcode = '42501', message = 'Review access denied';
    end if;
    return to_jsonb(receipt);
  end if;
  select * into entry from public.bonus_entries where id = p_id and kind = 'review' for update;
  if not found then raise exception using errcode = 'P0002', message = 'Review is no longer available'; end if;
  if entry.owner_id <> p_actor and role_name <> 'manager' then
    raise exception using errcode = '42501', message = 'Review access denied';
  end if;
  if entry.review_version <> p_version then
    raise exception using errcode = '40001', message = 'Review changed; reopen it before editing';
  end if;
  if p_action = 'edit' then
    if p_store is null or not exists (select 1 from public.tracker_stores where id = p_store)
      or p_date is null or p_note is null or length(p_note) > 4000 then
      raise exception using errcode = '22023', message = 'Check the review fields';
    end if;
    if p_image_path is not null then
      if p_image_path <> entry.owner_id::text || '/' || entry.id::text || '/' || p_operation::text
        or p_image_hash is null or p_image_hash !~ '^[a-f0-9]{64}$'
        or not exists (select 1 from storage.objects where bucket_id = 'review-evidence' and name = p_image_path) then
        raise exception using errcode = '22023', message = 'Screenshot upload is not available';
      end if;
      paths := array[entry.screenshot_path];
    elsif p_image_hash is not null then
      raise exception using errcode = '22023', message = 'Invalid screenshot reference';
    end if;
    update public.bonus_entries set store_id = p_store, work_date = p_date, note = p_note,
      screenshot_path = coalesce(p_image_path, screenshot_path), screenshot_hash = coalesce(p_image_hash, screenshot_hash),
      review_version = review_version + 1 where id = p_id;
  else
    -- Include prior failed cleanup and staged files already present under this review's prefix.
    select coalesce(array_agg(distinct path), '{}') into paths from (
      select entry.screenshot_path as path
      union select name from storage.objects where bucket_id = 'review-evidence'
        and (name = entry.owner_id::text || '/' || p_id::text
          or starts_with(name, entry.owner_id::text || '/' || p_id::text || '/'))
      union select unnest(cleanup_paths) from public.review_mutations where record_id = p_id
    ) objects;
    delete from public.bonus_entries where id = p_id;
  end if;
  insert into public.review_mutations(id, record_id, actor_id, owner_id, action, request_hash,
    previous_version, old_store_id, old_work_date, new_store_id, new_work_date, cleanup_paths)
  values (p_operation, p_id, p_actor, entry.owner_id, p_action, p_request_hash, entry.review_version,
    entry.store_id, entry.work_date, case when p_action = 'edit' then p_store end,
    case when p_action = 'edit' then p_date end, paths)
  returning * into receipt;
  return to_jsonb(receipt);
end;
$$;
revoke all on function public.apply_review_mutation(uuid, uuid, uuid, text, integer, text, uuid, date, text, text, text) from public, anon, authenticated;
grant execute on function public.apply_review_mutation(uuid, uuid, uuid, text, integer, text, uuid, date, text, text, text) to service_role;

commit;
