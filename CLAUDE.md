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
- `src/lib/database.types.ts` — Team, Match, Settings, Database
- `src/lib/tournament.ts` — TOURNAMENT-Konstante (name, dateISO, venue, whatsappUrl)
- `src/lib/tournament-engine.ts` — Pure-Function Mexicano + KO-Logic
- `src/lib/i18n.tsx` — STRINGS, useT, useLang, LangProvider, formatEventDate
- `src/lib/hooks.ts` — useTeams, useSettings, useMatches (alle realtime)
- `src/components/LanguageToggle.tsx` — DE/EN floating pill
- `src/components/TournamentPanel.tsx` — Admin: phase-aware actions + match-scoring + standings
- `src/components/InfoCards.tsx` — WhatsApp + Schläger-Info
- `src/components/VenueCard.tsx` — Pineapple Park Foto + Lageplan + Maps
- `src/components/TeamList.tsx` — Public Team-Liste mit Skill-Badges
- `src/pages/Public.tsx` — Hero + Form + List + Info + Venue
- `src/pages/Score.tsx` — PIN-Gate + Admin-Dashboard + TournamentPanel

## Hard Rules

- NIEMALS `service_role` Key im Frontend (`secret_*` aus Supabase) — nur `sb_publishable_*` (anon)
- NIEMALS `npm install` lokal — IMMER `pnpm install` (Lockfile-Konsistenz)
- Bei jedem Commit: `pnpm run build` vorher laufen lassen, TS-Errors fixen
- i18n bei jeder Component die User-Strings hat — DE+EN simultan
- Sandbox blockt Push zu GitHub → User pusht aus normalem Terminal

## Memory

Cross-project Vercel/pnpm-Gotcha: `~/.claude/projects/-Users-michaherz-Desktop-Apps-facility-tools/memory/feedback_vercel_pnpm.md`
