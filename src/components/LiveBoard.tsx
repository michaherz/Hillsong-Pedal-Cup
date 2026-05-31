import { useMemo } from "react";
import type { Match, Team, TournamentPhase } from "../lib/database.types";
import { useT } from "../lib/i18n";

type Props = {
  teams: Team[];
  matches: Match[];
  phase: TournamentPhase;
  currentRound: number;
  totalCourts: number;
};

/**
 * Public courtside live-board. For each court:
 *   - "Now": match with status=in_progress, or oldest scheduled in current phase/round.
 *   - "Up next": next scheduled match on that court (next wave or next round).
 * Realtime via the matches subscription on the parent.
 */
export default function LiveBoard({
  teams,
  matches,
  phase,
  currentRound,
  totalCourts,
}: Props) {
  const t = useT();
  const courts = Array.from({ length: Math.max(totalCourts, 1) }, (_, i) => i + 1);

  const perCourt = useMemo(() => {
    return courts.map((court) => pickCourtSlots(matches, court, phase, currentRound));
  }, [matches, courts, phase, currentRound]);

  // Hide entirely if there are no matches yet (registration safety).
  if (matches.length === 0) return null;

  return (
    <section
      id="live"
      className="mx-auto w-full max-w-[1440px] scroll-mt-24 px-5 pb-16 sm:scroll-mt-28 sm:px-12 sm:pb-24"
    >
      <div className="mb-6 flex items-end justify-between sm:mb-10">
        <div>
          <p className="label-caps-lg flex items-center gap-2 text-secondary">
            <span className="inline-block h-2 w-2 animate-pulse-glow rounded-full bg-secondary" />
            {t("liveBoardHeading")}
          </p>
          <h2 className="mt-2 font-display text-display-md uppercase leading-none text-stadium-white sm:text-display-lg">
            {t("nowPlaying")} &amp; {t("upNext")}
          </h2>
        </div>
        <p className="hidden font-mono text-[10px] uppercase tracking-[0.12em] text-on-surface-variant sm:block">
          {t("liveBoardSubtitle")}
        </p>
      </div>

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        {perCourt.map(({ now, next }, idx) => (
          <CourtCard
            key={courts[idx]}
            court={courts[idx]}
            now={now}
            next={next}
            teams={teams}
          />
        ))}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- Slot picking */

type Slots = { now: Match | null; next: Match | null };

function pickCourtSlots(
  matches: Match[],
  court: number,
  phase: TournamentPhase,
  currentRound: number,
): Slots {
  const courtMatches = matches.filter((m) => m.court === court);
  if (courtMatches.length === 0) return { now: null, next: null };

  // 1. In-progress wins.
  const inProgress = courtMatches.find((m) => m.status === "in_progress");

  // 2. For "now" candidates: prefer current phase + current round, scheduled.
  //    Sort by wave asc.
  const sortedScheduled = [...courtMatches]
    .filter((m) => m.status === "scheduled")
    .sort((a, b) => {
      // Current phase first
      const aPhaseMatches = matchesActivePhase(a, phase);
      const bPhaseMatches = matchesActivePhase(b, phase);
      if (aPhaseMatches !== bPhaseMatches) return aPhaseMatches ? -1 : 1;
      // Same phase: lower round first
      if (a.round !== b.round) return a.round - b.round;
      // Same round: lower wave first
      return (a.wave ?? 0) - (b.wave ?? 0);
    });

  // Prefer phase-matching scheduled matches for "current round".
  const phaseScheduled = sortedScheduled.filter((m) =>
    matchesActivePhaseAndRound(m, phase, currentRound),
  );

  let now: Match | null = inProgress ?? null;
  let next: Match | null = null;

  if (now) {
    // Up next is first scheduled after the current.
    next =
      sortedScheduled.find((m) => m.id !== now!.id) ?? null;
  } else if (phaseScheduled.length > 0) {
    now = phaseScheduled[0];
    next =
      sortedScheduled.find((m) => m.id !== now!.id) ?? null;
  } else if (sortedScheduled.length > 0) {
    // No current-round scheduled but other scheduled exist (e.g. KO already seeded).
    now = sortedScheduled[0];
    next = sortedScheduled[1] ?? null;
  } else {
    // All done on this court.
    now = null;
    next = null;
  }

  return { now, next };
}

function matchesActivePhase(m: Match, phase: TournamentPhase): boolean {
  if (phase === "mexicano") return m.phase === "mexicano";
  if (phase === "knockout") return m.phase === "knockout";
  return false;
}

function matchesActivePhaseAndRound(
  m: Match,
  phase: TournamentPhase,
  round: number,
): boolean {
  if (phase === "mexicano") return m.phase === "mexicano" && m.round === round;
  if (phase === "knockout") return m.phase === "knockout";
  return false;
}

/* ---------------------------------------------------------- Cards */

function CourtCard({
  court,
  now,
  next,
  teams,
}: {
  court: number;
  now: Match | null;
  next: Match | null;
  teams: Team[];
}) {
  const t = useT();
  return (
    <div className="border-2 border-outline-variant bg-surface-container">
      <header className="flex items-center justify-between border-b-2 border-outline-variant bg-deep-void px-5 py-3 sm:px-6">
        <p className="font-display text-headline-md uppercase text-stadium-white sm:text-display-md">
          {t("courtLabel", { court })}
        </p>
        {now && now.status === "in_progress" && (
          <span className="label-caps flex items-center gap-1.5 border-2 border-secondary bg-secondary/15 px-2 py-1 text-secondary">
            <span className="inline-block h-1.5 w-1.5 animate-pulse-glow rounded-full bg-secondary" />
            LIVE
          </span>
        )}
      </header>

      <div className="divide-y-2 divide-outline-variant">
        <Slot label={t("nowPlaying")} match={now} teams={teams} highlight />
        <Slot label={t("upNext")} match={next} teams={teams} />
      </div>
    </div>
  );
}

function Slot({
  label,
  match,
  teams,
  highlight = false,
}: {
  label: string;
  match: Match | null;
  teams: Team[];
  highlight?: boolean;
}) {
  const t = useT();
  return (
    <div className={`px-5 py-4 sm:px-6 sm:py-5 ${highlight ? "bg-deep-void/30" : ""}`}>
      <p
        className={`label-caps ${highlight ? "text-secondary" : "text-on-surface-variant"}`}
      >
        {label}
      </p>
      {match ? (
        <MatchLines match={match} teams={teams} highlight={highlight} />
      ) : (
        <p className="mt-2 font-display text-headline-sm uppercase text-on-surface-variant/60">
          {highlight ? t("courtIdle") : t("courtFree")}
        </p>
      )}
    </div>
  );
}

function MatchLines({
  match,
  teams,
  highlight,
}: {
  match: Match;
  teams: Team[];
  highlight: boolean;
}) {
  const t = useT();
  const teamA = teams.find((tt) => tt.id === match.team_a_id);
  const teamB = teams.find((tt) => tt.id === match.team_b_id);
  const done = match.status === "done";
  const aWin = done && match.sets_a > match.sets_b;
  const bWin = done && match.sets_b > match.sets_a;
  const phaseLabel =
    match.phase === "mexicano"
      ? `Mex R${match.round}${match.wave ? ` · W${match.wave}` : ""}`
      : match.bracket_pos === "sf1"
        ? "Halbfinale 1"
        : match.bracket_pos === "sf2"
          ? "Halbfinale 2"
          : match.bracket_pos === "final"
            ? t("bracketFinal")
            : t("bracketThird");

  // For done matches with multiple sets, show set-list. Otherwise show running set.
  const setList = match.set_history.map((s) => `${s.a}-${s.b}`).join(", ");

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-on-surface-variant">
          {phaseLabel}
        </p>
        {match.best_of === 3 && (
          <span className="label-caps border-2 border-tertiary/60 px-1.5 py-0 text-[10px] text-tertiary">
            {t("bestOf3Short")}
          </span>
        )}
      </div>
      <div className="mt-2 grid grid-cols-[1fr_auto_auto] items-baseline gap-x-4 gap-y-1">
        <TeamRow
          team={teamA?.team_name ?? "?"}
          demo={teamA?.is_demo}
          winner={aWin}
          highlight={highlight}
        />
        <SetsCell value={done ? match.sets_a : match.sets_a} done={done} />
        <ScoreCell
          value={done ? null : match.current_a}
          winner={aWin}
          highlight={highlight}
        />
        <TeamRow
          team={teamB?.team_name ?? "?"}
          demo={teamB?.is_demo}
          winner={bWin}
          highlight={highlight}
        />
        <SetsCell value={done ? match.sets_b : match.sets_b} done={done} />
        <ScoreCell
          value={done ? null : match.current_b}
          winner={bWin}
          highlight={highlight}
        />
      </div>
      {done && setList && (
        <p className="mt-2 font-mono text-body-sm tabular-nums text-on-surface-variant">
          {setList}
        </p>
      )}
      {!done && match.set_history.length > 0 && (
        <p className="mt-2 font-mono text-[11px] tabular-nums text-on-surface-variant">
          {match.set_history.map((s, i) => `S${i + 1}: ${s.a}-${s.b}`).join("  ·  ")}
        </p>
      )}
    </div>
  );
}

function SetsCell({ value, done }: { value: number; done: boolean }) {
  return (
    <span
      className={`shrink-0 text-right font-display tabular-nums ${
        done ? "text-secondary" : "text-on-surface-variant"
      }`}
      title="Sätze"
    >
      {value}
    </span>
  );
}

function TeamRow({
  team,
  demo,
  winner,
  highlight,
}: {
  team: string;
  demo: boolean | undefined;
  winner: boolean;
  highlight: boolean;
}) {
  const t = useT();
  return (
    <span
      className={`flex min-w-0 items-center gap-2 truncate font-display uppercase ${
        winner
          ? "text-primary"
          : highlight
            ? "text-stadium-white text-headline-md sm:text-display-md"
            : "text-stadium-white text-headline-sm sm:text-headline-md"
      }`}
    >
      <span className="truncate">{team}</span>
      {demo && (
        <span className="label-caps shrink-0 border-2 border-tertiary bg-tertiary/15 px-1.5 py-0 text-[10px] text-tertiary">
          {t("demoBadge")}
        </span>
      )}
    </span>
  );
}

function ScoreCell({
  value,
  winner,
  highlight,
}: {
  value: number | null;
  winner: boolean;
  highlight: boolean;
}) {
  return (
    <span
      className={`shrink-0 text-right font-display tabular-nums ${
        winner
          ? "text-primary"
          : highlight
            ? "text-stadium-white text-display-md sm:text-display-lg"
            : "text-on-surface-variant text-headline-md"
      }`}
    >
      {value ?? "—"}
    </span>
  );
}
