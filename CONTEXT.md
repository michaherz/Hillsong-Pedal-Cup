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

### Aktueller State (Stand Ende Session)

- Public-View: Hero, Anmeldung, Teams, Tournament (Standings+Bracket bei phase!=registration), Info, Venue → vollständig dark-themed, responsiv, animiert
- Admin-View: PIN-Gate, Cards (Reg-Toggle / QR-Link / Active-Teams), Team-CRUD, TournamentPanel mit FormatPreview-Stepper + Action-Buttons + Match-Scoring + Standings-Table
- Tournament-Engine: Mexicano-Pairings (R1 skill-seeded, R2/R3 standings-paired), KO Top-4 (1v4 / 2v3 → Final + 3rd), computeStandings, isRoundComplete, semisComplete, finalsComplete

### Was im Repo NICHT mehr aktuell ist

- README.md hat noch alte 18.06-Angaben — nicht hier in Session aktualisiert (nur i18n, tournament.ts, index.html, CLAUDE.md)

### Offen für nächste Session

User hat angekündigt: **Session-Cut → neue Session für Tournament-Modus + Darstellung**. Themen die wahrscheinlich kommen:
- Public-Tournament-View weiter polieren (My-Team-Selector? Aktuelle-Runde-Highlight? Scrollspy?)
- Bracket-Layout-Variationen
- Möglicherweise Match-Scheduling-Sicht für Spieler ("Dein nächstes Match" Card)
- Print-View / Beamer-Modus für Live-Tabelle

### Pipeline-Chronik (Project)

- 2026-05-27 Site initial deployed auf Vercel, npm-Bug erforderte pnpm-Switch
- 2026-05-27 i18n + WhatsApp + Racket-Hint + QR-Download + Logo-vor-Headline + "Padel Cup 2026"-Rename
- 2026-05-28 Tournament-Engine + Admin-Panel
- 2026-05-28 Visual Redesign Velocity-Style komplett (Dark Mode, Anton, Marquees, Bento, Hard-Shadow)
- 2026-05-28 Public-Tournament-View + Format-Stepper + Spotlight-Hover + Countdown + Padel-Rackets-Art
- 2026-05-28 Big Bug-Bash (Hero-Clip, Marquee-Corners, Anchor-Scroll, Score-Width, Mobile-Tablet-Polish)
