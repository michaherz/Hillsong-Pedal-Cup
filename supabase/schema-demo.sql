-- Padel Cup MUC — Demo-Mode Schema Additions
-- Run AFTER schema.sql + schema-tournament.sql in Supabase Studio.
-- Idempotent: safe to re-run.

-- demo flag for sandbox / preview teams + their matches
alter table teams
  add column if not exists is_demo boolean not null default false;

alter table matches
  add column if not exists is_demo boolean not null default false;

create index if not exists teams_is_demo_idx on teams (is_demo);
create index if not exists matches_is_demo_idx on matches (is_demo);

-- harden public insert: anon may never set is_demo=true
drop policy if exists "teams_insert_open" on teams;
create policy "teams_insert_open" on teams for insert
  with check (
    (select registration_open from settings where id = 1) = true
    and char_length(team_name) between 2 and 60
    and char_length(player_1) between 2 and 60
    and char_length(player_2) between 2 and 60
    and is_demo = false
  );
