-- Link only a confirmed, pre-authorized companion email. This keeps first
-- Google login automatic without making an unconfirmed auth identity a
-- collaborator or exposing the privileged trigger function as an API.
create or replace function public.link_companion_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null or new.email_confirmed_at is null then
    return new;
  end if;

  update public.companion_members
  set user_id = new.id,
      updated_at = timezone('utc', now())
  where active
    and auth_email is not null
    and auth_email = lower(new.email);

  return new;
end;
$$;

revoke all on function public.link_companion_auth_user() from public, anon, authenticated;

drop trigger if exists link_companion_auth_user_on_auth_change on auth.users;
create trigger link_companion_auth_user_on_auth_change
after insert or update of email, email_confirmed_at on auth.users
for each row execute function public.link_companion_auth_user();

-- Reconcile any already-confirmed known companion without waiting for a new
-- auth event. Juan remains pre-authorized by email until his first login.
update public.companion_members
set user_id = auth.users.id,
    updated_at = timezone('utc', now())
from auth.users
where public.companion_members.active
  and public.companion_members.auth_email is not null
  and auth.users.email_confirmed_at is not null
  and lower(auth.users.email) = public.companion_members.auth_email;
