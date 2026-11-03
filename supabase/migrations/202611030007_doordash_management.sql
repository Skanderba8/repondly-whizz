begin;

alter table public.bonus_entries add column doordash_version integer not null default 0 check (doordash_version >= 0);

-- Receipts support retry and prevent a delayed creation request restoring a deleted ID.
create table public.doordash_mutations (
  id uuid primary key,
  record_id uuid not null,
  actor_id uuid not null,
  owner_id uuid not null,
  action text not null check (action in ('edit', 'delete')),
  request_fingerprint text not null,
  previous_version integer not null,
  old_store_id uuid not null,
  old_work_date date not null,
  new_store_id uuid,
  new_work_date date,
  created_at timestamptz not null default now()
);
create index doordash_mutations_record on public.doordash_mutations(record_id);
alter table public.doordash_mutations enable row level security;
revoke all on public.doordash_mutations from public, anon, authenticated;
grant all on public.doordash_mutations to service_role;

create function public.guard_deleted_doordash() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.kind = 'doordash' then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.id::text, 0));
    if exists (select 1 from public.doordash_mutations where record_id = new.id and action = 'delete') then
      raise exception using errcode = '23514', message = 'Deleted DoorDash reference cannot be reused';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_deleted_doordash() from public, anon, authenticated;
create trigger guard_deleted_doordash before insert on public.bonus_entries
for each row execute function public.guard_deleted_doordash();

create function public.manage_doordash(
  p_operation uuid, p_id uuid, p_action text, p_version integer,
  p_store uuid default null, p_date date default null,
  p_subscription text default null, p_proof boolean default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  role_name text;
  entry public.bonus_entries;
  receipt public.doordash_mutations;
  fingerprint text;
begin
  select role into role_name from public.workspace_members where user_id = actor;
  if actor is null or role_name is null then
    raise exception using errcode = '42501', message = 'Workspace access required';
  end if;
  if p_operation is null or p_id is null or p_action is null or p_action not in ('edit', 'delete')
    or p_version is null or p_version < 0 then
    raise exception using errcode = '22023', message = 'Invalid DoorDash change';
  end if;
  if p_action = 'delete' and (p_store is not null or p_date is not null or p_subscription is not null or p_proof is not null) then
    raise exception using errcode = '22023', message = 'Deletion must not include replacement fields';
  end if;
  -- SHA-256 binds a retry without retaining the subscription number in the receipt.
  fingerprint := encode(sha256(convert_to(jsonb_build_object('version', p_version, 'store', p_store,
    'date', p_date, 'subscription', btrim(p_subscription), 'proof', p_proof)::text, 'UTF8')), 'hex');
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_operation::text, 1));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_id::text, 0));
  select * into receipt from public.doordash_mutations where id = p_operation;
  if found then
    if receipt.actor_id <> actor or receipt.record_id <> p_id or receipt.action <> p_action
      or receipt.request_fingerprint <> fingerprint then
      raise exception using errcode = '23505', message = 'Change reference conflicts';
    end if;
    if receipt.owner_id <> actor and role_name <> 'manager' then
      raise exception using errcode = '42501', message = 'DoorDash access denied';
    end if;
    return jsonb_build_object('id', p_id, 'operation_id', p_operation, 'action', p_action, 'complete', true);
  end if;
  select * into entry from public.bonus_entries where id = p_id and kind = 'doordash' for update;
  if not found then raise exception using errcode = 'P0002', message = 'DoorDash entry is no longer available'; end if;
  if entry.owner_id <> actor and role_name <> 'manager' then
    raise exception using errcode = '42501', message = 'DoorDash access denied';
  end if;
  if entry.doordash_version <> p_version then
    raise exception using errcode = '40001', message = 'DoorDash entry changed; reload it';
  end if;
  if p_action = 'edit' then
    if p_store is null or not exists (select 1 from public.tracker_stores where id = p_store)
      or p_date is null or p_subscription is null or length(btrim(p_subscription)) not between 1 and 120 or p_proof is null then
      raise exception using errcode = '22023', message = 'Check the DoorDash fields';
    end if;
    update public.bonus_entries set store_id = p_store, work_date = p_date,
      subscription_number = btrim(p_subscription), dd_proof_added = p_proof,
      doordash_version = doordash_version + 1 where id = p_id;
  else
    delete from public.bonus_entries where id = p_id;
  end if;
  insert into public.doordash_mutations(id, record_id, actor_id, owner_id, action, request_fingerprint,
    previous_version, old_store_id, old_work_date, new_store_id, new_work_date)
  values (p_operation, p_id, actor, entry.owner_id, p_action, fingerprint, entry.doordash_version,
    entry.store_id, entry.work_date, case when p_action = 'edit' then p_store end, case when p_action = 'edit' then p_date end);
  return jsonb_build_object('id', p_id, 'operation_id', p_operation, 'action', p_action, 'complete', true);
end;
$$;
revoke all on function public.manage_doordash(uuid, uuid, text, integer, uuid, date, text, boolean) from public, anon;
grant execute on function public.manage_doordash(uuid, uuid, text, integer, uuid, date, text, boolean) to authenticated;

commit;
