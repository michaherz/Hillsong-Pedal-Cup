import { useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Match, Team } from "../lib/database.types";
import { useT } from "../lib/i18n";
import {
  buildSchedule,
  computeStandings,
  finalsComplete,
  isRoundComplete,
  seedKOFinals,
  seedKOSemis,
  seedNextRound,
  seedRound1,
  semisComplete,
  TOTAL_MEXICANO_ROUNDS,
} from "../lib/tournament-engine";

type Settings = {
  registration_open: boolean;
  tournament_phase: "registration" | "mexicano" | "knockout" | "finished";
  current_round: number;
  total_courts: number;
};

type Props = {
  teams: Team[];
  matches: Match[];
  settings: Settings;
};

export default function TournamentPanel({ teams, matches, settings }: Props) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const courts = settings.total_courts || 2;
  const standings = useMemo(
    () => computeStandings(teams, matches),
    [teams, matches],
  );

  const phase = settings.tournament_phase;
  const round = settings.current_round;
  const activeTeamCount = teams.filter((t) => t.status === "active").length;

  async function startMexicano() {
    if (settings.registration_open) {
      setError(t("needRegClosed"));
      return;
    }
    if (activeTeamCount < 4) {
      setError(t("needTeamsMessage"));
      return;
    }
    setBusy(true);
    setError(null);
    const pairings = seedRound1(teams);
    const schedule = buildSchedule(pairings, 1, courts);
    const inserts = schedule.map((s) => ({
      round: s.round,
      wave: s.wave,
      court: s.court,
      team_a_id: s.teamA,
      team_b_id: s.teamB,
      phase: "mexicano" as const,
      bracket_pos: null,
      score_a: null,
      score_b: null,
      status: "scheduled" as const,
      played_at: null,
    }));
    const { error: insErr } = await supabase.from("matches").insert(inserts);
    if (insErr) {
      setError(insErr.message);
      setBusy(false);
      return;
    }
    await supabase
      .from("settings")
      .update({ tournament_phase: "mexicano", current_round: 1 })
      .eq("id", 1);
    setBusy(false);
  }

  async function nextRound() {
    if (round >= TOTAL_MEXICANO_ROUNDS) {
      setError("Mexicano-Phase ist bereits vorbei.");
      return;
    }
    if (!isRoundComplete(matches, round)) {
      setError("Runde noch nicht beendet.");
      return;
    }
    setBusy(true);
    setError(null);
    const pairings = seedNextRound(standings);
    const schedule = buildSchedule(pairings, round + 1, courts);
    const inserts = schedule.map((s) => ({
      round: s.round,
      wave: s.wave,
      court: s.court,
      team_a_id: s.teamA,
      team_b_id: s.teamB,
      phase: "mexicano" as const,
      bracket_pos: null,
      score_a: null,
      score_b: null,
      status: "scheduled" as const,
      played_at: null,
    }));
    const { error: insErr } = await supabase.from("matches").insert(inserts);
    if (insErr) {
      setError(insErr.message);
      setBusy(false);
      return;
    }
    await supabase
      .from("settings")
      .update({ current_round: round + 1 })
      .eq("id", 1);
    setBusy(false);
  }

  async function startKO() {
    if (!isRoundComplete(matches, round)) {
      setError("Letzte Runde noch nicht beendet.");
      return;
    }
    if (standings.length < 4) {
      setError(t("needTeamsMessage"));
      return;
    }
    setBusy(true);
    setError(null);
    const semis = seedKOSemis(standings);
    const inserts = semis.map((s) => ({
      round: 1,
      wave: 1,
      court: s.court,
      team_a_id: s.teamA,
      team_b_id: s.teamB,
      phase: "knockout" as const,
      bracket_pos: s.bracketPos,
      score_a: null,
      score_b: null,
      status: "scheduled" as const,
      played_at: null,
    }));
    const { error: insErr } = await supabase.from("matches").insert(inserts);
    if (insErr) {
      setError(insErr.message);
      setBusy(false);
      return;
    }
    await supabase
      .from("settings")
      .update({ tournament_phase: "knockout", current_round: 1 })
      .eq("id", 1);
    setBusy(false);
  }

  async function startFinals() {
    if (!semisComplete(matches)) {
      setError("Halbfinale noch nicht beendet.");
      return;
    }
    setBusy(true);
    setError(null);
    const finals = seedKOFinals(matches);
    const inserts = finals.map((s) => ({
      round: 2,
      wave: 1,
      court: s.court,
      team_a_id: s.teamA,
      team_b_id: s.teamB,
      phase: "knockout" as const,
      bracket_pos: s.bracketPos,
      score_a: null,
      score_b: null,
      status: "scheduled" as const,
      played_at: null,
    }));
    const { error: insErr } = await supabase.from("matches").insert(inserts);
    if (insErr) {
      setError(insErr.message);
      setBusy(false);
      return;
    }
    await supabase
      .from("settings")
      .update({ current_round: 2 })
      .eq("id", 1);
    setBusy(false);
  }

  async function finishTournament() {
    if (!finalsComplete(matches)) {
      setError("Finale + 3. Platz noch nicht beendet.");
      return;
    }
    setBusy(true);
    await supabase
      .from("settings")
      .update({ tournament_phase: "finished" })
      .eq("id", 1);
    setBusy(false);
  }

  const phaseLabel =
    phase === "registration"
      ? t("phaseRegistration")
      : phase === "mexicano"
        ? t("phaseMexicano", { round })
        : phase === "knockout"
          ? t("phaseKnockout")
          : t("phaseFinished");

  return (
    <section className="border-2 border-outline-variant bg-surface-container p-5">
      <FormatPreview phase={phase} round={round} />

      <header className="mb-6 mt-6 flex items-center justify-between">
        <div>
          <p className="label-caps text-primary">{t("tournamentSection")}</p>
          <h2 className="mt-1 font-display text-headline-md uppercase text-stadium-white">
            {phaseLabel}
          </h2>
        </div>
      </header>

      <div className="flex flex-wrap gap-3">
        {phase === "registration" && (
          <button
            onClick={startMexicano}
            disabled={busy || activeTeamCount < 4 || settings.registration_open}
            className="btn-sm"
          >
            {t("actionStartMexicano")}
          </button>
        )}

        {phase === "mexicano" && round < TOTAL_MEXICANO_ROUNDS && (
          <button
            onClick={nextRound}
            disabled={busy || !isRoundComplete(matches, round)}
            className="btn-sm"
          >
            {t("actionNextRound")}
          </button>
        )}

        {phase === "mexicano" && round >= TOTAL_MEXICANO_ROUNDS && (
          <button
            onClick={startKO}
            disabled={busy || !isRoundComplete(matches, round)}
            className="btn-sm"
          >
            {t("actionStartKO")}
          </button>
        )}

        {phase === "knockout" && round === 1 && (
          <button
            onClick={startFinals}
            disabled={busy || !semisComplete(matches)}
            className="btn-sm"
          >
            {t("actionStartFinals")}
          </button>
        )}

        {phase === "knockout" && round === 2 && (
          <button
            onClick={finishTournament}
            disabled={busy || !finalsComplete(matches)}
            className="btn-sm"
          >
            {t("actionTournamentDone")}
          </button>
        )}
      </div>

      {error && (
        <p className="mt-4 border-2 border-error bg-error-container/40 px-3 py-2 text-sm text-error">
          {error}
        </p>
      )}

      {phase !== "registration" && (
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <MatchesByRound teams={teams} matches={matches} />
          <StandingsAdmin teams={teams} standings={standings} />
        </div>
      )}
    </section>
  );
}

function teamLabel(teams: Team[], id: string | null): string {
  if (!id) return "—";
  const t = teams.find((x) => x.id === id);
  return t ? t.team_name : "?";
}

/* ---------------------------------------------------------- Format Preview */

type Step = "reg" | "r1" | "r2" | "r3" | "ko" | "done";

function FormatPreview({
  phase,
  round,
}: {
  phase: "registration" | "mexicano" | "knockout" | "finished";
  round: number;
}) {
  const t = useT();

  const currentStep: Step =
    phase === "registration"
      ? "reg"
      : phase === "mexicano"
        ? round <= 1
          ? "r1"
          : round === 2
            ? "r2"
            : "r3"
        : phase === "knockout"
          ? "ko"
          : "done";

  const steps: Array<{ key: Step; label: string }> = [
    { key: "reg", label: t("stepReg") },
    { key: "r1", label: t("stepR1") },
    { key: "r2", label: t("stepR2") },
    { key: "r3", label: t("stepR3") },
    { key: "ko", label: t("stepKO") },
    { key: "done", label: t("stepDone") },
  ];

  const order: Step[] = ["reg", "r1", "r2", "r3", "ko", "done"];
  const currentIdx = order.indexOf(currentStep);

  return (
    <div className="border-2 border-primary/40 bg-deep-void p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="label-caps text-primary">{t("formatHeading")}</p>
        <p className="hidden font-mono text-[10px] uppercase tracking-[0.12em] text-on-surface-variant sm:block">
          {t("formatSubtitle")}
        </p>
      </div>

      <ul className="mt-3 space-y-1.5 font-body text-body-sm text-on-surface-variant">
        <li>· {t("formatRule1")}</li>
        <li>· {t("formatRule2")}</li>
        <li>· {t("formatRule3")}</li>
      </ul>

      <div className="mt-4 -mx-1 flex items-center gap-1 overflow-x-auto pb-1 sm:mt-5">
        {steps.map((step, i) => {
          const idx = order.indexOf(step.key);
          const isCurrent = step.key === currentStep;
          const isPast = idx < currentIdx;
          return (
            <div key={step.key} className="flex items-center gap-1">
              <div
                className={`shrink-0 border-2 px-2.5 py-1.5 transition-colors ${
                  isCurrent
                    ? "border-primary bg-primary text-on-primary-container"
                    : isPast
                      ? "border-secondary/60 bg-secondary/10 text-secondary"
                      : "border-outline-variant text-on-surface-variant"
                }`}
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.12em]">
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <span
                  aria-hidden
                  className={`h-0.5 w-3 sm:w-5 ${
                    idx < currentIdx ? "bg-secondary/60" : "bg-outline-variant"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MatchesByRound({
  teams,
  matches,
}: {
  teams: Team[];
  matches: Match[];
}) {
  const t = useT();
  const grouped = useMemo(() => groupMatches(matches), [matches]);
  if (matches.length === 0) {
    return (
      <div className="border-2 border-dashed border-outline-variant p-4 label-caps text-on-surface-variant">
        {t("noMatchesYet")}
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <h3 className="label-caps-lg text-primary">{t("matchesHeading")}</h3>
      {grouped.map(({ key, label, items }) => (
        <div key={key} className="space-y-2">
          <p className="label-caps text-on-surface-variant">{label}</p>
          <ul className="space-y-1.5">
            {items.map((m) => (
              <AdminMatchRow key={m.id} match={m} teams={teams} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function groupMatches(matches: Match[]) {
  const sorted = [...matches].sort((a, b) => {
    if (a.phase !== b.phase) return a.phase === "mexicano" ? -1 : 1;
    if (a.round !== b.round) return a.round - b.round;
    if ((a.wave ?? 0) !== (b.wave ?? 0)) return (a.wave ?? 0) - (b.wave ?? 0);
    return a.court - b.court;
  });
  const groups: { key: string; label: string; items: Match[] }[] = [];
  for (const m of sorted) {
    const key =
      m.phase === "mexicano" ? `mex-${m.round}` : `ko-${m.bracket_pos}`;
    const label =
      m.phase === "mexicano"
        ? `Mexicano R${m.round}`
        : m.bracket_pos === "sf1"
          ? "Halbfinale 1"
          : m.bracket_pos === "sf2"
            ? "Halbfinale 2"
            : m.bracket_pos === "final"
              ? "Finale"
              : "3. Platz";
    let g = groups.find((x) => x.key === key);
    if (!g) {
      g = { key, label, items: [] };
      groups.push(g);
    }
    g.items.push(m);
  }
  return groups;
}

function AdminMatchRow({ match, teams }: { match: Match; teams: Team[] }) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [a, setA] = useState(match.score_a?.toString() ?? "");
  const [b, setB] = useState(match.score_b?.toString() ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    const sa = Number(a);
    const sb = Number(b);
    if (Number.isNaN(sa) || Number.isNaN(sb)) return;
    setBusy(true);
    await supabase
      .from("matches")
      .update({
        score_a: sa,
        score_b: sb,
        status: "done",
        played_at: new Date().toISOString(),
      })
      .eq("id", match.id);
    setBusy(false);
    setEditing(false);
  }

  const teamA = teamLabel(teams, match.team_a_id);
  const teamB = teamLabel(teams, match.team_b_id);
  const scoreText =
    match.status === "done" && match.score_a != null && match.score_b != null
      ? `${match.score_a}–${match.score_b}`
      : "—";

  return (
    <li className="flex items-center gap-2 border-2 border-outline-variant bg-surface-container-high px-3 py-2 text-body-sm">
      <span className="w-14 shrink-0 font-mono label-caps text-on-surface-variant">
        C{match.court}
        {match.wave ? `·W${match.wave}` : ""}
      </span>
      <span className="min-w-0 flex-1 truncate">
        <span className="font-display uppercase text-stadium-white">
          {teamA}
        </span>
        <span className="px-2 label-caps text-on-surface-variant">
          {t("matchVs")}
        </span>
        <span className="font-display uppercase text-stadium-white">
          {teamB}
        </span>
      </span>
      {editing ? (
        <div className="flex shrink-0 items-center gap-1">
          <input
            type="number"
            min={0}
            max={9}
            value={a}
            onChange={(e) => setA(e.target.value)}
            className="w-12 border-2 border-outline-variant bg-surface-container px-2 py-1 text-center text-stadium-white focus:border-primary focus:outline-none"
          />
          <span className="text-on-surface-variant">–</span>
          <input
            type="number"
            min={0}
            max={9}
            value={b}
            onChange={(e) => setB(e.target.value)}
            className="w-12 border-2 border-outline-variant bg-surface-container px-2 py-1 text-center text-stadium-white focus:border-primary focus:outline-none"
          />
          <button
            onClick={save}
            disabled={busy}
            className="bg-secondary px-2 py-1 label-caps text-on-secondary hover:bg-stadium-white disabled:opacity-50"
          >
            ✓
          </button>
          <button
            onClick={() => setEditing(false)}
            className="px-2 py-1 label-caps text-on-surface-variant hover:text-stadium-white"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className={`shrink-0 border-2 px-2.5 py-1 label-caps transition-colors ${
            match.status === "done"
              ? "border-secondary text-secondary hover:bg-secondary hover:text-on-secondary"
              : "border-primary text-primary hover:bg-primary hover:text-on-primary-container"
          }`}
        >
          {scoreText}
        </button>
      )}
    </li>
  );
}

function StandingsAdmin({
  teams,
  standings,
}: {
  teams: Team[];
  standings: ReturnType<typeof computeStandings>;
}) {
  const t = useT();
  return (
    <div className="space-y-3">
      <h3 className="label-caps-lg text-primary">{t("standingsHeading")}</h3>
      <table className="w-full text-body-sm">
        <thead>
          <tr className="label-caps text-on-surface-variant">
            <th className="px-2 py-2 text-left">{t("standingsPos")}</th>
            <th className="px-2 py-2 text-left">{t("standingsTeam")}</th>
            <th className="px-2 py-2 text-right">{t("standingsPlayed")}</th>
            <th className="px-2 py-2 text-right">{t("standingsWL")}</th>
            <th className="px-2 py-2 text-right">{t("standingsGames")}</th>
            <th className="px-2 py-2 text-right">{t("standingsPoints")}</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s) => {
            const team = teams.find((x) => x.id === s.teamId);
            const isPodium = s.position <= 4;
            return (
              <tr
                key={s.teamId}
                className={`border-t-2 border-outline-variant ${
                  isPodium ? "bg-primary/5" : ""
                }`}
              >
                <td className="px-2 py-2 font-mono text-on-surface-variant">
                  {s.position}
                </td>
                <td className="px-2 py-2 truncate font-display uppercase text-stadium-white">
                  {team?.team_name ?? "?"}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-on-surface">
                  {s.played}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-on-surface">
                  {s.wins}-{s.losses}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-on-surface">
                  {s.gamesDiff > 0 ? "+" : ""}
                  {s.gamesDiff}
                </td>
                <td className="px-2 py-2 text-right font-display tabular-nums text-primary">
                  {s.points}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
