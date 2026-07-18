# Padel Cup 2026 — Project Context

Path: `/Users/michaherz/Desktop/Apps/padel-cup/`
Repo: `git@github.com:michaherz/Hillsong-Pedal-Cup.git`
Live: `https://hillsong-pedal-cup.vercel.app`
Stack: Vite + React + TS + Tailwind + Supabase (DB+Realtime+Auth) + Vercel + **pnpm** (siehe `feedback_vercel_pnpm.md`)
Sister: `football-cup` — selbe Supabase-Instanz, `fb_`-Präfix-Tabellen, gegenseitig via `SisterCupLink`.

## Zweck

One-time public Anmeldung + live-scoring für Hillsong Padel Cup, **18.07.2026 16:00**, Casa Padel Pineapple Park München. **3 Plätze, ~18 Teams.** DE/EN.

## Routes

- `/` Public — Hero, Anmeldeformular, Cost-Live-Block, LiveBoard, Teams, Tournament, Info, Venue. **Gated:** Turnierdaten (Plan/Tabelle/Board) nur sichtbar wenn `settings.public_live=true` UND Phase≠registration; sonst nur Anmeldung/Info. `is_demo` immer aus Public gefiltert.
- `/score` Admin — PIN-Gate, Team-CRUD, Config-Cards, Tournament-Panel, Danger-Zone (Reset), Links zu `/poster` + `/timer`
- `/timer` — **Ansager-Screen** (Boombox-iPad): großer Countdown, Minuten live einstellbar (→ settings.match_minutes), 5s-Vorlauf nach Start-Pfiff, Audio-Cues, Cheer/Ansage-Buttons
- `/print/turniermodus` · `/poster` (Beamer, MeshGradient + 2 QRs)

## Sandbox

- `pnpm run build` ✅ · `pnpm run dev` ❌ · `git push` ❌ → User aus normalem Terminal (Deploy = build+commit+push, Vercel auto)

## Datenarchitektur

```
Browser (Spieler / iPad) ─► Supabase REST + Realtime
RLS: anon INSERT teams nur wenn settings.registration_open=true
     authenticated UPDATE/DELETE/Match-Writes
     SELECT public
```

**Region:** EU-West (Irland). **Schema-Files** in `supabase/` in dieser Reihenfolge: `schema.sql` → `schema-tournament.sql` → `schema-demo.sql` → `schema-set-scoring.sql` → `schema-set-rule.sql` → `fix-duplicate-matches.sql` → `fix-admin-insert.sql` → **`schema-box-league.sql`** → **`schema-timed-scoring.sql`** → **`schema-ready-flag.sql`**. Migrationen additiv/idempotent; User spielt sie im Supabase SQL-Editor ein.

## Turnier-Format (2 Modi, umschaltbar via `settings.tournament_mode`, nur in Phase registration)

**Box-Liga** (`box`): 2 Divisionen nach Skill (Ober/Unter, im Admin nachjustierbar), fester ausgewogener Spielplan (`generateLeagueSchedule`: circulant-Paarungen + Backtracking-Packing + Spaßspiele füllen leere Court-Zellen), `rounds_per_team` Spiele/Team, Mindestpause `min_rest_slots`. Phasen: league→final→finished. Finals pro Division (1v2 + Platz 3, BO1). Standings pro Division.

**Swiss** (`swiss`, aktuell bevorzugt): ein Pool, R1 skill-seeded + **ready-Teams zuerst** (`seedRound1` reordert nach `teams.ready`), ab R2 standings-paired (Sieger vs Sieger), `rounds_per_team` Runden, dann Top-4-KO (Halbfinale + Finale + Platz 3). Phasen nutzen `mexicano`(=Gruppe)/`knockout`. Standings single-pool.

**Scoring** (`settings.scoring_mode`): `sets` (erster bei `set_target` 4/5/6 Games) ODER **`timed`** (Match läuft `match_minutes`, am Buzzer zählt der Stand; Gleichstand Gruppe=Remis 1/1, KO=Golden Game). Im Zeit-Modus sind ALLE Matches inkl. Finals BO1. `matches.timer_started_at` = synchroner Countdown über Geräte.

## Event-Tag-Flexibilität (alles im Admin, kein Rebuild)
- **Config-Cards** (Score.tsx): PriceCard (`total_cost`, eigener Speichern-Button, sofort public), TournamentConfigCard (`total_courts`/`rounds_per_team`/`min_rest_slots`/`event_date`/`start_time`), ModeAndVisibilityCard (mode + `public_live`), SetRuleCard (scoring_mode + set_target/match_minutes)
- **Team-CRUD:** Soft-**Withdraw** (status=withdrawn, reversibel; Matches→Walkover, Spaßspiele weg) statt Hard-Delete (nur in registration); **Division**-Zuteilung; **Ready**-Toggle (Runde-1-Reihenfolge, Swiss)
- **MatchEditor.tsx:** Paarung tauschen, Platz/Slot/Zeit, Walkover, Match neu/löschen
- **Reset** (`resetTournament` in demo-mode.ts): löscht alle Matches, Phase→registration, reaktiviert withdrawn, leert division + ready. Teams/Anmeldungen bleiben.
- Datum/Uhrzeit: `settings.event_date`/`start_time` überschreiben die Konstante in `tournament.ts` (Countdown+Hero lesen Settings mit Fallback)

## Ansager-Screen (`/timer`, AnnouncerTimer.tsx)
Floor-Uhr fürs Boombox-iPad. Start→Pfiff→**5s Vorlauf**→Matchzeit. Auto-Cues: Halbzeit (bei match_minutes/2), „Noch 2 Min", Ende (Pfiff→zufällige End-Ansage). **Audio = EIN wiederverwendetes `<audio>`-Element** (src-Swap; erster Start-Pfiff schaltet iOS frei — KEIN Web-Audio, kein Priming-Blast). mp3s/wav in `public/audio/`. Toggles: Ton an/aus, End-Ansage an/aus (dann nur Pfiff). Manuelle Buttons: 4 Ansagen + 3 Cheers.

## Set-Scoring + Auto-Advance

`scoring.ts` Pure-Helper (`bumpGame`, `bumpGameTimed`, `finalizeTimedMatch`, `startMatchTimer`, `buildFinalScore`, `applyScoringUpdate`). LiveScoringModal: Sets-Tabs ODER Timer-Bar (je scoring_mode) + „vorzeitig beenden"-Button. TournamentPanel dispatcht Box/Swiss, `advancingRef`-Lock advanced automatisch.

**Race-Guard:** unique indexes `matches_unique_mexicano_slot` (Swiss) / `matches_unique_ko_slot` / `matches_unique_final_slot` (Box, `(division,bracket_pos)`), Code behandelt `23505` als no-op. Realtime-Hooks dedupen nach `id`. League-Gruppenphase bewusst OHNE harten Slot-Index (Match-Editor braucht freie Umsortierung).

## Design-System (2026-05-28)

Editorial Sports Magazine Dark Mode, „Velocity"-Style.
- BG `#131313`, Primary `#93ccff` (cyan), Secondary `#4edea3` (mint), Tertiary `#ffb869`
- Anton (display caps), Hanken Grotesk (body), Space Mono (labels)
- Hard-Shadows (8px 8px 0 primary), Marquees, Bento-Grid, scharfe Borders (radius 0)
- Tokens: `tailwind.config.js` · Komponenten-Klassen: `src/index.css` (`.btn*`, `.panel*`, `.label-caps`, `.hero-curve`, `.reveal`)

## Auth

- Supabase signInWithPassword
- Admin: `micha_herz@icloud.com` mit fester PIN
- ENV `VITE_ADMIN_EMAIL` muss exakt mit Supabase-User matchen
- „Confirm email" in Supabase → OFF

## i18n

- Custom-Provider `src/lib/i18n.tsx` (kein i18next), DE/EN **gemirrort** (~300 Keys), Default `navigator.language`, persist `localStorage["padel-cup-lang"]`
- Floating Lang-Toggle nur auf `/`, nicht in `/score`
- **ASCII-Quotes only** — Smart-Quotes brechen JS-Strings. Ansage-Sprachtexte (`/timer`) sind fest deutsch.

## Critical Files

- `src/lib/tournament-engine.ts` — Pure-Engine: Box (`generateLeagueSchedule`, `circulantPairings`, `packSlots`, `fillFunGames`, `computeDivisionStandings`, `seedDivisionFinals`) + Swiss (`seedRound1` mit ready-Reorder, `seedNextRound`, `seedKOSemis/Finals`, `computeSwissStandings`, `bestOfForSwissKO`) + Scoring-Helper
- `src/lib/scoring.ts`, `demo-mode.ts` (`resetTournament`, `autoScoreSwiss`), `i18n.tsx` (DE/EN gemirrort, ASCII-Quotes), `hooks.ts`, `database.types.ts`
- `src/components/TournamentPanel.tsx` — dispatcht `BoxTournamentPanel`/`SwissTournamentPanel`; `LiveScoringModal.tsx` (Sets+Timer); `MatchEditor.tsx`; `LiveBoard.tsx`, `PublicTournament.tsx` (verzweigen nach mode)
- `src/pages/Score.tsx` (Config-Cards, Team-CRUD, DangerZone), `AnnouncerTimer.tsx` (`/timer`), `Public.tsx` (Cost liest `settings.total_cost`; public_live-Gate), `PosterSlide.tsx`, `PrintTurniermodus.tsx`
- `src/lib/tournament.ts` — TOURNAMENT-Konstante (Fallback für Datum/Zeit/courts), `sisterCup` zu Football

## Hard Rules

- NIEMALS `service_role` Key im Frontend — nur `sb_publishable_*`
- NIEMALS `npm install` — IMMER `pnpm install`
- Vor jedem Commit: `pnpm run build`
- i18n bei jeder neuen Component (DE+EN), **nur ASCII-Quotes**
- Bei Realtime-Race-Risk: Postgres-Unique-Index als finale Schicht, `23505` als no-op
- Bei Shader-/WebGL-BGs: **kein client-side JPG/PDF-Export** (siehe `feedback_html_to_image_webgl.md`)

## Stand / Offen (2026-07-18)
- Format komplett umgebaut: Mexicano → **Box-Liga + Swiss + Zeit-Modus + Ansager**. Alles build-grün, aber **noch nicht end-to-end im laufenden Betrieb getestet** (dev blockt hier) → großer Testdurchlauf steht aus.
- **3 Migrationen** müssen in Supabase eingespielt sein: `schema-box-league.sql`, `schema-timed-scoring.sql`, `schema-ready-flag.sql`. Erste zwei erledigt; ready-flag ggf. noch offen → im Zweifel nachspielen (idempotent).
- Letzter Deploy (Cheers + Ready) ggf. noch offen → `pnpm run build` + push.
- **Offen:** die 4 Ansage-Buttons in `/timer` haben Platzhalter-Labels „Ansage 1–4" (i18n `timerAnn1..4`) — echte Texte vom User eintragen.
- Event-Setup: scoring_mode=`timed` (14 Min), tournament_mode=`swiss`, 4 Runden, `public_live` erst zum Start AN.

## Memory

- `feedback_vercel_pnpm.md` — Vercel npm-Bug
- `postgres-unique-race-guard.md` — Race-Guard-Pattern
- `dark-print-pdf-layout.md` — Dark-Mode-Print für PrintTurniermodus
- `feedback_html_to_image_webgl.md` — WebGL+html-to-image-Sackgasse, nicht nochmal versuchen
