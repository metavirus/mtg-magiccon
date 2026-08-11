create table if not exists public.companion_members (
  person_key text primary key,
  display_name text not null,
  bubble_label text not null,
  bubble_color text not null,
  badge_tier text not null,
  black_lotus_entitled boolean not null default false,
  relationship_label text not null,
  auth_email text,
  user_id uuid references auth.users (id) on delete set null,
  active boolean not null default true,
  sort_order integer not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint companion_members_person_key_length check (char_length(person_key) between 1 and 40),
  constraint companion_members_display_name_length check (char_length(display_name) between 1 and 80),
  constraint companion_members_bubble_label_length check (char_length(bubble_label) between 1 and 3),
  constraint companion_members_bubble_color_length check (char_length(bubble_color) between 1 and 24),
  constraint companion_members_badge_tier_allowed check (badge_tier in ('black_lotus', 'premium')),
  constraint companion_members_relationship_length check (char_length(relationship_label) between 1 and 120),
  constraint companion_members_auth_email_lower check (auth_email is null or auth_email = lower(auth_email)),
  constraint companion_members_auth_email_length check (auth_email is null or char_length(auth_email) between 3 and 254),
  constraint companion_members_user_id_unique unique (user_id)
);

comment on table public.companion_members is 'Small MagicCon Atlanta companion roster. People are distinct from auth accounts; auth_email/user_id link logged-in users when available.';
comment on column public.companion_members.black_lotus_entitled is 'True only for the normal Black Lotus badge holders. Black Lotus schedule remains visible to all companion members.';

alter table public.companion_members enable row level security;
alter table public.companion_members force row level security;

revoke all on table public.companion_members from public, anon, authenticated;
grant select on table public.companion_members to authenticated;

drop policy if exists "authenticated_select_active_companion_members" on public.companion_members;
create policy "authenticated_select_active_companion_members"
  on public.companion_members
  for select
  to authenticated
  using (active);

insert into public.companion_members (
  person_key,
  display_name,
  bubble_label,
  bubble_color,
  badge_tier,
  black_lotus_entitled,
  relationship_label,
  auth_email,
  sort_order
) values
  ('kavi', 'Kavi', 'Ka', 'blue', 'black_lotus', true, 'owner', 'kavigrace@gmail.com', 10),
  ('chris', 'Chris', 'C', 'purple', 'black_lotus', true, 'Black Lotus companion', null, 20),
  ('juan', 'Juan', 'J', 'green', 'premium', false, 'partner', null, 30),
  ('kyle', 'Kyle', 'Ky', 'amber', 'premium', false, 'Chris friend', null, 40)
on conflict (person_key) do update
set
  display_name = excluded.display_name,
  bubble_label = excluded.bubble_label,
  bubble_color = excluded.bubble_color,
  badge_tier = excluded.badge_tier,
  black_lotus_entitled = excluded.black_lotus_entitled,
  relationship_label = excluded.relationship_label,
  auth_email = excluded.auth_email,
  active = true,
  sort_order = excluded.sort_order,
  updated_at = timezone('utc', now());

update public.companion_members
set user_id = auth.users.id,
    updated_at = timezone('utc', now())
from auth.users
where public.companion_members.auth_email is not null
  and lower(auth.users.email) = public.companion_members.auth_email;
