import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Database, Division, Match, Settings as DbSettings, Team } from "../lib/database.types";
import { useT } from "../lib/i18n";
import {
  autoScoreLeague,
  autoScoreSwiss,
  demoTeamCount,
  hasDemoTeams,
  resetDemo,
  seedDemoTeams,
} from "../lib/demo-mode";
import {
  bestOfForSwissKO,
  buildSchedule,
  computeDivisionStandings,
  computeSwissStandings,
  divisionFinalsComplete,
  generateLeagueSchedule,
  hasUnresolvedLeagueMatch,
  isSwissRoundComplete,
  leagueComplete,
  seedDivisionFinals,
  seedKOFinals,
  seedKOSemis,
  seedNextRound,
  seedRound1,
  swissFinalsComplete,
  swissSemisComplete,
  type Standing,
} from "../lib/tournament-engine";
import LiveScoringModal from "./LiveScoringModal";
import MatchEditor from "./MatchEditor";

type MatchInsert = Database["public"]["Tables"]["matches"]["Insert"];

type Props = {
  teams: Team[];
  matches: Match[];
  settings: DbSettings;
};

const DIVISIONS: Division[] = ["ober", "unter"];

// Box-Liga phases. Legacy phases (mexicano/knockout) are treated as registration.
type BoxPhase = "registration" | "league" | "final" | "finished";

function normalizePhase(p: DbSettings["tournament_phase"]): BoxPhase {
  if (p === "league" || p === "final" || p === "finished") return p;
  return "registration";
}

export default function TournamentPanel({ teams, matches, settings }: Props) {
  const mode = settings.tournament_mode ?? "box";
  if (mode === "swiss") {
    return <SwissTournamentPanel teams={teams} matches={matches} settings={settings} />;
  }
  return <BoxTournamentPanel teams={teams} matches={matches} settings={settings} />;
}

function BoxTournamentPanel({ teams, matches, settings }: Props) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [scoringMatchId, setScoringMatchId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const courts = settings.total_courts || 3;
  const roundsPerTeam = settings.rounds_per_team || 4;
  const minGap = settings.min_rest_slots ?? 2;

  const setRule = useMemo(
    () => ({
      target: settings.set_target ?? 6,
      twoLead: settings.set_two_game_lead ?? true,
    }),
    [settings.set_target, settings.set_two_game_lead],
  );

  const standingsByDiv = useMemo(
    () => ({
      ober: computeDivisionStandings(teams, matches, "ober"),
      unter: computeDivisionStandings(teams, matches, "unter"),
    }),
    [teams, matches],
  );

  const phase = normalizePhase(settings.tournament_phase);
  const activeTeamCount = teams.filter((t) => t.status === "active").length;

  const scoringMatch = useMemo(
    () =>
      scoringMatchId
        ? matches.find((m) => m.id === scoringMatchId) ?? null
        : null,
    [scoringMatchId, matches],
  );

  /* ---------------------------------------------------------- Generate league */
  async function generateSchedule() {
    if (settings.registration_open) {
      setError(t("needRegClosed"));
      return;
    }
    if (activeTeamCount < 4) {
      setError(t("needTeamsMessage"));
      return;
    }
    // Existence check — do not double-generate.
    if (matches.some((m) => m.phase === "league")) {
      setError(t("leagueExistsWarn"));
      return;
    }
    setBusy(true);
    setError(null);
    const activeTeams = teams.filter((tt) => tt.status === "active");
    const schedule = generateLeagueSchedule(activeTeams, {
      courts,
      roundsPerTeam,
      minGap,
    });
    const inserts: MatchInsert[] = [];
    schedule.slots.forEach((slot, slotIdx) => {
      slot.forEach((m, courtIdx) => {
        inserts.push({
          round: 1,
          wave: slotIdx + 1,
          court: courtIdx + 1,
          team_a_id: m.a,
          team_b_id: m.b,
          phase: "league" as const,
          division: m.division,
          is_fun: m.isFun,
          bracket_pos: null,
          score_a: null,
          score_b: null,
          status: "scheduled" as const,
          played_at: null,
          is_demo: matchIsDemo(teams, m.a, m.b),
        });
      });
    });
    const { error: insErr } = await supabase.from("matches").insert(inserts);
    if (insErr) {
      setError(insErr.message);
      setBusy(false);
      return;
    }
    await supabase
      .from("settings")
      .update({ tournament_phase: "league", current_round: 1 })
      .eq("id", 1);
    setBusy(false);
  }

  /* ---------------------------------------------------------- Seed finals */
  async function seedFinals() {
    if (!leagueComplete(matches)) {
      setError(t("leagueIncomplete"));
      return;
    }
    if (hasUnresolvedLeagueMatch(matches)) {
      setError(t("unresolvedWithdrawal"));
      return;
    }
    // Idempotency guard.
    if (matches.some((m) => m.phase === "final")) return;
    setBusy(true);
    setError(null);
    const inserts: MatchInsert[] = [];
    for (const div of DIVISIONS) {
      const entries = seedDivisionFinals(div, standingsByDiv[div]);
      for (const e of entries) {
        inserts.push({
          round: 1,
          wave: 1,
          court: e.court,
          team_a_id: e.teamA,
          team_b_id: e.teamB,
          phase: "final" as const,
          division: e.division,
          is_fun: false,
          bracket_pos: e.bracketPos,
          score_a: null,
          score_b: null,
          status: "scheduled" as const,
          played_at: null,
          best_of: 1 as const, // single set to protect the time window
          is_demo: matchIsDemo(teams, e.teamA, e.teamB),
        });
      }
    }
    if (inserts.length === 0) {
      setError(t("noFinalsToSeed"));
      setBusy(false);
      return;
    }
    const { error: insErr } = await supabase.from("matches").insert(inserts);
    if (insErr) {
      if (insErr.code !== "23505") {
        setError(insErr.message);
        setBusy(false);
        return;
      }
    }
    await supabase
      .from("settings")
      .update({ tournament_phase: "final" })
      .eq("id", 1);
    setBusy(false);
  }

  async function finishTournament() {
    if (!divisionFinalsComplete(matches)) {
      setError(t("finalsIncomplete"));
      return;
    }
    setBusy(true);
    await supabase
      .from("settings")
      .update({ tournament_phase: "finished" })
      .eq("id", 1);
    setBusy(false);
  }

  /* ---------------------------------------------------------- Auto-advance */
  const advancingRef = useRef(false);

  useEffect(() => {
    if (advancingRef.current || busy) return;

    type Action = "seedFinals" | "finishTournament";
    let action: Action | null = null;

    if (phase === "league") {
      if (leagueComplete(matches) && !matches.some((m) => m.phase === "final")) {
        if (hasUnresolvedLeagueMatch(matches)) {
          // Surface a clear admin message instead of advancing.
          setNotice(t("unresolvedWithdrawal"));
          return;
        }
        action = "seedFinals";
      }
    } else if (phase === "final") {
      if (divisionFinalsComplete(matches)) action = "finishTournament";
    }

    if (!action) return;

    advancingRef.current = true;
    (async () => {
      try {
        if (action === "seedFinals") await seedFinals();
        else if (action === "finishTournament") await finishTournament();
      } finally {
        advancingRef.current = false;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches, phase]);

  const phaseLabel =
    phase === "registration"
      ? t("phaseRegistration")
      : phase === "league"
        ? t("phaseLeague")
        : phase === "final"
          ? t("phaseFinal")
          : t("phaseFinished");

  return (
    <section className="border-2 border-outline-variant bg-surface-container p-5">
      <FormatPreview phase={phase} />

      <DemoSection
        teams={teams}
        matches={matches}
        phase={phase}
        setRule={setRule}
      />

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
            onClick={generateSchedule}
            disabled={busy || activeTeamCount < 4 || settings.registration_open}
            className="btn-sm"
          >
            {t("actionGenerateSchedule")}
          </button>
        )}

        {phase === "league" && (
          <button
            onClick={seedFinals}
            disabled={busy || !leagueComplete(matches)}
            className="btn-sm"
          >
            {t("actionSeedFinals")}
          </button>
        )}

        {phase === "final" && (
          <button
            onClick={finishTournament}
            disabled={busy || !divisionFinalsComplete(matches)}
            className="btn-sm"
          >
            {t("actionTournamentDone")}
          </button>
        )}

        {phase !== "registration" && matches.length > 0 && (
          <button
            onClick={() => setEditorOpen(true)}
            className="label-caps border-2 border-outline-variant px-3 py-1.5 text-on-surface transition-colors hover:border-primary hover:text-primary"
          >
            {t("matchEditorOpen")}
          </button>
        )}
      </div>

      {error && (
        <p className="mt-4 border-2 border-error bg-error-container/40 px-3 py-2 text-sm text-error">
          {error}
        </p>
      )}
      {notice && !error && (
        <p className="mt-4 border-2 border-tertiary bg-tertiary/10 px-3 py-2 text-sm text-tertiary">
          {notice}
        </p>
      )}

      {phase !== "registration" && (
        <>
          <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.12em] text-on-surface-variant">
            {t("scorerHint")}
          </p>
          <div className="mt-4 grid gap-8 lg:grid-cols-2">
            <MatchesByGroup
              teams={teams}
              matches={matches}
              onOpenScoring={(m) => setScoringMatchId(m.id)}
            />
            <div className="space-y-8">
              {DIVISIONS.map((div) => (
                <StandingsAdmin
                  key={div}
                  division={div}
                  teams={teams}
                  standings={standingsByDiv[div]}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {scoringMatch && (
        <LiveScoringModal
          match={scoringMatch}
          teams={teams}
          setRule={setRule}
          onClose={() => setScoringMatchId(null)}
        />
      )}

      {editorOpen && (
        <MatchEditor
          teams={teams}
          matches={matches}
          courts={courts}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </section>
  );
}

/* ============================================================ Swiss panel */

// Swiss phases mapped from settings.tournament_phase. Box phases (league/final)
// are treated as registration here (should not occur when mode === 'swiss').
type SwissPhase = "registration" | "mexicano" | "knockout" | "finished";

function normalizeSwissPhase(p: DbSettings["tournament_phase"]): SwissPhase {
  if (p === "mexicano" || p === "knockout" || p === "finished") return p;
  return "registration";
}

function SwissTournamentPanel({ teams, matches, settings }: Props) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scoringMatchId, setScoringMatchId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const courts = settings.total_courts || 3;
  const totalRounds = Math.max(settings.rounds_per_team || 3, 1);

  const setRule = useMemo(
    () => ({
      target: settings.set_target ?? 6,
      twoLead: settings.set_two_game_lead ?? true,
    }),
    [settings.set_target, settings.set_two_game_lead],
  );

  const standings = useMemo(
    () => computeSwissStandings(teams, matches),
    [teams, matches],
  );

  const phase = normalizeSwissPhase(settings.tournament_phase);
  const round = settings.current_round;
  const activeTeamCount = teams.filter((x) => x.status === "active").length;

  const scoringMatch = useMemo(
    () =>
      scoringMatchId ? matches.find((m) => m.id === scoringMatchId) ?? null : null,
    [scoringMatchId, matches],
  );

  /* -------------------------------------------------- Start (round 1) */
  async function startSwiss() {
    if (settings.registration_open) {
      setError(t("needRegClosed"));
      return;
    }
    if (activeTeamCount < 4) {
      setError(t("needTeamsMessage"));
      return;
    }
    if (matches.some((m) => m.phase === "mexicano")) {
      setError(t("leagueExistsWarn"));
      return;
    }
    setBusy(true);
    setError(null);
    const pairings = seedRound1(teams);
    const schedule = buildSchedule(pairings, 1, courts);
    const inserts: MatchInsert[] = schedule.map((s) => ({
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
      is_demo: matchIsDemo(teams, s.teamA, s.teamB),
    }));
    const { error: insErr } = await supabase.from("matches").insert(inserts);
    if (insErr && insErr.code !== "23505") {
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

  /* -------------------------------------------------- Next round */
  async function nextRound() {
    if (round >= totalRounds) {
      setError(t("swissPhaseOver"));
      return;
    }
    if (!isSwissRoundComplete(matches, round)) {
      setError(t("swissRoundIncomplete"));
      return;
    }
    if (matches.some((m) => m.phase === "mexicano" && m.round === round + 1)) return;
    setBusy(true);
    setError(null);
    const pairings = seedNextRound(standings);
    const schedule = buildSchedule(pairings, round + 1, courts);
    const inserts: MatchInsert[] = schedule.map((s) => ({
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
      is_demo: matchIsDemo(teams, s.teamA, s.teamB),
    }));
    const { error: insErr } = await supabase.from("matches").insert(inserts);
    if (insErr && insErr.code !== "23505") {
      setError(insErr.message);
      setBusy(false);
      return;
    }
    await supabase.from("settings").update({ current_round: round + 1 }).eq("id", 1);
    setBusy(false);
  }

  /* -------------------------------------------------- Start KO (semis) */
  async function startKO() {
    if (!isSwissRoundComplete(matches, round)) {
      setError(t("swissRoundIncomplete"));
      return;
    }
    if (standings.length < 4) {
      setError(t("needTeamsMessage"));
      return;
    }
    if (matches.some((m) => m.phase === "knockout")) return;
    setBusy(true);
    setError(null);
    const semis = seedKOSemis(standings);
    if (semis.length === 0) {
      setError(t("needTeamsMessage"));
      setBusy(false);
      return;
    }
    const inserts: MatchInsert[] = semis.map((s) => ({
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
      best_of: bestOfForSwissKO(s.bracketPos),
      is_demo: matchIsDemo(teams, s.teamA, s.teamB),
    }));
    const { error: insErr } = await supabase.from("matches").insert(inserts);
    if (insErr && insErr.code !== "23505") {
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

  /* -------------------------------------------------- Start finals */
  async function startFinals() {
    if (!swissSemisComplete(matches)) {
      setError(t("errorSemisIncomplete"));
      return;
    }
    if (matches.some((m) => m.phase === "knockout" && (m.bracket_pos === "final" || m.bracket_pos === "third"))) {
      return;
    }
    setBusy(true);
    setError(null);
    const finals = seedKOFinals(matches);
    if (finals.length === 0) {
      setError(t("errorSemisIncomplete"));
      setBusy(false);
      return;
    }
    const inserts: MatchInsert[] = finals.map((s) => ({
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
      best_of: bestOfForSwissKO(s.bracketPos),
      is_demo: matchIsDemo(teams, s.teamA, s.teamB),
    }));
    const { error: insErr } = await supabase.from("matches").insert(inserts);
    if (insErr && insErr.code !== "23505") {
      setError(insErr.message);
      setBusy(false);
      return;
    }
    await supabase.from("settings").update({ current_round: 2 }).eq("id", 1);
    setBusy(false);
  }

  async function finishTournament() {
    if (!swissFinalsComplete(matches)) {
      setError(t("finalsIncomplete"));
      return;
    }
    setBusy(true);
    await supabase
      .from("settings")
      .update({ tournament_phase: "finished" })
      .eq("id", 1);
    setBusy(false);
  }

  /* -------------------------------------------------- Auto-advance */
  const advancingRef = useRef(false);

  useEffect(() => {
    if (advancingRef.current || busy) return;

    type Action = "nextRound" | "startKO" | "startFinals" | "finishTournament";
    let action: Action | null = null;

    if (phase === "mexicano") {
      if (round > 0 && round < totalRounds && isSwissRoundComplete(matches, round)) {
        if (!matches.some((m) => m.phase === "mexicano" && m.round === round + 1)) {
          action = "nextRound";
        }
      } else if (round >= totalRounds && isSwissRoundComplete(matches, round)) {
        if (!matches.some((m) => m.phase === "knockout") && standings.length >= 4) {
          action = "startKO";
        }
      }
    } else if (phase === "knockout") {
      if (round === 1 && swissSemisComplete(matches)) {
        if (!matches.some((m) => m.phase === "knockout" && (m.bracket_pos === "final" || m.bracket_pos === "third"))) {
          action = "startFinals";
        }
      } else if (round === 2 && swissFinalsComplete(matches)) {
        action = "finishTournament";
      }
    }

    if (!action) return;
    advancingRef.current = true;
    (async () => {
      try {
        if (action === "nextRound") await nextRound();
        else if (action === "startKO") await startKO();
        else if (action === "startFinals") await startFinals();
        else if (action === "finishTournament") await finishTournament();
      } finally {
        advancingRef.current = false;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches, phase, round]);

  const phaseLabel =
    phase === "registration"
      ? t("phaseRegistration")
      : phase === "mexicano"
        ? t("phaseSwiss", { round, total: totalRounds })
        : phase === "knockout"
          ? t("phaseKnockout")
          : t("phaseFinished");

  const roundDone = isSwissRoundComplete(matches, round);

  return (
    <section className="border-2 border-outline-variant bg-surface-container p-5">
      <SwissFormatPreview phase={phase} round={round} totalRounds={totalRounds} />

      <DemoSection
        teams={teams}
        matches={matches}
        phase={phase === "mexicano" ? "swiss-group" : "other"}
        setRule={setRule}
        mode="swiss"
      />

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
            onClick={startSwiss}
            disabled={busy || activeTeamCount < 4 || settings.registration_open}
            className="btn-sm"
          >
            {t("actionStartSwiss")}
          </button>
        )}

        {phase === "mexicano" && round < totalRounds && (
          <button onClick={nextRound} disabled={busy || !roundDone} className="btn-sm">
            {t("actionNextRound")}
          </button>
        )}

        {phase === "mexicano" && round >= totalRounds && (
          <button onClick={startKO} disabled={busy || !roundDone} className="btn-sm">
            {t("actionStartKO")}
          </button>
        )}

        {phase === "knockout" && round === 1 && (
          <button
            onClick={startFinals}
            disabled={busy || !swissSemisComplete(matches)}
            className="btn-sm"
          >
            {t("actionStartFinals")}
          </button>
        )}

        {phase === "knockout" && round === 2 && (
          <button
            onClick={finishTournament}
            disabled={busy || !swissFinalsComplete(matches)}
            className="btn-sm"
          >
            {t("actionTournamentDone")}
          </button>
        )}

        {phase !== "registration" && matches.length > 0 && (
          <button
            onClick={() => setEditorOpen(true)}
            className="label-caps border-2 border-outline-variant px-3 py-1.5 text-on-surface transition-colors hover:border-primary hover:text-primary"
          >
            {t("matchEditorOpen")}
          </button>
        )}
      </div>

      {error && (
        <p className="mt-4 border-2 border-error bg-error-container/40 px-3 py-2 text-sm text-error">
          {error}
        </p>
      )}

      {phase !== "registration" && (
        <>
          <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.12em] text-on-surface-variant">
            {t("scorerHint")}
          </p>
          <div className="mt-4 grid gap-8 lg:grid-cols-2">
            <SwissMatchesByRound
              teams={teams}
              matches={matches}
              onOpenScoring={(m) => setScoringMatchId(m.id)}
            />
            <SwissStandingsAdmin teams={teams} standings={standings} />
          </div>
        </>
      )}

      {scoringMatch && (
        <LiveScoringModal
          match={scoringMatch}
          teams={teams}
          setRule={setRule}
          onClose={() => setScoringMatchId(null)}
        />
      )}

      {editorOpen && (
        <MatchEditor
          teams={teams}
          matches={matches}
          courts={courts}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </section>
  );
}

/* ------------------------------------------ Swiss display helpers */

function SwissFormatPreview({
  phase,
  round,
  totalRounds,
}: {
  phase: SwissPhase;
  round: number;
  totalRounds: number;
}) {
  const t = useT();
  const currentStep: "reg" | "group" | "ko" | "done" =
    phase === "registration"
      ? "reg"
      : phase === "mexicano"
        ? "group"
        : phase === "knockout"
          ? "ko"
          : "done";
  const steps: Array<{ key: typeof currentStep; label: string }> = [
    { key: "reg", label: t("stepReg") },
    { key: "group", label: t("stepSwissGroup") },
    { key: "ko", label: t("stepKO") },
    { key: "done", label: t("stepDone") },
  ];
  const order = ["reg", "group", "ko", "done"] as const;
  const currentIdx = order.indexOf(currentStep);
  return (
    <div className="border-2 border-primary/40 bg-deep-void p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="label-caps text-primary">{t("formatHeading")}</p>
        <p className="hidden font-mono text-[10px] uppercase tracking-[0.12em] text-on-surface-variant sm:block">
          {t("formatSwissSubtitle", { total: totalRounds })}
        </p>
      </div>
      <ul className="mt-3 space-y-1.5 font-body text-body-sm text-on-surface-variant">
        <li>· {t("formatSwissRule1")}</li>
        <li>· {t("formatSwissRule2", { total: totalRounds })}</li>
        <li>· {t("formatSwissRule3")}</li>
      </ul>
      <div className="mt-4 -mx-1 flex items-center gap-1 overflow-x-auto pb-1 sm:mt-5">
        {steps.map((step, i) => {
          const idx = order.indexOf(step.key);
          const isCurrent = step.key === currentStep;
          const isPast = idx < currentIdx;
          const label =
            step.key === "group" && phase === "mexicano"
              ? `${step.label} ${round}/${totalRounds}`
              : step.label;
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
                  {label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <span
                  aria-hidden
                  className={`h-0.5 w-3 sm:w-5 ${idx < currentIdx ? "bg-secondary/60" : "bg-outline-variant"}`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SwissMatchesByRound({
  teams,
  matches,
  onOpenScoring,
}: {
  teams: Team[];
  matches: Match[];
  onOpenScoring: (m: Match) => void;
}) {
  const t = useT();
  const grouped = useMemo(() => {
    const relevant = matches.filter(
      (m) => m.phase === "mexicano" || m.phase === "knockout",
    );
    const sorted = [...relevant].sort((a, b) => {
      if (a.phase !== b.phase) return a.phase === "mexicano" ? -1 : 1;
      if (a.round !== b.round) return a.round - b.round;
      if ((a.wave ?? 0) !== (b.wave ?? 0)) return (a.wave ?? 0) - (b.wave ?? 0);
      return a.court - b.court;
    });
    const groups: { key: string; label: string; items: Match[] }[] = [];
    for (const m of sorted) {
      let key: string;
      let label: string;
      if (m.phase === "knockout") {
        key = "ko";
        label = t("bracketSemifinals") + " + " + t("finalsHeading");
      } else {
        key = `r-${m.round}`;
        label = t("swissRoundLabel", { round: m.round });
      }
      let g = groups.find((x) => x.key === key);
      if (!g) {
        g = { key, label, items: [] };
        groups.push(g);
      }
      g.items.push(m);
    }
    return groups;
  }, [matches, t]);

  if (grouped.length === 0) {
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
              <AdminMatchRow
                key={m.id}
                match={m}
                teams={teams}
                onOpenScoring={onOpenScoring}
              />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function SwissStandingsAdmin({
  teams,
  standings,
}: {
  teams: Team[];
  standings: Standing[];
}) {
  const t = useT();
  return (
    <div className="space-y-3">
      <h3 className="label-caps-lg text-primary">{t("standingsHeading")}</h3>
      {standings.length === 0 ? (
        <p className="border-2 border-dashed border-outline-variant p-3 label-caps text-on-surface-variant">
          {t("noStandingsYet")}
        </p>
      ) : (
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
                  className={`border-t-2 border-outline-variant ${isPodium ? "bg-primary/5" : ""}`}
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
      )}
    </div>
  );
}

function teamLabel(teams: Team[], id: string | null): string {
  if (!id) return "—";
  const team = teams.find((x) => x.id === id);
  return team ? team.team_name : "?";
}

/** A match counts as demo if both involved teams are demo. */
function matchIsDemo(
  teams: Team[],
  teamAId: string | null,
  teamBId: string | null,
): boolean {
  const a = teams.find((t) => t.id === teamAId);
  const b = teams.find((t) => t.id === teamBId);
  return Boolean(a?.is_demo && b?.is_demo);
}

/* ---------------------------------------------------------- Format Preview */

type Step = "reg" | "league" | "final" | "done";

function FormatPreview({
  phase,
}: {
  phase: "registration" | "league" | "final" | "finished";
}) {
  const t = useT();

  const currentStep: Step =
    phase === "registration"
      ? "reg"
      : phase === "league"
        ? "league"
        : phase === "final"
          ? "final"
          : "done";

  const steps: Array<{ key: Step; label: string }> = [
    { key: "reg", label: t("stepReg") },
    { key: "league", label: t("stepLeague") },
    { key: "final", label: t("stepFinal") },
    { key: "done", label: t("stepDone") },
  ];

  const order: Step[] = ["reg", "league", "final", "done"];
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

/* ---------------------------------------------------------- Matches display */

function divisionLabel(t: ReturnType<typeof useT>, div: Division | null): string {
  if (div === "ober") return t("divisionOber");
  if (div === "unter") return t("divisionUnter");
  return t("divisionNone");
}

function MatchesByGroup({
  teams,
  matches,
  onOpenScoring,
}: {
  teams: Team[];
  matches: Match[];
  onOpenScoring: (m: Match) => void;
}) {
  const t = useT();
  const grouped = useMemo(() => groupMatches(matches, t), [matches, t]);
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
              <AdminMatchRow
                key={m.id}
                match={m}
                teams={teams}
                onOpenScoring={onOpenScoring}
              />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function groupMatches(matches: Match[], t: ReturnType<typeof useT>) {
  const sorted = [...matches].sort((a, b) => {
    if (a.phase !== b.phase) return a.phase === "league" ? -1 : 1;
    if ((a.wave ?? 0) !== (b.wave ?? 0)) return (a.wave ?? 0) - (b.wave ?? 0);
    return a.court - b.court;
  });
  const groups: { key: string; label: string; items: Match[] }[] = [];
  for (const m of sorted) {
    let key: string;
    let label: string;
    if (m.phase === "final") {
      key = `final-${m.division}`;
      label = `${divisionLabel(t, m.division)} · ${t("finalsHeading")}`;
    } else if (m.is_fun) {
      key = "fun";
      label = t("funGamesHeading");
    } else {
      key = `league-${m.division}`;
      label = `${divisionLabel(t, m.division)} · ${t("leagueGamesHeading")}`;
    }
    let g = groups.find((x) => x.key === key);
    if (!g) {
      g = { key, label, items: [] };
      groups.push(g);
    }
    g.items.push(m);
  }
  return groups;
}

function AdminMatchRow({
  match,
  teams,
  onOpenScoring,
}: {
  match: Match;
  teams: Team[];
  onOpenScoring: (match: Match) => void;
}) {
  const t = useT();

  const teamA = teamLabel(teams, match.team_a_id);
  const teamB = teamLabel(teams, match.team_b_id);

  const compact = match.is_walkover
    ? t("walkoverShort")
    : match.status === "done"
      ? match.set_history.map((s) => `${s.a}-${s.b}`).join(", ") || "—"
      : match.status === "in_progress"
        ? `${match.sets_a}·${match.sets_b}  |  ${match.current_a}–${match.current_b}`
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
        {match.is_fun && (
          <span className="ml-2 label-caps border-2 border-secondary/60 px-1.5 py-0 text-[10px] text-secondary">
            {t("funBadge")}
          </span>
        )}
        {match.is_walkover && (
          <span className="ml-2 label-caps border-2 border-tertiary/60 px-1.5 py-0 text-[10px] text-tertiary">
            {t("walkoverBadge")}
          </span>
        )}
      </span>
      {match.status === "in_progress" && (
        <span className="shrink-0 label-caps flex items-center gap-1 text-secondary">
          <span className="inline-block h-1.5 w-1.5 animate-pulse-glow rounded-full bg-secondary" />
          LIVE
        </span>
      )}
      <button
        onClick={() => onOpenScoring(match)}
        className={`shrink-0 border-2 px-2.5 py-1 label-caps font-mono transition-colors ${
          match.status === "done"
            ? "border-secondary text-secondary hover:bg-secondary hover:text-on-secondary"
            : "border-primary text-primary hover:bg-primary hover:text-on-primary-container"
        }`}
      >
        {compact}
      </button>
    </li>
  );
}

function StandingsAdmin({
  division,
  teams,
  standings,
}: {
  division: Division;
  teams: Team[];
  standings: Standing[];
}) {
  const t = useT();
  return (
    <div className="space-y-3">
      <h3 className="label-caps-lg text-primary">
        {divisionLabel(t, division)} · {t("standingsHeading")}
      </h3>
      {standings.length === 0 ? (
        <p className="border-2 border-dashed border-outline-variant p-3 label-caps text-on-surface-variant">
          {t("noStandingsYet")}
        </p>
      ) : (
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
              const isPodium = s.position <= 2;
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
      )}
    </div>
  );
}

/* ---------------------------------------------------------- Demo Section */

function DemoSection({
  teams,
  matches,
  phase,
  setRule,
  mode = "box",
}: {
  teams: Team[];
  matches: Match[];
  phase: "registration" | "league" | "final" | "finished" | "swiss-group" | "other";
  setRule: { target: number; twoLead: boolean };
  mode?: "box" | "swiss";
}) {
  const t = useT();
  const [busy, setBusy] = useState<"seed" | "score" | "reset" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const demoCount = demoTeamCount(teams);
  const hasDemo = hasDemoTeams(teams);
  // Box: auto-score during 'league'. Swiss: auto-score during the group phase.
  const canAutoScore =
    mode === "swiss" ? phase === "swiss-group" : phase === "league";

  async function onSeed() {
    if (hasDemo) {
      setError(t("demoExistsWarn"));
      return;
    }
    setBusy("seed");
    setError(null);
    setInfo(null);
    const { count, error: e } = await seedDemoTeams();
    setBusy(null);
    if (e) {
      setError(e);
      return;
    }
    setInfo(t("demoSeeded") + ` (${count})`);
  }

  async function onAutoScore() {
    if (!canAutoScore) {
      setError(mode === "swiss" ? t("demoNeedsSwissGroup") : t("demoNeedsLeague"));
      return;
    }
    setBusy("score");
    setError(null);
    setInfo(null);
    const { count, error: e } =
      mode === "swiss"
        ? await autoScoreSwiss(matches, teams, setRule)
        : await autoScoreLeague(matches, teams, setRule);
    setBusy(null);
    if (e) {
      setError(e);
      return;
    }
    setInfo(`${count} matches scored`);
  }

  async function onReset() {
    if (!confirm(t("demoConfirmReset"))) return;
    setBusy("reset");
    setError(null);
    setInfo(null);
    const { error: e } = await resetDemo();
    setBusy(null);
    if (e) {
      setError(e);
      return;
    }
    setInfo("✓");
  }

  return (
    <div className="mt-4 border-2 border-tertiary/40 bg-tertiary/5 p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="label-caps text-tertiary">{t("demoSection")}</p>
          {hasDemo && (
            <p className="mt-1 font-body text-body-sm text-on-surface-variant">
              {t("demoBannerBody", { count: demoCount })}
            </p>
          )}
        </div>
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.12em] text-on-surface-variant sm:inline">
          5 BEG · 3 INT · 2 ADV
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={onSeed}
          disabled={busy !== null || hasDemo}
          className="border-2 border-tertiary px-3 py-1.5 label-caps text-tertiary transition-colors hover:bg-tertiary hover:text-deep-void disabled:opacity-40"
        >
          {busy === "seed" ? "…" : t("demoSeed")}
        </button>
        <button
          onClick={onAutoScore}
          disabled={busy !== null || !canAutoScore}
          className="border-2 border-outline-variant px-3 py-1.5 label-caps text-on-surface transition-colors hover:border-tertiary hover:text-tertiary disabled:opacity-40"
        >
          {busy === "score" ? "…" : t("demoAutoScore")}
        </button>
        <button
          onClick={onReset}
          disabled={busy !== null || !hasDemo}
          className="border-2 border-error/50 px-3 py-1.5 label-caps text-error transition-colors hover:bg-error hover:text-stadium-white disabled:opacity-40"
        >
          {busy === "reset" ? "…" : t("demoReset")}
        </button>
      </div>

      {error && (
        <p className="mt-3 border-2 border-error bg-error-container/40 px-3 py-2 text-sm text-error">
          {error}
        </p>
      )}
      {info && !error && (
        <p className="mt-3 border-2 border-secondary bg-secondary/10 px-3 py-2 text-sm text-secondary">
          {info}
        </p>
      )}
    </div>
  );
}
