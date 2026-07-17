-- ============================================================
-- Box-Liga Migration (Padel Cup 2026)
-- Fuehrt das neue Format ein: 2 Divisionen, feste Runden,
-- Spassspiele (nicht wertend), Walkover, editierbare Matches,
-- sowie Laufzeit-Konfig (Kosten / Plaetze / Runden) in settings.
--
-- REIHENFOLGE: Diese Datei ZULETZT einspielen, nach:
--   schema.sql -> schema-tournament.sql -> schema-demo.sql ->
--   schema-set-scoring.sql -> schema-set-rule.sql ->
--   fix-duplicate-matches.sql -> fix-admin-insert.sql
--
-- Idempotent: kann mehrfach ausgefuehrt werden.
-- ============================================================

-- ---------- TEAMS: Division ----------
-- 'ober' | 'unter' | NULL (NULL = noch nicht zugeteilt / auto nach Skill)
alter table teams
  add column if not exists division text
    check (division is null or division in ('ober', 'unter'));

-- ---------- MATCHES: neue Felder ----------
-- Division der Partie (NULL erlaubt, z.B. divisionsuebergreifendes Spassspiel)
alter table matches
  add column if not exists division text
    check (division is null or division in ('ober', 'unter'));

-- Spassspiel: zaehlt NICHT fuer die Tabelle
alter table matches
  add column if not exists is_fun boolean not null default false;

-- Walkover: Gegner kommt kampflos weiter (z.B. No-Show)
alter table matches
  add column if not exists is_walkover boolean not null default false;

-- ---------- MATCHES: phase um 'league' + 'final' erweitern ----------
-- Alte Werte ('mexicano','knockout') bleiben erlaubt, damit bestehende
-- Zeilen / Alt-Daten nicht brechen.
alter table matches drop constraint if exists matches_phase_check;
alter table matches
  add constraint matches_phase_check
  check (phase in ('mexicano', 'knockout', 'league', 'final'));

-- bracket_pos: Divisions-Finals nutzen 'final' | 'third' (bereits erlaubt,
-- hier defensiv sicherstellen).
alter table matches drop constraint if exists matches_bracket_pos_check;
alter table matches
  add constraint matches_bracket_pos_check
  check (bracket_pos is null or bracket_pos in ('sf1', 'sf2', 'final', 'third'));

-- ---------- Unique-Index: pro Division nur EIN Final / Spiel-um-3 ----------
-- (verhindert doppeltes Anlegen der Finals; ersetzt fuer 'final' den alten
--  KO-Index, der bracket_pos allein einmalig machte -> waere bei 2 Divisionen
--  kollidiert.)
drop index if exists matches_unique_final_slot;
create unique index matches_unique_final_slot
  on matches (division, bracket_pos)
  where phase = 'final' and bracket_pos is not null;

-- HINWEIS: Fuer die Gruppenphase ('league') gibt es BEWUSST keinen harten
-- Unique-Index auf (court, wave) -- der Match-Editor muss Partien frei
-- zwischen Slots/Plaetzen verschieben und tauschen koennen. Doppel-Generierung
-- wird auf App-Ebene per Existenz-Check + Lock verhindert.

-- ---------- SETTINGS: Laufzeit-Konfig ----------
-- Gesamtkosten (Startwert 480 EUR fuer 3 Plaetze; im Admin editierbar)
alter table settings
  add column if not exists total_cost numeric not null default 480;

-- Runden je Team in der Gruppenphase
alter table settings
  add column if not exists rounds_per_team int not null default 4
    check (rounds_per_team between 1 and 12);

-- Mindestpause zwischen zwei eigenen Spielen (in Slots)
alter table settings
  add column if not exists min_rest_slots int not null default 2
    check (min_rest_slots between 0 and 5);

-- Optional editierbar am Event-Tag (falls sich Datum/Startzeit aendert).
-- Bleiben NULL -> App faellt auf die Konstante in tournament.ts zurueck.
alter table settings
  add column if not exists event_date text;      -- Format 'YYYY-MM-DD'
alter table settings
  add column if not exists start_time text;       -- Format 'HH:MM'

-- 'league' als gueltige Phase (settings.tournament_phase-Check erweitern)
alter table settings drop constraint if exists settings_tournament_phase_check;
alter table settings
  add constraint settings_tournament_phase_check
  check (tournament_phase in
    ('registration', 'mexicano', 'knockout', 'league', 'final', 'finished'));

-- ---------- SETTINGS: Turniermodus + Public-Sichtbarkeit ----------
-- Turniermodus: 'box' (Box-Liga, Default) oder 'swiss' (Swiss/Mexicano-Format).
-- Nur waehrend der Registrierung umstellbar (App-seitig erzwungen).
alter table settings
  add column if not exists tournament_mode text not null default 'box'
    check (tournament_mode in ('box', 'swiss'));

-- Public-Sichtbarkeit: false (Default) = auf der Public-Seite werden nur
-- Anmeldung/Info/Venue/Team-Liste gezeigt, KEIN Turnier/LiveBoard/Tabelle.
-- true = alles oeffentlich sichtbar.
alter table settings
  add column if not exists public_live boolean not null default false;

-- ---------- Neue Standard-Werte fuer dieses Turnier ----------
-- 3 Plaetze + 480 EUR als Startpunkt (im Admin jederzeit aenderbar).
update settings
  set total_courts = 3,
      total_cost   = 480,
      rounds_per_team = 4,
      min_rest_slots  = 2
  where id = 1;

-- ============================================================
-- Fertig. RLS bleibt unveraendert:
--  - authenticated (Admin) darf teams/matches/settings voll bearbeiten
--    -> deckt Withdraw (UPDATE status), Match-Editor (UPDATE/INSERT/DELETE
--       matches) und Konfig (UPDATE settings) bereits ab.
-- ============================================================
