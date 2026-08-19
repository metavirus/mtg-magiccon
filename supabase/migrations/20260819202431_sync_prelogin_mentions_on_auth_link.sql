-- First login must complete the preconfigured companion identity in one
-- transaction. Mentions may already exist for the person's stable key before
-- Supabase creates their auth UUID, so hydrate those targets while linking.
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

  with linked_companion as (
    update public.companion_members
    set user_id = new.id,
        updated_at = timezone('utc', now())
    where active
      and auth_email is not null
      and auth_email = lower(new.email)
    returning person_key
  )
  update public.note_mentions
  set mentioned_user_id = new.id
  from linked_companion
  where public.note_mentions.mentioned_person_key = linked_companion.person_key
    and public.note_mentions.mentioned_user_id is distinct from new.id;

  return new;
end;
$$;

revoke all on function public.link_companion_auth_user() from public, anon, authenticated;

-- Repair any historical mention whose companion is already linked. This also
-- fixes a pre-existing unresolved Chris mention discovered by the audit.
update public.note_mentions
set mentioned_user_id = public.companion_members.user_id
from public.companion_members
where public.companion_members.active
  and public.companion_members.user_id is not null
  and public.note_mentions.mentioned_person_key = public.companion_members.person_key
  and public.note_mentions.mentioned_user_id is distinct from public.companion_members.user_id;
