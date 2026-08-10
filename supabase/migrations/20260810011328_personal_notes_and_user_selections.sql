begin;

alter table public.personal_notes
  add column if not exists object_id text,
  add column if not exists object_kind text,
  add column if not exists object_title text,
  add column if not exists object_anchor text,
  add column if not exists context text,
  add column if not exists visibility text,
  add column if not exists backlink text,
  add column if not exists author_label text;

update public.personal_notes
set
  object_id = coalesce(object_id, 'general'),
  object_kind = coalesce(object_kind, 'note'),
  object_title = coalesce(object_title, title),
  context = coalesce(context, 'Notes'),
  visibility = coalesce(visibility, 'private'),
  backlink = coalesce(backlink, 'notes'),
  author_label = coalesce(author_label, 'Kavi')
where object_id is null
   or object_kind is null
   or object_title is null
   or context is null
   or visibility is null
   or backlink is null
   or author_label is null;

alter table public.personal_notes
  alter column object_id set not null,
  alter column object_kind set not null,
  alter column object_title set not null,
  alter column context set not null,
  alter column visibility set not null,
  alter column backlink set not null,
  alter column author_label set not null;

alter table public.personal_notes
  drop constraint if exists personal_notes_object_id_length,
  add constraint personal_notes_object_id_length check (char_length(object_id) between 1 and 200),
  drop constraint if exists personal_notes_object_kind_value,
  add constraint personal_notes_object_kind_value check (object_kind = any (array['event','alert','receipt','place','hotel','artist','note']::text[])),
  drop constraint if exists personal_notes_object_title_length,
  add constraint personal_notes_object_title_length check (char_length(object_title) between 1 and 240),
  drop constraint if exists personal_notes_object_anchor_length,
  add constraint personal_notes_object_anchor_length check (object_anchor is null or char_length(object_anchor) between 1 and 160),
  drop constraint if exists personal_notes_context_length,
  add constraint personal_notes_context_length check (char_length(context) between 1 and 240),
  drop constraint if exists personal_notes_visibility_value,
  add constraint personal_notes_visibility_value check (visibility = any (array['private','shared']::text[])),
  drop constraint if exists personal_notes_backlink_length,
  add constraint personal_notes_backlink_length check (char_length(backlink) between 1 and 40),
  drop constraint if exists personal_notes_author_label_length,
  add constraint personal_notes_author_label_length check (char_length(author_label) between 1 and 40);

create index if not exists personal_notes_owner_updated_idx on public.personal_notes (owner_id, updated_at desc);
create index if not exists personal_notes_owner_object_idx on public.personal_notes (owner_id, object_id, object_anchor);

comment on table public.personal_notes is 'Owner-scoped contextual notes attached to app objects; one universal notes layer, not destination-specific note tables.';

create table if not exists public.user_selections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  object_id text not null,
  object_kind text not null,
  selection_key text not null,
  selection_value text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_selections_owner_required check (owner_id is not null),
  constraint user_selections_object_id_length check (char_length(object_id) between 1 and 200),
  constraint user_selections_object_kind_value check (object_kind = any (array['event','alert','receipt','place','hotel','artist','wallet','trip','map','activity','general']::text[])),
  constraint user_selections_key_length check (char_length(selection_key) between 1 and 80),
  constraint user_selections_value_length check (char_length(selection_value) between 0 and 2000),
  constraint user_selections_owner_object_key_unique unique (owner_id, object_id, selection_key)
);

comment on table public.user_selections is 'Owner-scoped durable UI selections such as event interest, hidden/not-for-me, alert review state, wallet counters, and assignment choices.';

alter table public.user_selections enable row level security;
alter table public.user_selections force row level security;

revoke all on table public.user_selections from public, anon, authenticated;
grant select, insert, update, delete on table public.user_selections to authenticated;

drop policy if exists "owners_select_user_selections" on public.user_selections;
create policy "owners_select_user_selections" on public.user_selections
  for select to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists "owners_insert_user_selections" on public.user_selections;
create policy "owners_insert_user_selections" on public.user_selections
  for insert to authenticated
  with check ((select auth.uid()) = owner_id);

drop policy if exists "owners_update_user_selections" on public.user_selections;
create policy "owners_update_user_selections" on public.user_selections
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "owners_delete_user_selections" on public.user_selections;
create policy "owners_delete_user_selections" on public.user_selections
  for delete to authenticated
  using ((select auth.uid()) = owner_id);

create index if not exists user_selections_owner_updated_idx on public.user_selections (owner_id, updated_at desc);
create index if not exists user_selections_owner_kind_idx on public.user_selections (owner_id, object_kind, selection_key);

commit;
