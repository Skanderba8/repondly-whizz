
end;
$$;
revoke all on function public.manager_employee_roster() from public,anon;
grant execute on function public.manager_employee_roster() to authenticated;
commit;
