-- Padel Cup MUC — Fix: allow authenticated admins to insert teams (incl. is_demo=true)
-- The previous tightening only kept the public/anon insert policy, which forbids is_demo=true.
-- This adds a parallel policy for authenticated users.
-- Idempotent: safe to re-run.

drop policy if exists "teams_admin_insert" on teams;
create policy "teams_admin_insert" on teams for insert
  with check (auth.role() = 'authenticated');
