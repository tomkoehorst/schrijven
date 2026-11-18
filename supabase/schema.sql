-- Schrijfkamer: database voor Supabase
-- Plak dit in Supabase → SQL Editor → New query, en klik op Run.

create table if not exists public.sheets (
  id        text primary key,
  user_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  body      text not null default '',
  grp       text not null default 'inbox',
  fav       boolean not null default false,
  trashed   boolean not null default false,
  goal      integer not null default 0,
  created   bigint not null,
  updated   bigint not null
);
create index if not exists sheets_user_idx on public.sheets(user_id);

create table if not exists public.profiles (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  groups  jsonb not null default '[]'::jsonb
);

-- Alleen jij kunt je eigen teksten zien en wijzigen
alter table public.sheets   enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "eigen teksten" on public.sheets;
create policy "eigen teksten" on public.sheets
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "eigen profiel" on public.profiles;
create policy "eigen profiel" on public.profiles
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Toegang voor ingelogde gebruikers (nodig in nieuwere Supabase-projecten)
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.sheets   to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;

-- Live synchroniseren tussen apparaten
do $$ begin
  alter publication supabase_realtime add table public.sheets;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.profiles;
exception when duplicate_object then null; end $$;
