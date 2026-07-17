-- schema-ready-flag.sql
-- Adds a per-team "ready" flag so the organizer can mark teams present before
-- the tournament starts. In Swiss mode, Round 1 matches between ready teams are
-- scheduled in the earliest waves (see seedRound1 in tournament-engine.ts).
--
-- Apply AFTER the other schema files:
--   schema.sql -> schema-tournament.sql -> schema-demo.sql -> schema-set-scoring.sql
--   -> schema-set-rule.sql -> fix-duplicate-matches.sql -> fix-admin-insert.sql
--   -> schema-ready-flag.sql
--
-- Idempotent + additive: safe to run more than once.

alter table teams add column if not exists ready boolean not null default false;
