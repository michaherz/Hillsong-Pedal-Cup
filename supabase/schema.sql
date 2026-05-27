-- Padel Cup MUC — Supabase Schema
-- Run this once in Supabase Studio → SQL Editor → New Query → Run

create extension if not exists "uuid-ossp";

-- enums
do $$ begin
  create type skill_level as enum ('beginner', 'intermediate', 'advanced');
exception when duplicate_object then null; end $$;

do $$ begin
  create type team_status as enum ('active', 'withdrawn');
exception when duplicate_object then null; end $$;

do $$ begin
  create type match_status as enum ('scheduled', 'in_progress', 'done');
exception when duplicate_object then null; end $$;

-- teams
create table if not exists teams (
  id uuid primary key default uuid_generate_v4(),
  team_name text not null,
  player_1 text not null,
  player_2 text not null,
  skill_level skill_level not null default 'intermediate',
  status team_status not null default 'active',
  created_at timestamptz not null default now()
);
create index if not exists teams_created_at_idx on teams (created_at desc);

-- matches
create table if not exists matches (
  id uuid primary key default uuid_generate_v4(),
  round int not null default 1,
  court int not null,
  team_a_id uuid references teams(id) on delete set null,
  team_b_id uuid references teams(id) on delete set null,
  score_a int,
  score_b int,
  status match_status not null default 'scheduled',
  played_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists matches_round_court_idx on matches (round, court);

-- settings (single row, id=1)
create table if not exists settings (
  id int primary key default 1 check (id = 1),
  registration_open boolean not null default true,
  tournament_format text,
  updated_at timestamptz not null default now()
);
insert into settings (id) values (1) on conflict do nothing;

-- realtime publication
alter publication supabase_realtime add table teams;
alter publication supabase_realtime add table matches;
alter publication supabase_realtime add table settings;

-- RLS
alter table teams enable row level security;
alter table matches enable row level security;
alter table settings enable row level security;

-- everyone can read
drop policy if exists "teams_select_all" on teams;
create policy "teams_select_all" on teams for select using (true);
drop policy if exists "matches_select_all" on matches;
create policy "matches_select_all" on matches for select using (true);
drop policy if exists "settings_select_all" on settings;
create policy "settings_select_all" on settings for select using (true);

-- public can insert teams only while registration is open
drop policy if exists "teams_insert_open" on teams;
create policy "teams_insert_open" on teams for insert
  with check (
    (select registration_open from settings where id = 1) = true
    and char_length(team_name) between 2 and 60
    and char_length(player_1) between 2 and 60
    and char_length(player_2) between 2 and 60
  );

-- admin (= signed-in user) can do everything else
drop policy if exists "teams_admin_update" on teams;
create policy "teams_admin_update" on teams for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
drop policy if exists "teams_admin_delete" on teams;
create policy "teams_admin_delete" on teams for delete
  using (auth.role() = 'authenticated');

drop policy if exists "matches_admin_all" on matches;
create policy "matches_admin_all" on matches for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "settings_admin_update" on settings;
create policy "settings_admin_update" on settings for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- update updated_at on settings
create or replace function bump_settings_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists settings_bump_updated_at on settings;
create trigger settings_bump_updated_at
  before update on settings
  for each row execute function bump_settings_updated_at();
