import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Lang = "de" | "en";

const STRINGS = {
  de: {
    // hero
    regOpen: "Anmeldung offen",
    regClosed: "Anmeldung geschlossen",
    regLoading: "Lädt",
    statTeams: "Teams",
    statCourts: "Plätze",
    statHours: "Stunden",
    // registration form
    registerHeading: "Team anmelden",
    registerSubtitle: "Trage dein Team ein. Du siehst es danach direkt in der Liste.",
    teamName: "Team-Name",
    teamNamePh: "z.B. Smash Brothers",
    player1: "Spieler 1",
    player2: "Spieler 2",
    playerPh: "Vor- und Nachname",
    skillLabel: "Spielstärke",
    skillBeginner: "Beginner",
    skillIntermediate: "Intermediate",
    skillAdvanced: "Advanced",
    submitting: "Sende…",
    registerBtn: "Team anmelden",
    successMsg: "Team angemeldet. Wir sehen uns am 18.06.",
    // teams list
    listHeading: "Angemeldete Teams",
    listLoading: "Wird geladen…",
    listEmpty: "Noch niemand angemeldet — sei das erste Team.",
    listCountOne: "{count} Team dabei",
    listCountMany: "{count} Teams dabei",
    listEmptyCard: "Noch keine Teams angemeldet.",
    // closed / loading notices
    closedHeading: "Anmeldung geschlossen",
    closedBody: "{count} Teams sind dabei. Spielplan und Live-Tabelle erscheinen hier am Turniertag.",
    // venue
    sectionDescription: "Beschreibung",
    venueLabel: "Venue",
    courtsLabel: "Padel-Plätze:",
    courtsHint: "Bereich 6 (Padel Outdoor) — südwestlich der Paketposthalle",
    siteMapTitle: "Lageplan Pineapple Park",
    enlarge: "Vergrößern →",
    appleMaps: "Apple Karten",
    googleMaps: "Google Maps",
    // info
    whatsappTitle: "WhatsApp-Gruppe",
    whatsappBody: "Tritt der Cup-Gruppe bei und bleib bei News, Spielplan und Last-Minute-Infos auf dem Laufenden.",
    whatsappCta: "Gruppe beitreten",
    rentTitle: "Schläger vor Ort",
    rentBody: "Du musst keinen Padel-Schläger mitbringen — vor Ort kannst du dir einen ausleihen. Padel-taugliche Sportschuhe (am besten mit hellen Sohlen) sind ratsam.",
    // score / admin
    scoreMode: "Score Mode",
    pinPrompt: "PIN für den iPad-Modus eingeben",
    unlock: "Entsperren",
    checking: "Prüfe…",
    signOut: "Abmelden",
    cardRegistration: "Anmeldung",
    cardOpen: "Offen",
    cardClosed: "Geschlossen",
    closeReg: "Anmeldung schließen",
    openReg: "Anmeldung öffnen",
    publicLink: "Public-Link",
    copy: "Kopieren",
    copied: "Kopiert ✓",
    activeTeams: "Aktive Teams",
    target: "Ziel: 10–12 Teams · {courts} Plätze · {hours}h",
    adminTeamsHeading: "Teams",
    adminTotal: "{count} insgesamt",
    adminLoadingTeams: "Lade Teams…",
    adminNoTeams: "Noch keine Teams.",
    adminEdit: "Edit",
    adminDelete: "Löschen",
    adminSave: "Speichern",
    adminCancel: "Abbrechen",
    confirmDelete: 'Team „{name}" wirklich löschen?',
    bracketHeading: "Bracket & Live-Scoring",
    bracketBody: "Spielplan-Generator und Live-Score-Eintragung folgen, sobald die Anmeldung geschlossen ist und die finale Team-Anzahl steht.",
    // generic
    loadingShort: "Lade…",
  },
  en: {
    regOpen: "Registration open",
    regClosed: "Registration closed",
    regLoading: "Loading",
    statTeams: "Teams",
    statCourts: "Courts",
    statHours: "Hours",
    registerHeading: "Register team",
    registerSubtitle: "Enter your team. You'll see it in the list below.",
    teamName: "Team name",
    teamNamePh: "e.g. Smash Brothers",
    player1: "Player 1",
    player2: "Player 2",
    playerPh: "First and last name",
    skillLabel: "Skill level",
    skillBeginner: "Beginner",
    skillIntermediate: "Intermediate",
    skillAdvanced: "Advanced",
    submitting: "Submitting…",
    registerBtn: "Register team",
    successMsg: "Team registered. See you on June 18.",
    listHeading: "Registered teams",
    listLoading: "Loading…",
    listEmpty: "No teams yet — be the first.",
    listCountOne: "{count} team registered",
    listCountMany: "{count} teams registered",
    listEmptyCard: "No teams registered yet.",
    closedHeading: "Registration closed",
    closedBody: "{count} teams are in. Schedule and live standings appear here on tournament day.",
    sectionDescription: "About",
    venueLabel: "Venue",
    courtsLabel: "Padel courts:",
    courtsHint: "Area 6 (Padel Outdoor) — south-west of the Paketposthalle",
    siteMapTitle: "Site map Pineapple Park",
    enlarge: "Enlarge →",
    appleMaps: "Apple Maps",
    googleMaps: "Google Maps",
    // info
    whatsappTitle: "WhatsApp group",
    whatsappBody: "Join the cup group to stay in the loop on news, schedule and last-minute updates.",
    whatsappCta: "Join group",
    rentTitle: "Rackets on site",
    rentBody: "You don't need to bring your own padel racket — rentals are available on site. Padel-friendly sneakers (ideally with light soles) are recommended.",
    scoreMode: "Score Mode",
    pinPrompt: "Enter the iPad mode PIN",
    unlock: "Unlock",
    checking: "Checking…",
    signOut: "Sign out",
    cardRegistration: "Registration",
    cardOpen: "Open",
    cardClosed: "Closed",
    closeReg: "Close registration",
    openReg: "Open registration",
    publicLink: "Public link",
    copy: "Copy",
    copied: "Copied ✓",
    activeTeams: "Active teams",
    target: "Target: 10–12 teams · {courts} courts · {hours}h",
    adminTeamsHeading: "Teams",
    adminTotal: "{count} total",
    adminLoadingTeams: "Loading teams…",
    adminNoTeams: "No teams yet.",
    adminEdit: "Edit",
    adminDelete: "Delete",
    adminSave: "Save",
    adminCancel: "Cancel",
    confirmDelete: 'Really delete team "{name}"?',
    bracketHeading: "Bracket & Live Scoring",
    bracketBody: "Bracket generator and live score entry will appear once registration is closed and the final team count is set.",
    loadingShort: "Loading…",
  },
} as const;

export type TKey = keyof (typeof STRINGS)["de"];

const LangContext = createContext<{
  lang: Lang;
  setLang: (l: Lang) => void;
} | null>(null);

const STORAGE_KEY = "padel-cup-lang";

function detectInitialLang(): Lang {
  if (typeof window === "undefined") return "de";
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === "en" || saved === "de") return saved;
  const nav = window.navigator.language?.toLowerCase() ?? "de";
  return nav.startsWith("de") ? "de" : "en";
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => detectInitialLang());

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used inside LangProvider");
  return ctx;
}

export function useT() {
  const { lang } = useLang();
  return (key: TKey, vars?: Record<string, string | number>) => {
    let str: string = STRINGS[lang][key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(`{${k}}`, String(v));
      }
    }
    return str;
  };
}

export function formatEventDate(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === "de" ? "de-DE" : "en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}
