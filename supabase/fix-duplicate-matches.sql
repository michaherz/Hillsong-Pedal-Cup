-- ============================================================
-- Padel Cup MUC — Duplicate-match Cleanup + Unique Constraint
-- Run in Supabase Studio → SQL Editor → Run.
-- Idempotent.
-- ============================================================

-- 1) Delete duplicates already in the DB. Keeps oldest per slot.
delete from matches
  where id in (
    select id from (
      select id,
        row_number() over (
          partition by phase, round, court, wave
          order by created_at
        ) as rn
      from matches
      where phase = 'mexicano'
    ) sub
    where rn > 1
  );

-- Same cleanup for KO duplicates per bracket slot.
delete from matches
  where id in (
    select id from (
      select id,
        row_number() over (
          partition by phase, bracket_pos
          order by created_at
        ) as rn
      from matches
      where phase = 'knockout' and bracket_pos is not null
    ) sub
    where rn > 1
  );

-- 2) Hard guard: no two mexicano matches can share the same (round, court, wave).
create unique index if not exists matches_unique_mexicano_slot
  on matches (round, court, wave)
  where phase = 'mexicano';

-- Hard guard: only one match per KO slot (sf1, sf2, final, third).
create unique index if not exists matches_unique_ko_slot
  on matches (bracket_pos)
  where phase = 'knockout' and bracket_pos is not null;
