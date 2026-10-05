-- Secret "preview link" that lets vendors/testers browse the storefront while
-- maintenance mode is on (like a WordPress unpublished preview). The token is
-- never readable by the public: visitors can only ask "is this token valid?".
create table if not exists public.maintenance_preview (
  id boolean primary key default true,
  token text not null,
  updated_at timestamptz not null default now(),
  constraint maintenance_preview_singleton check (id)
);

alter table public.maintenance_preview enable row level security;
-- No policies: only the security-definer functions below can touch it.

insert into public.maintenance_preview (id, token)
values (true, replace(gen_random_uuid()::text, '-', ''))
on conflict (id) do nothing;

create or replace function public.is_valid_preview_token(candidate text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.maintenance_preview
    where length(coalesce(candidate, '')) >= 16 and token = candidate
  );
$$;

create or replace function public.get_preview_token()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select token from public.maintenance_preview where public.is_admin(auth.uid());
$$;

create or replace function public.regenerate_preview_token()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_token text;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Only admins can regenerate the preview link';
  end if;
  new_token := replace(gen_random_uuid()::text, '-', '');
  update public.maintenance_preview set token = new_token, updated_at = now() where id;
  return new_token;
end;
$$;

revoke all on function public.is_valid_preview_token(text) from public;
revoke all on function public.get_preview_token() from public;
revoke all on function public.regenerate_preview_token() from public;
grant execute on function public.is_valid_preview_token(text) to anon, authenticated;
grant execute on function public.get_preview_token() to authenticated;
grant execute on function public.regenerate_preview_token() to authenticated;
