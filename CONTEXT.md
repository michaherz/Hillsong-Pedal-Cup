# Context Log

Dated session notes. Newest entries on top. Decisions, rationale, what's mid-flight.

---

## 2026-05-28 — Redesign vollendet + Tournament-Public-View + Format-Stepper + Bug-Bash

### Was gebaut wurde diese Session (build-incremental)

**Visual Redesign vollständig live:**
- TopNav (fixed, fix für Mobile-Layout-Bug, Lang-Toggle integriert), Hero mit curved+rotated Headline, Marquee-Bänder (gekippt + auf z-10 Foreground statt geclippt), Bento-Grid (Live-Tracking durch Countdown D/H/M/S ersetzt + PadelRacketsArt-SVG dazu), Stat-Tiles, dark Registration-Form, dark TeamList, dark VenueCard mit Site-Map, dark InfoCards (WhatsApp + Racket), dark Score-Mode + TournamentPanel.

**Tournament-Format ausimplementiert:**
- `PublicTournament.tsx` — Standings-Table + Left-to-Right Bracket-Tree (SF1+SF2 → Final → Champion 🏆 + 3.-Platz parallel). Mobile stacked vertikal, Desktop LTR. Erscheint sobald Phase ≠ registration. Live via `useMatches` realtime.
- `FormatPreview` im Admin-Panel: 6-Step-Stepper Registration → Mex R1 → R2 → R3 → KO → Done, aktueller Step blau, vergangene mint.

**Datum gefixt:** 18.06 (Donnerstag) → **18.07.2026 (Samstag)** überall.

**Headline-Wording:** "JOIN THE PLAY" → **"THIS IS OUR SUMMER"**. Premium-Pill: "Hillsong Sports" → **"Our Summer"**.

**Spotlight-Hover auf Headline:** Stacked Overlay mit `mask-image: radial-gradient(...)` an `--spot-x/--spot-y`. Mint-Color erscheint nur wo Cursor ist. Nur auf `(hover: hover) and (pointer: fine)` Devices.

**Venue-Bild jetzt immer in Farbe** (vorher sm:grayscale + hover-to-color).

**Bug-Bash dieser Session:**
- npm 10.5.x Vercel-Bug → Switch auf pnpm (siehe `feedback_vercel_pnpm.md` global memory)
- Headline-Clipping bei Rotation/Resize: `(hover: hover)`-Gate + `vh+vw min()` Sizing + reset on resize
- Hero `min-h-[80vh] justify-center` schob Headline-Top in Fixed-Nav-Territory → entfernt
- Hero-Curve `overflow:hidden` + fixed-height clippte Italic+Rotation-Glyphen → padding-based, no clip
- Marquee-Tilt mit `overflow:hidden` zeigte dunkle Dreiecke an Ecken → outer wrapper kein clip + `z-10` foreground, ragt jetzt sauber über Nachbar-Sections
- Anchor-Scroll von Nav zu Section: heading hinter Fixed-Nav verschwand → `html { scroll-padding-top: 6rem }` + `scroll-mt-24 sm:scroll-mt-28` auf jede Section
- Score-Page Karten unterschiedlich breit auf Mobile → alle in gleichem `max-w-5xl px-5` Container, Public-Link-Card uniformes Label-top-Layout, TournamentPanel padding p-5 statt p-6/p-8
- Hero-Schrift auf iPad/Desktop überlief horizontal → cap auf `clamp(32px, min(7vw, 12vh), 78px)`
- Image-Card überlappte Headline-Bottom durch `sm:-mt-16` → `sm:mt-6`

### Hero-Headline final state (Ende Session 2026-05-28)

Schrift: `clamp(40px, min(10vw, 16vh), 140px)` — bewusst groß. Caps:
- Mobile (390px) → 40px
- iPad portrait (1024px) → ~102px
- Laptop (1440px) → 140px (max)
- Desktop (1920px+) → 140px

**Foreground & Overlap-Verhalten:**
- `.hero-curve { overflow: visible; z-index: 30 }` → Headline darf horizontal/vertikal über die Container-Grenzen rausragen. Bei großer Schrift überlappt die Headline jetzt visuell die Image-Card unten — gewollt.
- Spotlight-Overlay (`hero-spotlight-overlay`): `display: flex; align-items: center; justify-content: center` — exakt deckungsgleich auf Base-Text. Vorher Misalignment weil h1 inline-block + overlay-text nicht zentriert.
- Parallax-Magnitude halbiert (Divisor 60 → 120) damit Mouse-Move-Translate die Headline nicht über Viewport-Rand schiebt.

### Aktueller State (Stand Ende Session)

- Public-View: Hero, Anmeldung, Teams, Tournament (Standings+Bracket bei phase!=registration), Info, Venue → vollständig dark-themed, responsiv, animiert
- Admin-View: PIN-Gate, Cards (Reg-Toggle / QR-Link / Active-Teams), Team-CRUD, TournamentPanel mit FormatPreview-Stepper + Action-Buttons + Match-Scoring + Standings-Table
- Tournament-Engine: Mexicano-Pairings (R1 skill-seeded, R2/R3 standings-paired), KO Top-4 (1v4 / 2v3 → Final + 3rd), computeStandings, isRoundComplete, semisComplete, finalsComplete

### Was im Repo NICHT mehr aktuell ist

- README.md hat noch alte 18.06-Angaben — nicht hier in Session aktualisiert (nur i18n, tournament.ts, index.html, CLAUDE.md)

### Offen für nächste Session

User hat angekündigt: **Session-Cut → neue Session für Tournament-Modus + Darstellung**. Themen die wahrscheinlich kommen:

**Tournament-Engine + Public-View Iteration:**
- Public-Tournament-View weiter polieren — die existierende `PublicTournament.tsx` hat Standings + LTR-Bracket aber wahrscheinlich Verfeinerungs-Bedarf am visuellen Bracket-Layout
- "Mein Team / Mein nächstes Match"-Card für Spieler — `localStorage["my-team-id"]` setzen via Tap auf Team-Liste, dann prominent "Court 1, Wave 2, gegen XYZ" anzeigen
- Aktuelle-Runde-Highlight: in der Tabelle visuell hervorheben welche Runde gerade läuft
- Match-Schedule-Grid: alle Matches der aktuellen + nächsten Runde mit Court + Wave-Slot
- Print-View / Beamer-Modus für Live-Tabelle (großer TV vor Ort?)

**Score-Mode Iteration:**
- Format-Preview-Stepper existiert, aber Match-Scoring könnte komfortabler werden (große Buttons, Quick-Score-Templates wie 5-3, 5-4, 4-5, 3-5)
- Possibly: per-Match-Timer? (4h Gesamtzeit, 22min/Match)

**Datenstand:**
- Schema-Migration `schema-tournament.sql` muss user noch in Supabase Studio einspielen (settings.tournament_phase + .current_round + .total_courts, matches.phase + .wave + .bracket_pos)
- Realtime-Hook für matches existiert bereits (`useMatches`)

**Wichtige Files für Tournament-Iteration:**
- `src/lib/tournament-engine.ts` — Pure-Function Engine (seed, standings, complete-checks)
- `src/components/TournamentPanel.tsx` — Admin-side
- `src/components/PublicTournament.tsx` — Public-side
- `src/lib/i18n.tsx` — Strings unter `tournament*`, `bracket*`, `standings*`, `step*`, `phase*`

### Pipeline-Chronik (Project)

- 2026-05-27 Site initial deployed auf Vercel, npm-Bug erforderte pnpm-Switch
- 2026-05-27 i18n + WhatsApp + Racket-Hint + QR-Download + Logo-vor-Headline + "Padel Cup 2026"-Rename
- 2026-05-28 Tournament-Engine + Admin-Panel
- 2026-05-28 Visual Redesign Velocity-Style komplett (Dark Mode, Anton, Marquees, Bento, Hard-Shadow)
- 2026-05-28 Public-Tournament-View + Format-Stepper + Spotlight-Hover + Countdown + Padel-Rackets-Art
- 2026-05-28 Big Bug-Bash (Hero-Clip, Marquee-Corners, Anchor-Scroll, Score-Width, Mobile-Tablet-Polish)
- 2026-05-28 Headline-Polish-Final (z-30 Foreground, Overlay-Centering-Fix, Schrift bumped auf clamp 40-140)
