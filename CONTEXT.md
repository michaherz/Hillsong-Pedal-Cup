# Context Log

Dated session notes. Newest entries on top. Decisions, rationale, what's mid-flight.

---

## 2026-05-28 — Visual Redesign + Tournament Engine

### Tournament-Format entschieden

Mexicano (Single-Pool) mit Skill-Seeded R1 + Top-4-KO. First-to-5 Games pro Match, ~22min. 3 Mexicano-Runden + Halbfinale + Finale + 3.-Platz. Passt in 4h auf 2 Courts.

Engine + Admin-Panel implementiert (`tournament-engine.ts`, `TournamentPanel.tsx`). Schema-Migration `schema-tournament.sql` muss user noch in Supabase Studio einspielen. Public-View für Tabelle/Schedule/Bracket steht noch aus.

### Visual Redesign

User schickte HTML-Mockup im "Velocity"-Sports-Magazin-Stil (Dark Mode, Anton-Display-Type, Marquees, Hard-Shadow-Buttons, Bento-Grid, Mouse-Parallax-Hero). Entscheidung: nicht nur Theme drüberlegen sondern **Format/Layout 1:1 übernehmen** inkl. Animations (curved hero text mit mouse-tracking, scroll-reveal, hard-shadow-hover-lift, marquee-bänder).

**Status redesign:**
- ✅ tailwind.config.js komplett neu (Colors, Fonts, Sizes, Shadows, Keyframes, Animations)
- ✅ index.html mit Google Fonts (Anton, Hanken Grotesk, Space Mono, Material Symbols)
- ✅ index.css neue Component-Klassen (btn-primary/secondary/ghost mit hard-shadow-hover, input, panel-Varianten, hero-curve, reveal, marquee)
- ⏳ Public.tsx — komplette Restructure mit TopNavBar + Hero (curved+parallax) + Marquee + Bento-Grid + Form + Teams + Marquee + Venue + Footer **TBD**
- ⏳ Score.tsx + TournamentPanel.tsx — Dark-Theme-Anpassung **TBD**
- ⏳ Sub-Components (TeamList, VenueCard, InfoCards, LanguageToggle) — Restyle **TBD**
- ⏳ Neue Components: Marquee, TopNavBar, Hero **TBD**

### Pipeline-Chronik

- 2026-05-27 Site initial deployed auf Vercel, npm-Bug erforderte pnpm-Switch
- 2026-05-27 i18n + WhatsApp + Racket-Hint + QR-Download + Logo-vor-Headline + "Padel Cup 2026"-Rename
- 2026-05-28 Tournament-Engine + Admin-Panel + Mobile-Toggle-Fix + Redesign-Start

### Offen

- Schema-Migration in Supabase Studio anwenden (`schema-tournament.sql`)
- Redesign fertigstellen
- Public-Tournament-View (My Team, Standings, Schedule, Bracket)
- Vercel-Push der pending Commits
