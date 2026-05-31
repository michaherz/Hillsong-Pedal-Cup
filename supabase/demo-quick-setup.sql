-- ============================================================
-- Padel Cup MUC — One-shot Demo Setup
-- Run ONCE in Supabase Studio → SQL Editor → New Query → Run.
-- Idempotent on the migration parts; the seed only runs once.
-- ============================================================

-- 1) Migration: add is_demo flag to teams + matches
alter table teams
  add column if not exists is_demo boolean not null default false;

alter table matches
  add column if not exists is_demo boolean not null default false;

create index if not exists teams_is_demo_idx on teams (is_demo);
create index if not exists matches_is_demo_idx on matches (is_demo);

-- 2) Harden public insert: anon may never set is_demo=true
drop policy if exists "teams_insert_open" on teams;
create policy "teams_insert_open" on teams for insert
  with check (
    (select registration_open from settings where id = 1) = true
    and char_length(team_name) between 2 and 60
    and char_length(player_1) between 2 and 60
    and char_length(player_2) between 2 and 60
    and is_demo = false
  );

-- 3) Seed 10 demo teams (5 beginner, 3 intermediate, 2 advanced)
--    Skip if any demo team already exists.
do $$
begin
  if not exists (select 1 from teams where is_demo = true) then
    insert into teams (team_name, player_1, player_2, skill_level, is_demo) values
      -- Advanced (2)
      ('Smash Brothers',   'Jonas Weber',    'Liam Becker',  'advanced',    true),
      ('Net Ninjas',       'Sofia Lopez',    'Mia Tanaka',   'advanced',    true),
      -- Intermediate (3)
      ('Lob City',         'Felix Hartmann', 'Noah König',   'intermediate', true),
      ('Dropshot Divas',   'Hannah Roth',    'Lara Vogel',   'intermediate', true),
      ('Volley Vibes',     'Tom Richter',    'Paul Wagner',  'intermediate', true),
      -- Beginner (5)
      ('Padel Padawans',   'Anna Schmid',    'Lena Berger',  'beginner',     true),
      ('Rally Rookies',    'Max Frank',      'Ben Auer',     'beginner',     true),
      ('Bandeja Beginners','Klara Stein',    'Mara Pohl',    'beginner',     true),
      ('Glass Wall Heroes','Tim Hofer',      'Jan Reuter',   'beginner',     true),
      ('Slice & Dice',     'Eva Lang',       'Nina Kraus',   'beginner',     true);
  end if;
end $$;

-- 4) Close registration so we can start Mexicano in the admin UI.
update settings set registration_open = false where id = 1;
