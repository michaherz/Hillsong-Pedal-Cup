# Padel Cup MUC

Public registration + live scoring web app for a one-time padel tournament  
**18.06.2026 · 16:00 · Casa Padel Pineapple Park, München**

Stack: Vite + React + TypeScript + Tailwind · Supabase (DB + Realtime + Auth) · Vercel (Hosting).

## Routes

- `/` — Public: Hero, Anmeldeformular (während Reg-Phase), Team-Liste, Venue. Live-Updates via Supabase Realtime.
- `/score` — Admin (PIN-Gate): Anmeldung öffnen/schließen, Team-CRUD, QR-Code für Public-Link. Bracket & Live-Scoring kommen nach Reg-Schluss.

## Setup

### 1) Supabase-Projekt anlegen

1. https://supabase.com → **New Project** (Region Frankfurt)
2. Im Studio → **SQL Editor** → New Query → Inhalt von `supabase/schema.sql` reinpasten → Run
3. **Authentication → Providers → Email**: "Confirm email" **deaktivieren** (sonst kann sich der Admin-User nicht einloggen)
4. **Authentication → Users → Add User** → Email z.B. `admin@padel-cup.local`, Password = die 4-stellige PIN deiner Wahl (z.B. `1842`). Auto-confirm aktivieren.
5. **Project Settings → API** → kopiere `Project URL` + `anon public` key

### 2) Lokale Env

```bash
cp .env.example .env.local
```

Werte aus Schritt 1.5 + Admin-Email einsetzen.

### 3) Dev

```bash
npm install
npm run dev
```

Öffnet http://localhost:5174

### 4) Vercel-Deploy

1. Repo zu GitHub pushen
2. https://vercel.com → Import Repo
3. Build Command: `npm run build` (auto), Output: `dist` (auto)
4. **Environment Variables** → die drei aus `.env.local` reinkopieren
5. Deploy → URL z.B. `padel-cup-muc.vercel.app`

Public-Link teilen, fertig.

## Sicherheits-Modell

- Anon-Key liegt im Frontend — das ist by design, Supabase ist dafür gebaut.
- **RLS schützt Schreibzugriffe**: anonyme User können nur in `teams` einfügen (und nur wenn `settings.registration_open = true`). Lesen ist überall offen.
- **Admin-Aktionen** (Update/Delete Teams, Settings, Matches) erfordern eine signed-in Session. Diese erhältst du nur durch Login mit dem Admin-Email/PIN auf `/score`.
- PIN ist eigentlich das Passwort des Admin-Users in Supabase Auth. Kein zweites Passwort-System nötig.
