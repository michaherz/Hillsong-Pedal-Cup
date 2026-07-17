# Context Log

Dated session notes. Newest entries on top. Decisions, rationale, what's mid-flight.

---

## 2026-06-02 — i18n vollständig, Cost-Live-Berechnung, PosterSlide

**i18n:** SisterCupLink aria-label via `t("opensInNewTab")`. 203 Keys DE=EN. Audit beider Apps clean. Brand-Strings („THIS IS OUR SUMMER", „Hillsong Padel Cup") bleiben bewusst Englisch.

**Cost-Live-Block** in `RegistrationSection` (`Public.tsx`):
- Default „ca. €20 pro Spieler" wenn ≤16 Spieler (≤8 Teams)
- Ab >16 Spieler Live: `€320 / playerCount` via `Intl.NumberFormat` (locale-aware)
- Total fix €320 für beide Plätze, `playerCount = activeCount × 2`
- i18n-Keys: `costEyebrow`, `costAmount`, `costAmountLive`, `costAmountSubLive`, `costNote`

**Route `/poster`** — 16:9 Beamer-Anzeige mit MeshGradient (`@paper-design/shaders-react`) + zwei QR-Codes (zu beiden Cups). Cup-Daten beider Cups hardcoded als `PADEL_CUP`/`FOOTBALL_CUP` Constants. Reine Live-Anzeige, kein Export-Mechanismus.

**Gescheiterte Versuche (zur Erinnerung):**
- JPG-Export von Shader-BG: html-to-image + WebGL-Canvas funktioniert nicht zuverlässig trotz `preserveDrawingBuffer`/`gl.readPixels`-Fallback. Snapshot lieferte gültige PNG-Daten, html-to-image ignorierte das injizierte `<img>`. Details: `feedback_html_to_image_webgl.md`
- PDF via cmd+P: text-shadow als Geistertext, backdrop-filter ignoriert, Aspect-Mismatch 16:9 vs A4

User designt PosterSlide-Variante extern. Code aufgeräumt: `html-to-image`/`html2canvas` deinstalliert, Export-Logik raus, `@paper-design/shaders-react` bleibt für Live-Anzeige.

### Offen / Nice-to-have

- `activeCount` Race-Edge-Cases bei Cost-Live-Berechnung (Realtime-Update vs render)
- Falls User extern designtes Poster-Bild liefert → als statisches Asset einbinden
- README hat noch alte 18.06-Datumsangaben (war 2026-05-28 nicht aktualisiert)

---

## 2026-05-28 — Visual Redesign + Tournament-Engine + Auto-Advance

**Editorial Velocity-Style** komplett ausgerollt: dark mode, Anton/Hanken/Space Mono, Marquees, Bento-Grid, Hard-Shadows. Hero-Curve mit mouse-parallax + spotlight-overlay.

**Tournament-Engine** (`tournament-engine.ts`): Pure-Functions für Mexicano-Pairings + KO + Standings + Complete-Checks. PublicTournament + Admin-FormatPreview-Stepper.

**Set-Scoring** (Sprint D): Live-Scoring-Modal mit +/− Buttons + Final-Form, konfigurierbare Set-Regel (4/5/6 + 2-Game-Lead-Toggle). Auto-Advance via TournamentPanel-useEffect mit sync ref-lock + Postgres-Unique-Index als Race-Guard (`23505` no-op).

**Demo-Mode** (`demo-mode.ts`): 10 fiktive Teams, auto-score-round, reset.

**Datum:** 18.06 → **18.07.2026 (Samstag)**. **Headline:** „THIS IS OUR SUMMER".

**Major Bug-Bashes:** npm→pnpm switch (Vercel-Bug), Hero-Clipping bei Rotation, Marquee-Tilt-Ecken, Anchor-Scroll mit fixed-Nav, Score-Page Mobile-Width, Hero-Schrift cap auf `clamp(40, min(10vw, 16vh), 140)`.

**Druckansicht** `/print/turniermodus?auto=1`: A4 Editorial Dark, 3 Seiten (Hero+Format / Punkte+Zeitplan / Spieler-Sicht), liest Set-Regel + berechnet Gesamtdauer. Pattern-Memory: `dark-print-pdf-layout.md`.
