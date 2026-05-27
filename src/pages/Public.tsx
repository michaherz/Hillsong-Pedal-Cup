import { useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { TOURNAMENT } from "../lib/tournament";
import { SKILL_LABELS, type SkillLevel } from "../lib/database.types";
import { useSettings, useTeams } from "../lib/hooks";
import TeamList from "../components/TeamList";
import VenueCard from "../components/VenueCard";

const SKILL_OPTIONS: SkillLevel[] = ["beginner", "intermediate", "advanced"];

export default function Public() {
  const teams = useTeams();
  const settings = useSettings();
  const registrationOpen = settings?.registration_open ?? null;

  const activeCount = useMemo(
    () => (teams ?? []).filter((t) => t.status === "active").length,
    [teams],
  );

  return (
    <div className="min-h-full">
      <Hero teamCount={activeCount} registrationOpen={registrationOpen} />

      <main className="mx-auto max-w-3xl px-5 pb-24">
        {registrationOpen === null ? (
          <LoadingNotice />
        ) : registrationOpen ? (
          <RegistrationForm />
        ) : (
          <ClosedNotice teamCount={activeCount} />
        )}

        <section className="mt-10">
          <SectionHeader
            title="Angemeldete Teams"
            subtitle={
              teams === null
                ? "Wird geladen…"
                : activeCount === 0
                  ? "Noch niemand angemeldet — sei das erste Team."
                  : `${activeCount} ${activeCount === 1 ? "Team" : "Teams"} dabei`
            }
          />
          <TeamList teams={teams} />
        </section>

        <section className="mt-10">
          <SectionHeader title="Wo & Wann" />
          <VenueCard />
        </section>
      </main>

      <footer className="border-t border-neutral-200 bg-white/60 py-6 text-center text-xs text-neutral-500">
        Padel Cup MUC · {TOURNAMENT.date} · {TOURNAMENT.venue.name}
      </footer>
    </div>
  );
}

function Hero({
  teamCount,
  registrationOpen,
}: {
  teamCount: number;
  registrationOpen: boolean | null;
}) {
  const dotClass =
    registrationOpen === null
      ? "bg-white/40 animate-pulse"
      : registrationOpen
        ? "bg-emerald-400"
        : "bg-neutral-400";
  const label =
    registrationOpen === null
      ? "Lädt"
      : registrationOpen
        ? "Anmeldung offen"
        : "Anmeldung geschlossen";
  return (
    <header className="relative overflow-hidden bg-gradient-to-b from-court-600 to-court-800 px-5 pb-14 pt-16 text-white sm:pt-24">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 0%, white 0, transparent 40%), radial-gradient(circle at 90% 100%, white 0, transparent 35%)",
        }}
      />
      <div className="relative mx-auto max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-wider backdrop-blur">
          <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
          {label}
        </div>
        <div className="mt-4 flex items-center gap-4 sm:gap-6">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Padel Cup MUC
          </h1>
          <img
            src="/hillsong-logo.png"
            alt="Hillsong"
            className="h-14 w-14 shrink-0 sm:h-20 sm:w-20"
          />
        </div>
        <div className="mt-3 space-y-0.5 text-base text-white/80 sm:text-xl">
          <p>
            {TOURNAMENT.date} · {TOURNAMENT.startTime} Uhr
          </p>
          <p>{TOURNAMENT.venue.name}</p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <Stat label="Teams" value={teamCount.toString()} />
          <Stat label="Plätze" value={TOURNAMENT.courts.toString()} />
          <Stat label="Stunden" value={TOURNAMENT.durationHours.toString()} />
        </div>
      </div>
    </header>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 px-4 py-2 backdrop-blur">
      <div className="text-2xl font-bold leading-tight">{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-white/70">
        {label}
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-4 flex items-baseline justify-between">
      <h2 className="text-xl font-semibold text-neutral-900">{title}</h2>
      {subtitle && <p className="text-sm text-neutral-500">{subtitle}</p>}
    </div>
  );
}

function ClosedNotice({ teamCount }: { teamCount: number }) {
  return (
    <div className="card relative z-10 -mt-6 p-6 sm:-mt-10 sm:p-8">
      <h2 className="text-lg font-semibold">Anmeldung geschlossen</h2>
      <p className="mt-1 text-sm text-neutral-600">
        {teamCount} Teams sind dabei. Spielplan und Live-Tabelle erscheinen hier
        am Turniertag.
      </p>
    </div>
  );
}

function LoadingNotice() {
  return (
    <div className="card relative z-10 -mt-6 p-6 sm:-mt-10 sm:p-8">
      <div className="h-4 w-40 animate-pulse rounded bg-neutral-100" />
      <div className="mt-3 h-3 w-64 animate-pulse rounded bg-neutral-100" />
    </div>
  );
}

function RegistrationForm() {
  const [teamName, setTeamName] = useState("");
  const [player1, setPlayer1] = useState("");
  const [player2, setPlayer2] = useState("");
  const [skill, setSkill] = useState<SkillLevel>("intermediate");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const valid =
    teamName.trim().length >= 2 &&
    player1.trim().length >= 2 &&
    player2.trim().length >= 2;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    const { error: insertError } = await supabase.from("teams").insert({
      team_name: teamName.trim(),
      player_1: player1.trim(),
      player_2: player2.trim(),
      skill_level: skill,
    });
    setSubmitting(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setSuccess(true);
    setTeamName("");
    setPlayer1("");
    setPlayer2("");
    setSkill("intermediate");
    setTimeout(() => setSuccess(false), 4000);
  }

  return (
    <form onSubmit={submit} className="card relative z-10 -mt-6 p-6 sm:-mt-10 sm:p-8">
      <h2 className="text-lg font-semibold">Team anmelden</h2>
      <p className="mt-1 text-sm text-neutral-600">
        Trage dein Team ein. Du siehst es danach direkt in der Liste.
      </p>

      <div className="mt-5 space-y-4">
        <div>
          <label className="label" htmlFor="team_name">
            Team-Name
          </label>
          <input
            id="team_name"
            className="input"
            placeholder="z.B. Smash Brothers"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            maxLength={60}
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="player_1">
              Spieler 1
            </label>
            <input
              id="player_1"
              className="input"
              placeholder="Vor- und Nachname"
              value={player1}
              onChange={(e) => setPlayer1(e.target.value)}
              maxLength={60}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="player_2">
              Spieler 2
            </label>
            <input
              id="player_2"
              className="input"
              placeholder="Vor- und Nachname"
              value={player2}
              onChange={(e) => setPlayer2(e.target.value)}
              maxLength={60}
              required
            />
          </div>
        </div>

        <div>
          <span className="label">Spielstärke</span>
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-neutral-100 p-1">
            {SKILL_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setSkill(opt)}
                className={`rounded-lg py-2 text-sm font-medium transition ${
                  skill === opt
                    ? "bg-white text-court-700 shadow-sm"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                {SKILL_LABELS[opt]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-100">
          Team angemeldet. Wir sehen uns am 18.06.
        </p>
      )}

      <div className="mt-6 flex items-center justify-end">
        <button
          type="submit"
          disabled={!valid || submitting}
          className="btn-primary"
        >
          {submitting ? "Sende…" : "Team anmelden"}
        </button>
      </div>
    </form>
  );
}
