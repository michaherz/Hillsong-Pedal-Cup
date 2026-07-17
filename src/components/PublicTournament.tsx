import { useMemo } from "react";
import type { Division, Match, Team, TournamentMode, TournamentPhase } from "../lib/database.types";
import {
  computeDivisionStandings,
  computeSwissStandings,
  type Standing,
} from "../lib/tournament-engine";
import { useT } from "../lib/i18n";

type Props = {
  teams: Team[];
  matches: Match[];
  phase: TournamentPhase;
  mode?: TournamentMode;
};

const DIVISIONS: Division[] = ["ober", "unter"];

export default function PublicTournament({ teams, matches, phase, mode = "box" }: Props) {
  if (phase === "registration") return null;
  if (mode === "swiss") {
    return <SwissPublicTournament teams={teams} matches={matches} phase={phase} />;
  }
  return <BoxPublicTournament teams={teams} matches={matches} phase={phase} />;
}

function BoxPublicTournament({ teams, matches, phase }: Props) {
  const t = useT();
  const standingsByDiv = useMemo(
    () => ({
      ober: computeDivisionStandings(teams, matches, "ober"),
      unter: computeDivisionStandings(teams, matches, "unter"),
    }),
    [teams, matches],
  );

  const showFinals = phase === "final" || phase === "finished";

  return (
    <section
      id="tournament"
      className="mx-auto w-full max-w-[1440px] scroll-mt-24 px-5 pb-16 sm:scroll-mt-28 sm:px-12 sm:pb-24"
    >
      <div className="mb-6 sm:mb-10">
        <p className="label-caps-lg text-primary">
          {t("tournamentSection")}
        </p>
        <h2 className="mt-2 font-display text-display-md uppercase leading-none text-stadium-white sm:text-display-lg">
          {t("standingsHeading")}
        </h2>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {DIVISIONS.map((div) => (
          <div key={div} className="space-y-6">
            <StandingsBoard
              title={divisionLabel(t, div)}
              standings={standingsByDiv[div]}
              teams={teams}
            />
            {showFinals && (
              <DivisionFinals division={div} teams={teams} matches={matches} />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- Swiss public */

function SwissPublicTournament({ teams, matches, phase }: Props) {
  const t = useT();
  const standings = useMemo(
    () => computeSwissStandings(teams, matches),
    [teams, matches],
  );
  const showKO = phase === "knockout" || phase === "finished";

  return (
    <section
      id="tournament"
      className="mx-auto w-full max-w-[1440px] scroll-mt-24 px-5 pb-16 sm:scroll-mt-28 sm:px-12 sm:pb-24"
    >
      <div className="mb-6 sm:mb-10">
        <p className="label-caps-lg text-primary">{t("tournamentSection")}</p>
        <h2 className="mt-2 font-display text-display-md uppercase leading-none text-stadium-white sm:text-display-lg">
          {t("standingsHeading")}
        </h2>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <StandingsBoard
          title={t("standingsHeading")}
          standings={standings}
          teams={teams}
          podium={4}
        />
        {showKO && <SwissBracket teams={teams} matches={matches} />}
      </div>
    </section>
  );
}

function SwissBracket({ teams, matches }: { teams: Team[]; matches: Match[] }) {
  const t = useT();
  const find = (pos: "sf1" | "sf2" | "final" | "third") =>
    matches.find((m) => m.phase === "knockout" && m.bracket_pos === pos) ?? null;
  const sf1 = find("sf1");
  const sf2 = find("sf2");
  const final = find("final");
  const third = find("third");
  if (!sf1 && !sf2 && !final && !third) return null;
  return (
    <div className="border-2 border-outline-variant bg-surface-container">
      <header className="border-b-2 border-outline-variant px-5 py-4 sm:px-6">
        <h3 className="font-display text-headline-sm uppercase text-stadium-white sm:text-headline-md">
          {t("bracketSemifinals")} + {t("finalsHeading")}
        </h3>
      </header>
      <div className="space-y-3 p-5">
        {sf1 ? (
          <FinalCard teams={teams} match={sf1} label={t("bracketSF", { n: 1 })} />
        ) : (
          <PlaceholderCard label={t("bracketSF", { n: 1 })} />
        )}
        {sf2 ? (
          <FinalCard teams={teams} match={sf2} label={t("bracketSF", { n: 2 })} />
        ) : (
          <PlaceholderCard label={t("bracketSF", { n: 2 })} />
        )}
        {final ? (
          <FinalCard teams={teams} match={final} label={t("bracketFinal")} highlight />
        ) : (
          <PlaceholderCard label={t("bracketFinal")} />
        )}
        {third ? (
          <FinalCard teams={teams} match={third} label={t("bracketThird")} />
        ) : (
          <PlaceholderCard label={t("bracketThird")} />
        )}
      </div>
    </div>
  );
}

function teamName(teams: Team[], id: string | null | undefined): string {
  if (!id) return "—";
  return teams.find((t) => t.id === id)?.team_name ?? "?";
}

function teamIsDemo(teams: Team[], id: string | null | undefined): boolean {
  if (!id) return false;
  return teams.find((t) => t.id === id)?.is_demo === true;
}

function divisionLabel(t: ReturnType<typeof useT>, div: Division): string {
  return div === "ober" ? t("divisionOber") : t("divisionUnter");
}

/* ---------------------------------------------------------- Standings */

function StandingsBoard({
  title,
  standings,
  teams,
  podium = 2,
}: {
  title: string;
  standings: Standing[];
  teams: Team[];
  podium?: number;
}) {
  const t = useT();
  return (
    <div className="border-2 border-outline-variant bg-surface-container">
      <header className="flex items-center justify-between border-b-2 border-outline-variant px-5 py-4 sm:px-6">
        <h3 className="font-display text-headline-sm uppercase text-stadium-white sm:text-headline-md">
          {title}
        </h3>
        <p className="label-caps text-on-surface-variant">
          {t("adminTotal", { count: standings.length })}
        </p>
      </header>
      {standings.length === 0 ? (
        <div className="p-6 text-center label-caps text-on-surface-variant">
          {t("noMatchesYet")}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-body-sm">
            <thead>
              <tr className="label-caps text-on-surface-variant">
                <th className="px-3 py-3 text-left sm:px-5">
                  {t("standingsPos")}
                </th>
                <th className="px-3 py-3 text-left sm:px-5">
                  {t("standingsTeam")}
                </th>
                <th className="px-3 py-3 text-right sm:px-5">
                  {t("standingsPlayed")}
                </th>
                <th className="hidden px-3 py-3 text-right sm:table-cell sm:px-5">
                  {t("standingsWL")}
                </th>
                <th className="px-3 py-3 text-right sm:px-5">
                  {t("standingsGames")}
                </th>
                <th className="px-3 py-3 text-right sm:px-5">
                  {t("standingsPoints")}
                </th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s) => {
                const isPodium = s.position <= podium;
                return (
                  <tr
                    key={s.teamId}
                    className={`border-t-2 border-outline-variant transition-colors ${
                      isPodium ? "bg-primary/5" : ""
                    }`}
                  >
                    <td className="px-3 py-3 font-mono text-on-surface-variant sm:px-5">
                      {isPodium && (
                        <span className="mr-2 inline-block h-1.5 w-1.5 -translate-y-0.5 rounded-full bg-primary" />
                      )}
                      {s.position}
                    </td>
                    <td className="truncate px-3 py-3 font-display uppercase text-stadium-white sm:px-5 sm:text-headline-sm">
                      <span className="inline-flex items-center gap-2">
                        {teamName(teams, s.teamId)}
                        {teamIsDemo(teams, s.teamId) && (
                          <span className="label-caps border-2 border-tertiary bg-tertiary/15 px-1.5 py-0 text-[10px] text-tertiary">
                            DEMO
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-on-surface sm:px-5">
                      {s.played}
                    </td>
                    <td className="hidden px-3 py-3 text-right tabular-nums text-on-surface sm:table-cell sm:px-5">
                      {s.wins}-{s.losses}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-on-surface sm:px-5">
                      {s.gamesDiff > 0 ? "+" : ""}
                      {s.gamesDiff}
                    </td>
                    <td className="px-3 py-3 text-right font-display tabular-nums text-primary sm:px-5 sm:text-headline-sm">
                      {s.points}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------- Division finals */

function DivisionFinals({
  division,
  teams,
  matches,
}: {
  division: Division;
  teams: Team[];
  matches: Match[];
}) {
  const t = useT();
  const final = matches.find(
    (m) => m.phase === "final" && m.division === division && m.bracket_pos === "final",
  );
  const third = matches.find(
    (m) => m.phase === "final" && m.division === division && m.bracket_pos === "third",
  );
  if (!final && !third) return null;
  return (
    <div className="border-2 border-outline-variant bg-surface-container">
      <header className="border-b-2 border-outline-variant px-5 py-4 sm:px-6">
        <h3 className="font-display text-headline-sm uppercase text-stadium-white sm:text-headline-md">
          {divisionLabel(t, division)} · {t("finalsHeading")}
        </h3>
      </header>
      <div className="space-y-3 p-5">
        {final ? (
          <FinalCard teams={teams} match={final} label={t("bracketFinal")} highlight />
        ) : (
          <PlaceholderCard label={t("bracketFinal")} />
        )}
        {third ? (
          <FinalCard teams={teams} match={third} label={t("bracketThird")} />
        ) : (
          <PlaceholderCard label={t("bracketThird")} />
        )}
      </div>
    </div>
  );
}

function FinalCard({
  teams,
  match,
  label,
  highlight,
}: {
  teams: Team[];
  match: Match;
  label: string;
  highlight?: boolean;
}) {
  const t = useT();
  const teamA = teamName(teams, match.team_a_id);
  const teamB = teamName(teams, match.team_b_id);
  const done = match.status === "done";
  const aWin = done && match.sets_a > match.sets_b;
  const bWin = done && match.sets_b > match.sets_a;
  const setList = match.set_history.map((s) => `${s.a}-${s.b}`).join(", ");
  return (
    <div
      className={`border-2 ${
        highlight
          ? "border-primary bg-deep-void shadow-hard-sm"
          : "border-outline-variant bg-surface-container-high"
      }`}
    >
      <div className="flex items-center justify-between border-b-2 border-outline-variant px-3 py-1.5">
        <p className="label-caps text-on-surface-variant">{label}</p>
      </div>
      <ul className="divide-y-2 divide-outline-variant">
        <TeamLine name={teamA} sets={match.sets_a} winner={aWin} />
        <TeamLine name={teamB} sets={match.sets_b} winner={bWin} />
      </ul>
      {done && setList && (
        <p className="border-t-2 border-outline-variant bg-surface-container px-3 py-1 font-mono text-[11px] tabular-nums text-on-surface-variant">
          {setList}
        </p>
      )}
      {match.status === "scheduled" && (
        <p className="border-t-2 border-outline-variant bg-surface-container px-3 py-1 label-caps text-tertiary">
          {t("matchScheduled")}
        </p>
      )}
      {match.status === "in_progress" && (
        <p className="flex items-center gap-1.5 border-t-2 border-secondary bg-secondary/10 px-3 py-1 label-caps text-secondary">
          <span className="inline-block h-1.5 w-1.5 animate-pulse-glow rounded-full bg-secondary" />
          LIVE
        </p>
      )}
    </div>
  );
}

function TeamLine({
  name,
  sets,
  winner,
}: {
  name: string;
  sets: number;
  winner: boolean;
}) {
  return (
    <li
      className={`flex items-center justify-between gap-3 px-3 py-2 ${
        winner ? "bg-primary/10" : ""
      }`}
    >
      <span
        className={`min-w-0 truncate font-display uppercase ${
          winner ? "text-primary" : "text-stadium-white"
        }`}
      >
        {name}
      </span>
      <span
        className={`shrink-0 font-mono tabular-nums text-headline-sm ${
          winner ? "text-primary" : "text-on-surface-variant"
        }`}
      >
        {sets}
      </span>
    </li>
  );
}

function PlaceholderCard({ label }: { label: string }) {
  return (
    <div className="border-2 border-dashed border-outline-variant bg-surface-container/40 px-3 py-3">
      <p className="label-caps text-on-surface-variant">{label}</p>
      <p className="mt-2 font-display uppercase text-on-surface-variant/60">TBD</p>
    </div>
  );
}

