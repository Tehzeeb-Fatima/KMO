-- Lets an admin grant the new "Loyalty" section to a staff user.
do $$
declare
  d text;
begin
  select pg_get_functiondef('public.admin_set_user_role(uuid, public.user_role, text[])'::regprocedure) into d;
  if position('''loyalty''' in d) = 0 then
    d := replace(d, '''audit-log'', ''settings''', '''audit-log'', ''settings'', ''loyalty''');
    execute d;
  end if;
end;
$$;
