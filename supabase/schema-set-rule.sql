-- Padel Cup MUC — Configurable Set Rule
-- Run AFTER schema-set-scoring.sql in Supabase Studio.
-- Idempotent.

alter table settings
  add column if not exists set_target int not null default 6
    check (set_target between 3 and 9);

alter table settings
  add column if not exists set_two_game_lead boolean not null default true;
