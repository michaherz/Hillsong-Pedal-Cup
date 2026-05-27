-- Padel Cup MUC — Tournament Schema Additions
-- Run this AFTER schema.sql in Supabase Studio → SQL Editor → New Query → Run
-- Idempotent: safe to re-run.

-- settings: phase + round counter + court count
alter table settings
  add column if not exists tournament_phase text not null default 'registration'
    check (tournament_phase in ('registration', 'mexicano', 'knockout', 'finished'));
alter table settings
  add column if not exists current_round int not null default 0;
alter table settings
  add column if not exists total_courts int not null default 2;

-- matches: phase + wave + KO bracket position
alter table matches
  add column if not exists phase text not null default 'mexicano'
    check (phase in ('mexicano', 'knockout'));
alter table matches
  add column if not exists wave int;
alter table matches
  add column if not exists bracket_pos text
    check (bracket_pos in ('sf1', 'sf2', 'final', 'third'));

create index if not exists matches_round_wave_idx on matches (round, wave, court);
create index if not exists matches_phase_idx on matches (phase, status);
