# Padel Cup 2026 — Project Context

Path: `/Users/michaherz/Desktop/Apps/padel-cup/`
Repo: `git@github.com:michaherz/Hillsong-Pedal-Cup.git`
Live: `https://hillsong-pedal-cup.vercel.app`
Stack: Vite + React + TS + Tailwind + Supabase (DB+Realtime+Auth) + Vercel + **pnpm** (siehe `feedback_vercel_pnpm.md`)
Sister: `football-cup` — selbe Supabase-Instanz, `fb_`-Präfix-Tabellen, gegenseitig via `SisterCupLink`.

## Zweck

One-time public Anmeldung + live-scoring für Hillsong Padel Cup, **18.07.2026 16:00**, Casa Padel Pineapple Park München. 2 Plätze, 4h, 10–12 Teams. DE/EN.

## Routes

- `/` Public — Hero, Anmeldeformular, Cost-Live-Berechnung, LiveBoard, Teams, Tournament, Info, Venue
- `/score` Admin — PIN-Gate, Team-CRUD, Reg-Toggle, Tournament-Panel, Set-Rule-Toggle, Print-Button
- `/print/turniermodus` — A4 Druckansicht (`?auto=1` triggert Print)
- `/poster` — 16:9 Live-Anzeige für Beamer (MeshGradient + 2 QRs zu beiden Cups). Reine Anzeige, kein Export.
- `/oauth/callback` — Reste, kann weg

## Sandbox

- `pnpm install` ✅ · `pnpm run build` ✅
- `pnpm run dev` ❌ blockt → User aus normalem Terminal
- `git push` blockt → User aus normalem Terminal

## Datenarchitektur

```
Browser (Spieler / iPad) ─► Supabase REST + Realtime
RLS: anon INSERT teams nur wenn settings.registration_open=true
     authenticated UPDATE/DELETE/Match-Writes
     SELECT public
```

**Region:** EU-West (Irland). **Schema-Files** in `supabase/`: `schema.sql` → `schema-tournament.sql` → `schema-demo.sql` → `schema-set-scoring.sql` → `schema-set-rule.sql` → `fix-duplicate-matches.sql` → `fix-admin-insert.sql` (in dieser Reihenfolge).

## Turnier-Format

**Mexicano 3 Runden + Top-4-KO** (siehe `tournament-engine.ts`):
- R1 skill-seeded, R2/R3 standings-paired
- Halbfinale 1v4/2v3 BO1, Finale + 3.Platz BO3 (`bestOfForBracket`)
- Punkte: 3/0; Tiebreaker Game-Diff → Games-For
- Set-Regel konfigurierbar: `set_target` (4|5|6, default 6) + `set_two_game_lead` (default true)

## Set-Scoring + Auto-Advance

`scoring.ts` Pure-Helper (`bumpGame`, `buildFinalScore`, `applyScoringUpdate`, `formatScoreLine`). LiveScoringModal mit „Live"/„Final"-Tabs. TournamentPanel useEffect + sync ref-lock advanced automatisch zur nächsten Runde.

**Race-Guard:** Postgres unique indexes `matches_unique_mexicano_slot` / `matches_unique_ko_slot`, Code behandelt `code === "23505"` als no-op (siehe `postgres-unique-race-guard.md`). Realtime-Hooks dedupen INSERTs nach `id`.

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

- Custom-Provider `src/lib/i18n.tsx` (kein i18next), DE/EN gemirrort
- 203 Keys, Default `navigator.language`, persistiert in `localStorage["padel-cup-lang"]`
- Floating Lang-Toggle nur auf `/`, nicht in `/score`
- **ASCII-Quotes only** — Smart-Quotes brechen JS-Strings

## Critical Files

- `src/lib/supabase.ts` · `src/lib/database.types.ts` · `src/lib/tournament.ts` (TOURNAMENT-Konstante, dateISO 2026-07-18, `sisterCup` zu Football)
- `src/lib/tournament-engine.ts` — Pure-Function Engine
- `src/lib/scoring.ts`, `src/lib/demo-mode.ts`, `src/lib/i18n.tsx`, `src/lib/hooks.ts`
- `src/components/TournamentPanel.tsx`, `LiveScoringModal.tsx`, `LiveBoard.tsx`, `PublicTournament.tsx`
- `src/components/SisterCupLink.tsx` — TopNav-Pill, `TOURNAMENT.sisterCup`-driven, aria-label via i18n `opensInNewTab`
- `src/pages/Public.tsx` — Hero, RegistrationSection mit **Cost-Live-Block** (€320 Total, ab 9. Team Live-Berechnung), TeamList, LiveBoard, …
- `src/pages/Score.tsx` — PIN-Gate, Admin-Dashboard, SetRuleCard mit Print-Button, **Poster-Slide-Button** (`/poster`)
- `src/pages/PrintTurniermodus.tsx` — A4 Druckansicht (Editorial Dark)
- `src/pages/PosterSlide.tsx` — 16:9 Beamer-Anzeige mit `MeshGradient` (`@paper-design/shaders-react`) + 2 QRs

## Hard Rules

- NIEMALS `service_role` Key im Frontend — nur `sb_publishable_*`
- NIEMALS `npm install` — IMMER `pnpm install`
- Vor jedem Commit: `pnpm run build`
- i18n bei jeder neuen Component (DE+EN), **nur ASCII-Quotes**
- Bei Realtime-Race-Risk: Postgres-Unique-Index als finale Schicht, `23505` als no-op
- Bei Shader-/WebGL-BGs: **kein client-side JPG/PDF-Export** (siehe `feedback_html_to_image_webgl.md`)

## Memory

- `feedback_vercel_pnpm.md` — Vercel npm-Bug
- `postgres-unique-race-guard.md` — Race-Guard-Pattern
- `dark-print-pdf-layout.md` — Dark-Mode-Print für PrintTurniermodus
- `feedback_html_to_image_webgl.md` — WebGL+html-to-image-Sackgasse, nicht nochmal versuchen
