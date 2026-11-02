begin;

create table public.workspace_members (
  user_id uuid primary key references auth.users(id),
  role text not null check (role in ('employee', 'manager'))
);

alter table public.workspace_members enable row level security;

revoke all on public.workspace_members from public, anon, authenticated;
grant select on public.workspace_members to authenticated;
grant all on public.workspace_members to service_role;

create policy "Members can read their own role"
  on public.workspace_members
  for select
  to authenticated
  using (user_id = (select auth.uid()));

comment on table public.workspace_members is
  'Owner-assigned workspace access. No browser role assignment or automatic enrollment.';

commit;
