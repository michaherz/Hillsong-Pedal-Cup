import { useMemo } from "react";
import type { Match, Team, TournamentPhase } from "../lib/database.types";
import { computeStandings, type Standing } from "../lib/tournament-engine";
import { useT } from "../lib/i18n";

type Props = {
  teams: Team[];
  matches: Match[];
  phase: TournamentPhase;
};

export default function PublicTournament({ teams, matches, phase }: Props) {
  const t = useT();
  const standings = useMemo(
    () => computeStandings(teams, matches),
    [teams, matches],
  );

  if (phase === "registration") return null;

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
          {t("standingsHeading")} &amp; Bracket
        </h2>
      </div>

      <div className="space-y-8">
        <StandingsBoard standings={standings} teams={teams} />

        {(phase === "knockout" || phase === "finished") && (
          <BracketBoard teams={teams} matches={matches} />
        )}
      </div>
    </section>
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

/* ---------------------------------------------------------- Standings */

function StandingsBoard({
  standings,
  teams,
}: {
  standings: Standing[];
  teams: Team[];
}) {
  const t = useT();
  if (standings.length === 0) {
    return (
      <div className="border-2 border-dashed border-outline-variant bg-surface-container p-8 text-center">
        <p className="label-caps text-on-surface-variant">
          {t("noMatchesYet")}
        </p>
      </div>
    );
  }
  return (
    <div className="border-2 border-outline-variant bg-surface-container">
      <header className="flex items-center justify-between border-b-2 border-outline-variant px-5 py-4 sm:px-6">
        <h3 className="font-display text-headline-sm uppercase text-stadium-white sm:text-headline-md">
          {t("standingsHeading")}
        </h3>
        <p className="label-caps text-on-surface-variant">
          {t("adminTotal", { count: standings.length })}
        </p>
      </header>
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
              const isPodium = s.position <= 4;
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
    </div>
  );
}

/* ---------------------------------------------------------- Bracket */

function BracketBoard({ teams, matches }: { teams: Team[]; matches: Match[] }) {
  const t = useT();
  const sf1 = matches.find(
    (m) => m.phase === "knockout" && m.bracket_pos === "sf1",
  );
  const sf2 = matches.find(
    (m) => m.phase === "knockout" && m.bracket_pos === "sf2",
  );
  const final = matches.find(
    (m) => m.phase === "knockout" && m.bracket_pos === "final",
  );
  const third = matches.find(
    (m) => m.phase === "knockout" && m.bracket_pos === "third",
  );

  return (
    <div className="border-2 border-outline-variant bg-surface-container">
      <header className="border-b-2 border-outline-variant px-5 py-4 sm:px-6">
        <h3 className="font-display text-headline-sm uppercase text-stadium-white sm:text-headline-md">
          KO-Bracket
        </h3>
      </header>

      <div className="overflow-x-auto">
        {/* Mobile: stacked vertical view */}
        <div className="space-y-4 p-5 sm:hidden">
          <BracketColumn label={t("bracketSemifinals")}>
            {sf1 && <MatchCard teams={teams} match={sf1} label="SF 1" />}
            {sf2 && <MatchCard teams={teams} match={sf2} label="SF 2" />}
          </BracketColumn>
          <BracketColumn label="Finale">
            {final ? (
              <MatchCard teams={teams} match={final} label="Finale" highlight />
            ) : (
              <PlaceholderCard label="Finale" />
            )}
          </BracketColumn>
          <BracketColumn label="3. Platz">
            {third ? (
              <MatchCard teams={teams} match={third} label="3. Platz" />
            ) : (
              <PlaceholderCard label="3. Platz" />
            )}
          </BracketColumn>
        </div>

        {/* Desktop: left-to-right tree */}
        <div className="hidden p-6 sm:block lg:p-8">
          <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-4 lg:gap-8">
            {/* Column 1: Semifinals */}
            <div className="flex flex-col gap-12 lg:gap-20">
              {sf1 ? (
                <MatchCard teams={teams} match={sf1} label={t("bracketSF", { n: 1 })} />
              ) : (
                <PlaceholderCard label={t("bracketSF", { n: 1 })} />
              )}
              {sf2 ? (
                <MatchCard teams={teams} match={sf2} label={t("bracketSF", { n: 2 })} />
              ) : (
                <PlaceholderCard label={t("bracketSF", { n: 2 })} />
              )}
            </div>

            {/* Connector 1: SF → Final */}
            <BracketConnector />

            {/* Column 2: Final */}
            <div className="flex justify-center">
              {final ? (
                <MatchCard
                  teams={teams}
                  match={final}
                  label="Finale"
                  highlight
                />
              ) : (
                <PlaceholderCard label="Finale" />
              )}
            </div>

            {/* Connector 2: Final → Champion */}
            <ChampionArrow />

            {/* Column 3: Champion */}
            <div className="flex justify-center">
              <ChampionCard teams={teams} match={final} />
            </div>
          </div>

          {/* Third-place row below the main bracket */}
          <div className="mt-10 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-4 border-t-2 border-outline-variant pt-8 lg:gap-8">
            <div className="col-start-1 flex justify-end">
              {third ? (
                <MatchCard teams={teams} match={third} label="3. Platz" />
              ) : (
                <PlaceholderCard label="3. Platz" />
              )}
            </div>
            <div className="col-start-2 flex items-center">
              <span className="label-caps px-4 text-tertiary">→</span>
            </div>
            <div className="col-start-3 flex justify-center">
              <ThirdCard teams={teams} match={third} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BracketColumn({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="label-caps mb-3 text-on-surface-variant">{label}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function BracketConnector() {
  return (
    <div
      aria-hidden
      className="relative h-32 w-12 lg:h-48 lg:w-16"
      style={{
        borderTop: "2px solid #3f4850",
        borderBottom: "2px solid #3f4850",
        borderRight: "2px solid #3f4850",
      }}
    >
      <div
        className="absolute right-0 top-1/2 h-0.5 w-4 lg:w-6"
        style={{ background: "#3f4850" }}
      />
    </div>
  );
}

function ChampionArrow() {
  return (
    <div aria-hidden className="flex items-center">
      <span className="font-display text-2xl text-primary lg:text-headline-md">
        →
      </span>
    </div>
  );
}

function MatchCard({
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
      className={`min-w-[200px] border-2 transition-all ${
        highlight
          ? "border-primary bg-deep-void shadow-hard-sm"
          : "border-outline-variant bg-surface-container-high"
      }`}
    >
      <div className="flex items-center justify-between border-b-2 border-outline-variant px-3 py-1.5">
        <p className="label-caps text-on-surface-variant">{label}</p>
        {match.best_of === 3 && (
          <span className="label-caps border-2 border-tertiary/60 px-1.5 py-0 text-[10px] text-tertiary">
            BO3
          </span>
        )}
      </div>
      <ul className="divide-y-2 divide-outline-variant">
        <TeamLine
          name={teamA}
          sets={match.sets_a}
          current={done ? null : match.current_a}
          winner={aWin}
        />
        <TeamLine
          name={teamB}
          sets={match.sets_b}
          current={done ? null : match.current_b}
          winner={bWin}
        />
      </ul>
      {done && setList && (
        <p className="border-t-2 border-outline-variant bg-surface-container px-3 py-1 font-mono text-[11px] tabular-nums text-on-surface-variant">
          {setList}
        </p>
      )}
      {!done && match.status === "scheduled" && (
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
  current,
  winner,
}: {
  name: string;
  sets: number;
  current: number | null;
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
      <span className="flex shrink-0 items-baseline gap-2 font-mono tabular-nums">
        <span
          className={`text-headline-sm ${
            winner ? "text-primary" : "text-on-surface-variant"
          }`}
        >
          {sets}
        </span>
        {current != null && (
          <span className="text-on-surface-variant text-body-sm">· {current}</span>
        )}
      </span>
    </li>
  );
}

function PlaceholderCard({ label }: { label: string }) {
  return (
    <div className="min-w-[200px] border-2 border-dashed border-outline-variant bg-surface-container/40 px-3 py-3">
      <p className="label-caps text-on-surface-variant">{label}</p>
      <p className="mt-2 font-display uppercase text-on-surface-variant/60">
        TBD
      </p>
    </div>
  );
}

function ChampionCard({
  teams,
  match,
}: {
  teams: Team[];
  match: Match | undefined;
}) {
  const t = useT();
  if (!match || match.status !== "done") {
    return (
      <div className="min-w-[160px] border-2 border-dashed border-tertiary/40 bg-deep-void px-4 py-6 text-center">
        <p className="label-caps text-tertiary">{t("winner")}</p>
        <p className="mt-2 font-display text-headline-md uppercase text-on-surface-variant/60">
          🏆
        </p>
      </div>
    );
  }
  const champId =
    match.sets_a > match.sets_b ? match.team_a_id : match.team_b_id;
  return (
    <div className="min-w-[180px] border-2 border-tertiary bg-deep-void px-4 py-5 text-center shadow-hard-tertiary">
      <p className="label-caps text-tertiary">{t("winner")}</p>
      <p className="mt-2 font-display text-headline-md uppercase leading-none text-stadium-white sm:text-headline-lg">
        {teamName(teams, champId)}
      </p>
      <p className="mt-2 text-2xl">🏆</p>
    </div>
  );
}

function ThirdCard({
  teams,
  match,
}: {
  teams: Team[];
  match: Match | undefined;
}) {
  const t = useT();
  if (!match || match.status !== "done") {
    return (
      <div className="min-w-[160px] border-2 border-dashed border-secondary/40 bg-deep-void px-4 py-4 text-center">
        <p className="label-caps text-secondary">{t("third")}</p>
        <p className="mt-2 font-display text-headline-sm uppercase text-on-surface-variant/60">
          TBD
        </p>
      </div>
    );
  }
  const winId =
    match.sets_a > match.sets_b ? match.team_a_id : match.team_b_id;
  return (
    <div className="min-w-[160px] border-2 border-secondary bg-deep-void px-4 py-4 text-center">
      <p className="label-caps text-secondary">{t("third")}</p>
      <p className="mt-2 font-display text-headline-sm uppercase leading-none text-stadium-white sm:text-headline-md">
        {teamName(teams, winId)}
      </p>
    </div>
  );
}
