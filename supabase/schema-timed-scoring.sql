-- ============================================================
-- Timed-Scoring Migration (Padel Cup 2026)
-- Fuehrt einen zeitbasierten Scoring-Modus ein: Matches enden
-- am Buzzer (feste Spielzeit) statt beim Erreichen eines Satz-
-- ziels. Speichert einen Start-Zeitstempel pro Match, damit der
-- Countdown ueber alle Geraete (Scorer-Phone + Beamer) synchron
-- laeuft (remaining = match_minutes - (now - timer_started_at)).
--
-- REIHENFOLGE: Diese Datei NACH schema-box-league.sql einspielen.
--   ... -> fix-admin-insert.sql -> schema-box-league.sql ->
--   schema-timed-scoring.sql (diese Datei, zuletzt)
--
-- Idempotent + additiv: kann mehrfach ausgefuehrt werden, aendert
-- keine bestehenden Spalten/Daten.
-- ============================================================

-- ---------- SETTINGS: Scoring-Modus ----------
-- 'sets'  = klassisch, Match endet beim Satzziel (bestehendes Verhalten, Default)
-- 'timed' = auf Zeit, Match laeuft bis match_minutes abgelaufen sind
alter table settings
  add column if not exists scoring_mode text not null default 'sets'
    check (scoring_mode in ('sets', 'timed'));

-- ---------- SETTINGS: Match-Laenge in Minuten ----------
-- Nur relevant im 'timed'-Modus. Default 14 Minuten (Swiss, 4 Runden).
alter table settings
  add column if not exists match_minutes int not null default 14
    check (match_minutes between 1 and 90);

-- ---------- MATCHES: Timer-Startzeitpunkt ----------
-- NULL = Timer noch nicht gestartet. Gesetzt = Countdown laeuft
-- (synchron ueber alle Clients). Nur im 'timed'-Modus genutzt.
alter table matches
  add column if not exists timer_started_at timestamptz;

-- ---------- Startwerte fuer dieses Turnier ----------
-- 14-Min-Matches + 4 Runden (Swiss). Im Admin jederzeit aenderbar.
update settings
  set match_minutes = 14,
      rounds_per_team = 4
  where id = 1;
