import { useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import type { BracketPos, Match, Team } from "../lib/database.types";
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
    <section className="card p-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">{t("tournamentSection")}</h2>
          <p className="mt-0.5 text-sm text-neutral-500">{phaseLabel}</p>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {phase === "registration" && (
          <button
            onClick={startMexicano}
            disabled={busy || activeTeamCount < 4 || settings.registration_open}
            className="btn-primary"
          >
            {t("actionStartMexicano")}
          </button>
        )}

        {phase === "mexicano" && round < TOTAL_MEXICANO_ROUNDS && (
          <button
            onClick={nextRound}
            disabled={busy || !isRoundComplete(matches, round)}
            className="btn-primary"
          >
            {t("actionNextRound")}
          </button>
        )}

        {phase === "mexicano" && round >= TOTAL_MEXICANO_ROUNDS && (
          <button
            onClick={startKO}
            disabled={busy || !isRoundComplete(matches, round)}
            className="btn-primary"
          >
            {t("actionStartKO")}
          </button>
        )}

        {phase === "knockout" && round === 1 && (
          <button
            onClick={startFinals}
            disabled={busy || !semisComplete(matches)}
            className="btn-primary"
          >
            {t("actionStartFinals")}
          </button>
        )}

        {phase === "knockout" && round === 2 && (
          <button
            onClick={finishTournament}
            disabled={busy || !finalsComplete(matches)}
            className="btn-primary"
          >
            {t("actionTournamentDone")}
          </button>
        )}
      </div>

      {error && (
        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {phase !== "registration" && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
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
      <div className="rounded-xl bg-neutral-50 p-4 text-sm text-neutral-500">
        {t("noMatchesYet")}
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">{t("matchesHeading")}</h3>
      {grouped.map(({ key, label, items }) => (
        <div key={key} className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            {label}
          </p>
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
      m.phase === "mexicano"
        ? `mex-${m.round}`
        : `ko-${m.bracket_pos}`;
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
    <li className="flex items-center gap-2 rounded-xl bg-neutral-50 px-3 py-2 text-sm">
      <span className="w-12 shrink-0 font-mono text-xs text-neutral-500">
        C{match.court}
        {match.wave ? `·W${match.wave}` : ""}
      </span>
      <span className="min-w-0 flex-1 truncate">
        <span className="font-medium">{teamA}</span>
        <span className="px-2 text-neutral-400">{t("matchVs")}</span>
        <span className="font-medium">{teamB}</span>
      </span>
      {editing ? (
        <div className="flex shrink-0 items-center gap-1">
          <input
            type="number"
            min={0}
            max={9}
            value={a}
            onChange={(e) => setA(e.target.value)}
            className="w-12 rounded-lg border-0 bg-white px-2 py-1 text-center ring-1 ring-neutral-200 focus:ring-2 focus:ring-court-500 focus:outline-none"
          />
          <span>–</span>
          <input
            type="number"
            min={0}
            max={9}
            value={b}
            onChange={(e) => setB(e.target.value)}
            className="w-12 rounded-lg border-0 bg-white px-2 py-1 text-center ring-1 ring-neutral-200 focus:ring-2 focus:ring-court-500 focus:outline-none"
          />
          <button
            onClick={save}
            disabled={busy}
            className="rounded-lg bg-court-500 px-2 py-1 text-xs font-semibold text-white hover:bg-court-600 disabled:opacity-50"
          >
            ✓
          </button>
          <button
            onClick={() => setEditing(false)}
            className="rounded-lg px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-200"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold ${
            match.status === "done"
              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              : "bg-court-50 text-court-700 hover:bg-court-100"
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
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">{t("standingsHeading")}</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wider text-neutral-500">
            <th className="px-2 py-1.5 text-left">{t("standingsPos")}</th>
            <th className="px-2 py-1.5 text-left">{t("standingsTeam")}</th>
            <th className="px-2 py-1.5 text-right">{t("standingsPlayed")}</th>
            <th className="px-2 py-1.5 text-right">{t("standingsWL")}</th>
            <th className="px-2 py-1.5 text-right">{t("standingsGames")}</th>
            <th className="px-2 py-1.5 text-right">{t("standingsPoints")}</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s) => {
            const team = teams.find((x) => x.id === s.teamId);
            const isPodium = s.position <= 4;
            return (
              <tr
                key={s.teamId}
                className={`border-t border-neutral-100 ${
                  isPodium ? "bg-court-50/40" : ""
                }`}
              >
                <td className="px-2 py-2 font-mono">{s.position}</td>
                <td className="px-2 py-2 truncate font-medium">
                  {team?.team_name ?? "?"}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {s.played}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {s.wins}-{s.losses}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {s.gamesDiff > 0 ? "+" : ""}
                  {s.gamesDiff}
                </td>
                <td className="px-2 py-2 text-right font-semibold tabular-nums">
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

// helper used by panel: bracket position label
export function bracketLabel(pos: BracketPos): string {
  switch (pos) {
    case "sf1":
      return "SF1";
    case "sf2":
      return "SF2";
    case "final":
      return "Finale";
    case "third":
      return "3. Platz";
  }
}
