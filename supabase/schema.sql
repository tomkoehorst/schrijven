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

-- Schrijfcoach: dagdoel, reeks en sprints (toegevoegd later; veilig om opnieuw te draaien)
alter table public.profiles add column if not exists stats jsonb not null default '{}'::jsonb;

-- Bronnen: bewaarde artikelen, links, Wikipedia-pagina's en citaten
create table if not exists public.sources (
  id        text primary key,
  user_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind      text not null default 'article',
  url       text not null default '',
  title     text not null default '',
  site      text not null default '',
  byline    text not null default '',
  published text not null default '',
  excerpt   text not null default '',
  content   text not null default '',
  tags      jsonb not null default '[]'::jsonb,
  note      text not null default '',
  fav       boolean not null default false,
  created   bigint not null,
  updated   bigint not null
);
create index if not exists sources_user_idx on public.sources(user_id);
alter table public.sources enable row level security;
drop policy if exists "eigen bronnen" on public.sources;
create policy "eigen bronnen" on public.sources
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.sources to authenticated;
do $$ begin
  alter publication supabase_realtime add table public.sources;
exception when duplicate_object then null; end $$;

-- Fragmenten: stukken uit bronnen en losse gedachten (braindump en tijdlijn)
create table if not exists public.snippets (
  id        text primary key,
  user_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  source_id text not null default '',
  text      text not null default '',
  note      text not null default '',
  tags      jsonb not null default '[]'::jsonb,
  date      text not null default '',
  color     text not null default '',
  created   bigint not null,
  updated   bigint not null
);
create index if not exists snippets_user_idx on public.snippets(user_id);
alter table public.snippets enable row level security;
drop policy if exists "eigen fragmenten" on public.snippets;
create policy "eigen fragmenten" on public.snippets
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.snippets to authenticated;
do $$ begin
  alter publication supabase_realtime add table public.snippets;
exception when duplicate_object then null; end $$;

-- Projecten: bronnen en fragmenten koppelen aan een groep
alter table public.sources  add column if not exists grp text not null default '';
alter table public.snippets add column if not exists grp text not null default '';
