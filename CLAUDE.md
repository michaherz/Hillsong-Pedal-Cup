# Padel Cup 2026 — Project Context

Path: `/Users/michaherz/Desktop/Apps/padel-cup/`
Repo: `git@github.com:michaherz/Hillsong-Pedal-Cup.git`
Live: `https://hillsong-pedal-cup.vercel.app`
Stack: Vite + React + TypeScript + Tailwind CSS + Supabase (DB + Realtime + Auth) + Vercel + pnpm
Package-Manager: **pnpm** (NICHT npm — Vercel npm 10.5.x bug, siehe `feedback_vercel_pnpm.md`)

## Zweck

One-time public registration + live-scoring web app für Hillsong Padel Cup am 18.06.2026, 16:00, Casa Padel Pineapple Park München. 2 Padel-Plätze, 4h, 10–12 Teams erwartet. Internationals (DE/EN i18n).

## Routes

- `/` Public — Hero, Anmeldeformular, Live-Team-Liste, WhatsApp/Schläger-Info, Venue-Card mit Foto/Lageplan, später Live-Tabelle/Schedule/Bracket
- `/score` Admin — PIN-Gate (Supabase Auth), Team-CRUD, Reg-Toggle, QR-Code-Download, Tournament-Panel (Mexicano-Generierung + Score-Eintragung)
- `/oauth/callback` — nicht genutzt (Reste vom Code, kann weg)

## Sandbox

- `pnpm install` ✅ · `pnpm run build` ✅
- `pnpm run dev` ❌ blockt — User aus normalem Terminal
- Push zu GitHub blockt — User aus normalem Terminal

## Datenarchitektur

```
Browser (Spieler / iPad)  ─┬─► Supabase REST + Realtime
                           ├─► Anon-Key im Bundle (Publishable)
                           └─► Auth via signInWithPassword (Admin)

RLS-Policies:
- teams INSERT: anon, nur wenn settings.registration_open = true
- teams UPDATE/DELETE: nur authenticated
- matches/settings ALL writes: nur authenticated
- alle SELECTs: public
```

**Supabase-Projekt-Region:** EU-West (Irland) — User hatte erst falsch ausgewählt, dann beim Recreate doch nicht zu Frankfurt gewechselt. Latenz vernachlässigbar.

**Schema-Files** in `supabase/`:
- `schema.sql` — Basis: teams + matches + settings + RLS
- `schema-tournament.sql` — Erweiterung: settings.tournament_phase/current_round/total_courts, matches.phase/wave/bracket_pos

## Turnier-Format (entschieden 2026-05-28)

**Mexicano mit Skill-Seeding + Top-4-KO**

- 3 Runden Mexicano, jeweils ~22min/Match (First-to-5-Games)
- Runde 1: Teams nach Skill sortiert, Top-Half + Bottom-Half adjazent gepaart (Beginner spielt gegen Beginner)
- Runde 2/3: Pairing nach aktuellem Tabellenstand (Sieger spielt Sieger)
- Phase 2: Top 4 → Halbfinale (1v4, 2v3) parallel + Finale + 3.-Platz-Spiel parallel
- Punkte: Sieg=3, Niederlage=0; Tiebreaker: Game-Differenz, dann Games-For

Engine in `src/lib/tournament-engine.ts` (pure functions, getestet via Build).

## Set-Scoring + Live + Auto-Advance (Sprint D, 2026-05-31)

**Set-Modell** auf `matches`-Schema: `best_of` (1 oder 3), `set_history` (jsonb-Array `[{a:6, b:3}, …]`), `current_a`/`current_b` (laufender Satz), `sets_a`/`sets_b` (gewonnene Sätze, denormalisiert). `score_a`/`score_b` bleiben als Game-Totals für `computeStandings`-Tiebreaker. Mexicano + KO-Halbfinale = BO1, Finale + 3.Platz = BO3 via `bestOfForBracket()`.

**Konfigurierbare Set-Regel** auf `settings`: `set_target` (4|5|6, default 6) + `set_two_game_lead` (bool, default true). `setWon(a, b, target, twoLead)` und `bumpGame()`/`buildFinalScore()` durchreichen via `SetRule`-Type. UI-Toggle in `SetRuleCard` (`Score.tsx`) — greift einheitlich für laufende + neue Matches. Default `DEFAULT_SET_RULE = {target:6, twoLead:true}`.

**Live-Scoring-Modal** (`LiveScoringModal.tsx`): Tap auf Match-Score öffnet Vollbild-Modal mit zwei Tabs:
- **Live mitzählen** — riesige `+1`/`−1`-Buttons pro Team für Spiele, automatischer Set-Übergang (push to set_history, reset current) bei `setWon()`, automatisches Match-Ende bei `matchWon()` (sets_a/sets_b ≥ best_of/2+1).
- **Endergebnis eintragen** — direkte Eingabe von Satzergebnissen (1 Zeile bei BO1, 3 bei BO3, dritte als „opt." markiert), `buildFinalScore()` validiert pro Set (≥target + ggf. 2-Vorsprung) + Match-Decision.

`scoring.ts` hat die Pure-Function-Helper: `bumpGame()`, `buildFinalScore()`, `applyScoringUpdate()`, `resetScoring()`, `formatScoreLine()`.

**Auto-Advance** (`TournamentPanel.tsx` useEffect): Sobald `isRoundComplete()`/`semisComplete()`/`finalsComplete()` true wird, generiert die App automatisch die nächste Runde / KO-Stufe. Synchroner Ref-Lock (`advancingRef.current = true` _vor_ dem ersten `await`, finally-released) plus Idempotenz-Check in `nextRound`/`startKO`/`startFinals` (skip wenn target-matches schon existieren).

**Race-Guard auf Postgres-Ebene** (Hard-Constraint in `schema-set-scoring.sql` + `fix-duplicate-matches.sql`):
- `unique index matches_unique_mexicano_slot on matches (round, court, wave) where phase = 'mexicano'`
- `unique index matches_unique_ko_slot on matches (bracket_pos) where phase = 'knockout' and bracket_pos is not null`
- Code (`nextRound`/`startKO`/`startFinals`) behandelt Postgres-Error-Code `23505` (unique_violation) als no-op statt als Fehler. Bulletproof gegen alle Frontend-Race-Szenarien.

**Realtime-Hooks** (`useMatches`/`useTeams`): INSERT-Events deduplizieren by `id` (`if (list.some(m => m.id === payload.new.id)) return list`) gegen Realtime-Resends bei Reconnects.

**LiveBoard** (`LiveBoard.tsx`): Public-Sicht zwischen Registration und Teams. Pro Court eine Card mit „Jetzt" (`status=in_progress` oder ältester scheduled current-round) + „Als Nächstes" (nächster scheduled). LIVE-Pulse-Indicator. Big-Screen-tauglich (Score-Cells `clamp(80px, 18vw, 160px)`).

**Demo-Mode** (`demo-mode.ts` + `DemoSection` in `TournamentPanel`): 10 fiktive Teams (5 Beg / 3 Int / 2 Adv, Smash Brothers/Net Ninjas/etc.) als `is_demo=true`. Buttons: „10 Demo-Teams anlegen" / „Aktuelle Runde auto-scoren" (skill-aware random sets, respektiert die konfigurierte Regel) / „Demo zurücksetzen" (delete + Phase auf registration). DEMO-Pills auf TeamList/Standings/AdminTeamRow + Banner auf Public oben wenn `hasDemoTeams()`.

**RLS-Erweiterung** (`fix-admin-insert.sql`): Authenticated Admins brauchen explizite INSERT-Policy für `teams`, weil `teams_insert_open` (anon) `is_demo = false` erzwingt.

**Druckansicht** (`PrintTurniermodus.tsx` an `/print/turniermodus?auto=1`): A4-styled Erklärung des Turniermodus im Editorial-Look. 3 Seiten: Hero+Format / Punkte+Zeitplan / Spieler-Sicht. Liest aktuelle Set-Regel aus settings + berechnet Gesamtdauer (`minutesPerMatch` = 14/18/22 für target 4/5/6). `?auto=1` triggert nach 300ms `window.print()`. Button im SetRuleCard im Admin öffnet im neuen Tab. Dark-Mode-Print: `html, body` mit `background: #131313` + `print-color-adjust: exact`, `.page` mit `min-height: 297mm` + `box-sizing: border-box` + `flex column` + `margin-bottom: auto` auf last-child damit dunkler BG die ganze Seite füllt.

## Design-System (Redesign 2026-05-28)

**Editorial Sports Magazine, Dark Mode.** Inspiriert von „Velocity"-Mockup das User geschickt hat.

- **Background:** `#131313` deep dark
- **Accent Colors:** Primary `#93ccff` (bright blue), Secondary `#4edea3` (mint green for "live"), Tertiary `#ffb869` (orange for highlights)
- **Fonts:** Anton (display headlines, all-caps), Hanken Grotesk (body), Space Mono (uppercase labels with tracking)
- **Border-Radius:** scharf — Default 0px, kleine Akzente nur an Pills/Toggle
- **Hard-Shadows:** Solid offset shadows (8px 8px 0px primary) auf Buttons + interaktiven Cards, lift on hover (-translate + größerer Shadow)
- **Marquees:** Animated text bands zwischen Sections, vorwärts + rückwärts
- **Hero-Curve-Text:** Großes „PADEL CUP 2026" rotated, mouse-parallax über onMouseMove (translates by mouse-distance/50)
- **Bento-Grid-Layout:** Asymmetrische 12-col grid, einzelne Cards span 4/8

Theme-Tokens in `tailwind.config.js` unter `colors`/`fontFamily`/`fontSize`/`boxShadow`/`keyframes`.
Component-Klassen in `src/index.css`: `.btn`, `.btn-primary/secondary/ghost`, `.input`, `.input-line`, `.panel`, `.panel-pop`, `.label-caps`, `.hard-shadow-hover`, `.hero-curve`, `.reveal`.

## Auth-Modell

- Supabase Auth signInWithPassword
- Admin-User: `micha_herz@icloud.com` mit fester PIN
- ENV: `VITE_ADMIN_EMAIL` muss exakt mit Supabase-User-Email matchen
- "Confirm email" in Supabase Auth → OFF

## i18n

- Custom-Provider in `src/lib/i18n.tsx` (kein i18next, zu viel Overhead für 2 Sprachen + 1-Page-App)
- DE/EN-Dictionary, `useT()`-Hook, var-substitution `{count}` etc.
- Default: navigator.language, persistiert in `localStorage["padel-cup-lang"]`
- Floating Language-Toggle nur auf `/`, nicht in `/score` (überlappt sonst Mobile-Header)
- Datum via `Intl.DateTimeFormat` locale-aware

## Critical Files

- `src/integrations/`... gibt es nicht — alles in `src/lib/`
- `src/lib/supabase.ts` — Client + ADMIN_EMAIL export, persistSession=true
- `src/lib/database.types.ts` — Team, Match (mit `best_of`/`set_history`/`current_a/b`/`sets_a/b`/`is_demo`), Settings (mit `set_target`/`set_two_game_lead`), SetScore, Database
- `src/lib/tournament.ts` — TOURNAMENT-Konstante (name, dateISO, venue, whatsappUrl)
- `src/lib/tournament-engine.ts` — Pure-Function Mexicano + KO-Logic + `setWon(a, b, target, twoLead)` + `matchWon` + `bestOfForBracket` + `SetRule`/`DEFAULT_SET_RULE`. `computeStandings` nutzt `sets_a > sets_b` als primary winner-check, fällt auf `score_a > score_b` zurück bei Set-Gleichstand.
- `src/lib/scoring.ts` — `bumpGame(match, side, delta, rule)`, `buildFinalScore(bestOf, sets, rule)`, `applyScoringUpdate`, `resetScoring`, `formatScoreLine`. Game-Bump propagiert sets/totals/status, auto-closes set/match.
- `src/lib/demo-mode.ts` — `DEMO_TEAMS` (10 fiktive), `seedDemoTeams`, `autoScoreRound(matches, teams, round, rule)` (skill-aware random sets), `resetDemo`, `hasDemoTeams`, `demoTeamCount`.
- `src/lib/i18n.tsx` — STRINGS, useT, useLang, LangProvider, formatEventDate. **ASCII-Quotes only in Strings** — German „..." / „..." als Smart-Quotes-Paare können JS-Strings brechen, lieber paraphrasieren.
- `src/lib/hooks.ts` — useTeams, useSettings, useMatches mit INSERT-Dedupe nach `id` (Realtime-Resend-Schutz)
- `src/components/LanguageToggle.tsx` — DE/EN floating pill
- `src/components/TournamentPanel.tsx` — Admin: phase-aware actions + Auto-Advance-useEffect (sync ref-lock vor erstem await) + DemoSection + LiveScoringModal-Open + idempotente nextRound/startKO/startFinals (skip wenn target-matches schon existieren, behandelt 23505 als no-op)
- `src/components/LiveScoringModal.tsx` — Modal mit Tab-Toggle Live/Final, +/- Buttons (clamp 80-160px), FinalScoreForm mit Set-Rows + Validation via `buildFinalScore`
- `src/components/LiveBoard.tsx` — Public Now/Next pro Court, big-screen-tauglich
- `src/components/InfoCards.tsx` — WhatsApp + Schläger-Info
- `src/components/VenueCard.tsx` — Pineapple Park Foto + Lageplan + Maps
- `src/components/TeamList.tsx` — Public Team-Liste mit Skill-Badges + DEMO-Pill
- `src/components/PublicTournament.tsx` — Standings-Tabelle + Bracket-Cards mit Set-Liste, ChampionCard nutzt `sets_a > sets_b`
- `src/pages/Public.tsx` — Hero + Form + List + Info + Venue + LiveBoard + DemoBanner
- `src/pages/Score.tsx` — PIN-Gate + Admin-Dashboard + RegToggle + PublicLinkCard + TeamCountCard + **SetRuleCard** (target/lead-Toggles + PDF-Button) + TournamentPanel
- `src/pages/PrintTurniermodus.tsx` — A4-styled Druckansicht, liest aktuelle Set-Regel, `?auto=1` triggert window.print()
- `supabase/schema.sql` + `schema-tournament.sql` + `schema-demo.sql` + `schema-set-scoring.sql` + `schema-set-rule.sql` — In dieser Reihenfolge applizieren
- `supabase/fix-duplicate-matches.sql` — Cleanup + Unique-Indexes (mexicano slot + KO bracket_pos)
- `supabase/fix-admin-insert.sql` — Authenticated INSERT-Policy für teams

## Hard Rules

- NIEMALS `service_role` Key im Frontend (`secret_*` aus Supabase) — nur `sb_publishable_*` (anon)
- NIEMALS `npm install` lokal — IMMER `pnpm install` (Lockfile-Konsistenz)
- Bei jedem Commit: `pnpm run build` vorher laufen lassen, TS-Errors fixen
- i18n bei jeder Component die User-Strings hat — DE+EN simultan
- **i18n-Strings nur ASCII-Quotes** (`"`, nicht `„`/`"`) — Smart-Quotes-Paare in Strings brechen JS-Parser
- Sandbox blockt Push zu GitHub → User pusht aus normalem Terminal
- Bei Realtime-Multi-Tab-/Race-Risk: **Postgres-Unique-Index als finale Race-Guard**, nicht nur Frontend-Locks. Code behandelt `code === "23505"` (unique_violation) als no-op.

## Memory

Cross-project Vercel/pnpm-Gotcha: `~/.claude/projects/-Users-michaherz-Desktop-Apps-facility-tools/memory/feedback_vercel_pnpm.md`
Cross-project Race-Guard-Pattern: `~/.claude/projects/-Users-michaherz-Desktop-Apps-facility-tools/memory/postgres-unique-race-guard.md`
Cross-project Dark-Mode-Print-Layout: `~/.claude/projects/-Users-michaherz-Desktop-Apps-facility-tools/memory/dark-print-pdf-layout.md`
