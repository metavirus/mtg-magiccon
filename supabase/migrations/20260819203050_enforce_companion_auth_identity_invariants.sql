-- A pre-authorized email identifies exactly one companion. Without this
-- invariant, a duplicate configuration could make first-login linkage fail on
-- the unique user_id constraint.
create unique index if not exists companion_members_auth_email_unique_idx
  on public.companion_members (auth_email)
  where auth_email is not null;

-- First-login hydration joins unresolved mentions through the stable person
-- key. Give that reconciliation path a direct covering index.
create index if not exists note_mentions_person_key_idx
  on public.note_mentions (mentioned_person_key);
