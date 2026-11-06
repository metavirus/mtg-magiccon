create table public.kavimap_beta_release (
  id text primary key check (id = 'current'),
  html text not null
);

alter table public.kavimap_beta_release enable row level security;
alter table public.kavimap_beta_release force row level security;
revoke all on public.kavimap_beta_release from public, anon, authenticated;
grant select (id, html) on public.kavimap_beta_release to authenticated;

create policy "Kavi reads the private map release"
  on public.kavimap_beta_release
  for select to authenticated
  using (
    exists (
      select 1 from public.companion_members
      where person_key = 'kavi' and active and user_id = (select auth.uid())
    )
  );
