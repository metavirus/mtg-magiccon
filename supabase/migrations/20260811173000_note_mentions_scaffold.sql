create table if not exists public.note_mentions (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.personal_notes (id) on delete cascade,
  note_owner_id uuid not null references auth.users (id) on delete cascade,
  mentioned_person_key text not null references public.companion_members (person_key) on delete restrict,
  mentioned_user_id uuid references auth.users (id) on delete set null,
  mention_token text not null,
  dismissed_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint note_mentions_token_length check (char_length(mention_token) between 2 and 80),
  constraint note_mentions_unique_note_person unique (note_id, mentioned_person_key)
);

comment on table public.note_mentions is 'Mention-ready collaboration scaffold for universal contextual notes. One row per mentioned companion member on a note.';
comment on column public.note_mentions.dismissed_at is 'User-level dismissal hook for future mention inbox/filtering.';
comment on column public.note_mentions.last_seen_at is 'User-level acknowledgement hook for future mention unread/read behavior.';

create index if not exists note_mentions_owner_created_idx
  on public.note_mentions (note_owner_id, created_at desc);

create index if not exists note_mentions_target_active_idx
  on public.note_mentions (mentioned_user_id, dismissed_at, created_at desc);

update public.note_mentions
set
  mentioned_user_id = companion_members.user_id,
  updated_at = timezone('utc', now())
from public.companion_members
where public.note_mentions.mentioned_person_key = companion_members.person_key
  and public.note_mentions.mentioned_user_id is distinct from companion_members.user_id;

alter table public.note_mentions enable row level security;
alter table public.note_mentions force row level security;

revoke all on table public.note_mentions from public, anon, authenticated;
grant select, insert, update, delete on table public.note_mentions to authenticated;

drop policy if exists "note_mentions_select_owner_or_target" on public.note_mentions;
create policy "note_mentions_select_owner_or_target"
  on public.note_mentions
  for select
  to authenticated
  using (
    note_owner_id = auth.uid()
    or mentioned_user_id = auth.uid()
  );

drop policy if exists "note_mentions_insert_owner" on public.note_mentions;
create policy "note_mentions_insert_owner"
  on public.note_mentions
  for insert
  to authenticated
  with check (
    note_owner_id = auth.uid()
    and exists (
      select 1
      from public.personal_notes
      where personal_notes.id = note_mentions.note_id
        and personal_notes.owner_id = auth.uid()
    )
  );

drop policy if exists "note_mentions_update_owner_or_target" on public.note_mentions;
create policy "note_mentions_update_owner_or_target"
  on public.note_mentions
  for update
  to authenticated
  using (
    note_owner_id = auth.uid()
    or mentioned_user_id = auth.uid()
  )
  with check (
    note_owner_id = auth.uid()
    or mentioned_user_id = auth.uid()
  );

drop policy if exists "note_mentions_delete_owner" on public.note_mentions;
create policy "note_mentions_delete_owner"
  on public.note_mentions
  for delete
  to authenticated
  using (note_owner_id = auth.uid());
