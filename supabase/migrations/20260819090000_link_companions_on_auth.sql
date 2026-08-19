-- Pre-authorize known companions by email, then bind their roster row as soon
-- as Google Auth creates or refreshes the matching auth.users record.
update public.companion_members
set auth_email = 'kylewmandell@gmail.com',
    updated_at = timezone('utc', now())
where person_key = 'kyle';

create or replace function public.link_companion_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  update public.companion_members
  set user_id = new.id,
      updated_at = timezone('utc', now())
  where auth_email is not null
    and auth_email = lower(new.email);
  return new;
end;
$$;

revoke all on function public.link_companion_auth_user() from public, anon, authenticated;

drop trigger if exists link_companion_auth_user_on_auth_change on auth.users;
create trigger link_companion_auth_user_on_auth_change
after insert or update of email on auth.users
for each row execute function public.link_companion_auth_user();

update public.companion_members
set user_id = auth.users.id,
    updated_at = timezone('utc', now())
from auth.users
where public.companion_members.auth_email is not null
  and lower(auth.users.email) = public.companion_members.auth_email;
