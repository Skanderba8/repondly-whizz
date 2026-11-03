begin;

create or replace function public.manager_employee_roster() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.tracker_is_manager() then
    raise exception 'Manager access required' using errcode = '42501';
  end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'user_id', p.user_id,
      'display_name', p.display_name,
      'report_name', p.report_name,
      'home_store_id', p.home_store_id
    ) order by p.display_name, p.user_id), '[]'::jsonb)
    from public.tracker_people p
    join public.workspace_members m on m.user_id = p.user_id
    where m.role = 'employee' and p.user_id <> auth.uid()
  );
end;
$$;
revoke all on function public.manager_employee_roster() from public,anon;
grant execute on function public.manager_employee_roster() to authenticated;
commit;
