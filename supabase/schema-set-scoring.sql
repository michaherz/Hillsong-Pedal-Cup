-- Padel Cup MUC — Set-Scoring Schema
-- Run AFTER schema.sql + schema-tournament.sql + schema-demo.sql.
-- Idempotent: safe to re-run.

-- best_of decides whether a match needs 1 or 2 sets won.
-- Mexicano + KO-Halbfinale = 1; Finale + 3.Platz = 3.
alter table matches
  add column if not exists best_of int not null default 1
    check (best_of in (1, 3));

-- Completed sets in chronological order: [{a:6, b:3}, {a:4, b:6}, ...]
alter table matches
  add column if not exists set_history jsonb not null default '[]'::jsonb;

-- Games in the currently-running set.
alter table matches
  add column if not exists current_a int not null default 0;
alter table matches
  add column if not exists current_b int not null default 0;

-- Sets won so far (denormalized from set_history for fast reads).
alter table matches
  add column if not exists sets_a int not null default 0;
alter table matches
  add column if not exists sets_b int not null default 0;

-- score_a / score_b stay as denormalized total games-for / games-against
-- (sum of all set games incl. current set), used by computeStandings.
-- They are written by the engine on every game-bump + on match-done.

create index if not exists matches_status_phase_idx on matches (status, phase);

-- Backfill: any done match without set_history → treat existing score as one
-- completed set so the new UI/standings keep working.
update matches
  set
    set_history = jsonb_build_array(jsonb_build_object('a', score_a, 'b', score_b)),
    sets_a = case when score_a > score_b then 1 else 0 end,
    sets_b = case when score_b > score_a then 1 else 0 end
  where status = 'done'
    and set_history = '[]'::jsonb
    and score_a is not null
    and score_b is not null;
