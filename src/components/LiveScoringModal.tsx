import { useEffect, useMemo, useState } from "react";
import type { Match, ScoringMode, SetScore, Team } from "../lib/database.types";
import { useT } from "../lib/i18n";
import { supabase } from "../lib/supabase";
import { DEFAULT_SET_RULE, type SetRule } from "../lib/tournament-engine";
import {
  applyScoringUpdate,
  buildFinalScore,
  bumpGame,
  bumpGameTimed,
  finalizeTimedMatch,
  resetScoring,
  startMatchTimer,
  formatScoreLine,
} from "../lib/scoring";

type Props = {
  match: Match;
  teams: Team[];
  setRule?: SetRule;
  scoringMode?: ScoringMode;
  matchMinutes?: number;
  onClose: () => void;
};

type Mode = "live" | "final";

export default function LiveScoringModal({
  match,
  teams,
  setRule = DEFAULT_SET_RULE,
  scoringMode = "sets",
  matchMinutes = 15,
  onClose,
}: Props) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("live");
  // Guard: reopening a DONE match can corrupt already-seeded finals/standings.
  const [reopened, setReopened] = useState(false);

  const timed = scoringMode === "timed";

  function confirmReopen() {
    if (confirm(t("reopenWarning"))) {
      setReopened(true);
      setMode("final");
    }
  }

  // Lock body scroll while modal is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Close on Escape.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const teamA = useMemo(
    () => teams.find((t) => t.id === match.team_a_id),
    [teams, match.team_a_id],
  );
  const teamB = useMemo(
    () => teams.find((t) => t.id === match.team_b_id),
    [teams, match.team_b_id],
  );

  async function bump(side: "a" | "b", delta: 1 | -1) {
    if (busy || match.status === "done") return;
    setBusy(true);
    setError(null);
    const update = timed
      ? bumpGameTimed(match, side, delta)
      : bumpGame(match, side, delta, setRule);
    const { error: e } = await applyScoringUpdate(match.id, update);
    setBusy(false);
    if (e) setError(e);
  }

  async function reset() {
    if (!confirm(t("scoringConfirmReset"))) return;
    setBusy(true);
    setError(null);
    const { error: e } = await applyScoringUpdate(match.id, resetScoring());
    // In timed mode also clear the synced clock so it stops ticking.
    if (!e && timed) {
      await supabase
        .from("matches")
        .update({ timer_started_at: null })
        .eq("id", match.id);
    }
    setBusy(false);
    if (e) setError(e);
  }

  /* -------------------------------------------------- Timer (timed mode) */
  async function startTimer() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const { error: e } = await startMatchTimer(match.id);
    setBusy(false);
    if (e) setError(e);
  }

  async function finalizeTimed() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const { update, error: valErr, errorKey } = finalizeTimedMatch(match);
    if (valErr || !update) {
      setError(errorKey ? t(errorKey as never) : valErr);
      setBusy(false);
      return;
    }
    const { error: e } = await applyScoringUpdate(match.id, update);
    setBusy(false);
    if (e) setError(e);
  }

  const phaseLabel =
    match.phase === "league"
      ? `${t("leagueGamesHeading")}${match.wave ? ` · W${match.wave}` : ""}`
      : match.phase === "final"
        ? match.bracket_pos === "third"
          ? t("bracketThird")
          : t("bracketFinal")
        : match.phase === "mexicano"
          ? `Mexicano R${match.round}${match.wave ? ` · W${match.wave}` : ""}`
          : match.bracket_pos === "sf1"
            ? t("bracketSF", { n: 1 })
            : match.bracket_pos === "sf2"
              ? t("bracketSF", { n: 2 })
              : match.bracket_pos === "final"
                ? t("bracketFinal")
                : t("bracketThird");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-deep-void/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto border-2 border-primary bg-surface-container shadow-hard"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b-2 border-outline-variant bg-deep-void px-5 py-3">
          <div>
            <p className="label-caps text-primary">{phaseLabel}</p>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-on-surface-variant">
              {t("courtLabel", { court: match.court })} ·{" "}
              {match.best_of === 3 ? t("bestOf3") : t("bestOf1")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="label-caps border-2 border-outline-variant px-3 py-1.5 text-on-surface-variant transition-colors hover:border-stadium-white hover:text-stadium-white"
          >
            ✕
          </button>
        </header>

        {/* Status */}
        {match.status === "done" && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-secondary bg-secondary/10 px-5 py-2">
            <span className="label-caps text-secondary">
              {t("matchDone")} · {formatScoreLine(match)}
            </span>
            {!reopened && (
              <button
                onClick={confirmReopen}
                className="label-caps border-2 border-tertiary px-2 py-0.5 text-tertiary transition-colors hover:bg-tertiary hover:text-deep-void"
              >
                {t("reopenMatch")}
              </button>
            )}
          </div>
        )}
        {match.status === "in_progress" && (
          <div className="flex items-center gap-2 border-b-2 border-secondary bg-secondary/5 px-5 py-2">
            <span className="inline-block h-2 w-2 animate-pulse-glow rounded-full bg-secondary" />
            <span className="label-caps text-secondary">
              {t("matchInProgress")}
            </span>
          </div>
        )}

        {/* Timer (timed mode only) */}
        {timed && (match.status !== "done" || reopened) && (
          <MatchTimer
            startedAt={match.timer_started_at}
            matchMinutes={matchMinutes}
            busy={busy}
            onStart={startTimer}
            onFinalize={finalizeTimed}
          />
        )}

        {/* Mode tabs (sets mode only; timed mode has no set-based final form) */}
        {!timed && (match.status !== "done" || reopened) && (
          <div className="grid grid-cols-2 border-b-2 border-outline-variant">
            <ModeTab
              active={mode === "live"}
              onClick={() => {
                setMode("live");
                setError(null);
              }}
            >
              {t("scoringModeLive")}
            </ModeTab>
            <ModeTab
              active={mode === "final"}
              onClick={() => {
                setMode("final");
                setError(null);
              }}
            >
              {t("scoringModeFinal")}
            </ModeTab>
          </div>
        )}

        {timed || mode === "live" || (match.status === "done" && !reopened) ? (
          <>
            {/* Score grid (live click-through) */}
            <div className="grid grid-cols-2 gap-px bg-outline-variant">
              <ScoringPanel
                side="A"
                teamName={teamA?.team_name ?? "?"}
                isDemo={teamA?.is_demo ?? false}
                sets={match.sets_a}
                current={match.current_a}
                opponentCurrent={match.current_b}
                onBump={(d) => bump("a", d)}
                disabled={busy || match.status === "done"}
                hideSets={timed}
              />
              <ScoringPanel
                side="B"
                teamName={teamB?.team_name ?? "?"}
                isDemo={teamB?.is_demo ?? false}
                sets={match.sets_b}
                current={match.current_b}
                opponentCurrent={match.current_a}
                onBump={(d) => bump("b", d)}
                disabled={busy || match.status === "done"}
                hideSets={timed}
              />
            </div>

            {/* Set history */}
            {match.set_history.length > 0 && (
              <div className="border-t-2 border-outline-variant px-5 py-3">
                <p className="label-caps text-on-surface-variant">
                  {t("setHistory")}
                </p>
                <p className="mt-1 font-display text-headline-sm uppercase text-stadium-white">
                  {match.set_history
                    .map((s, i) => `S${i + 1}: ${s.a}-${s.b}`)
                    .join("  ·  ")}
                </p>
              </div>
            )}
          </>
        ) : (
          <FinalScoreForm
            match={match}
            teamAName={teamA?.team_name ?? "?"}
            teamBName={teamB?.team_name ?? "?"}
            setRule={setRule}
            busy={busy}
            onError={setError}
            onSubmit={async (sets) => {
              setBusy(true);
              setError(null);
              const { update, error: validationError } = buildFinalScore(
                match.best_of,
                sets,
                setRule,
              );
              if (validationError || !update) {
                setError(validationError);
                setBusy(false);
                return;
              }
              const { error: e } = await applyScoringUpdate(match.id, update);
              setBusy(false);
              if (e) setError(e);
              else setMode("live"); // collapse back to live view; status is now done
            }}
          />
        )}

        {/* Footer */}
        <footer className="flex items-center justify-between border-t-2 border-outline-variant bg-surface-container px-5 py-3">
          <button
            onClick={reset}
            disabled={busy}
            className="label-caps border-2 border-error/50 px-3 py-1.5 text-error transition-colors hover:bg-error hover:text-stadium-white disabled:opacity-40"
          >
            {t("scoringReset")}
          </button>
          {error && (
            <p className="text-sm text-error">{error}</p>
          )}
          <button
            onClick={onClose}
            className="btn-sm"
          >
            {t("scoringClose")}
          </button>
        </footer>
      </div>
    </div>
  );
}

function ScoringPanel({
  side,
  teamName,
  isDemo,
  sets,
  current,
  opponentCurrent,
  onBump,
  disabled,
  hideSets = false,
}: {
  side: "A" | "B";
  teamName: string;
  isDemo: boolean;
  sets: number;
  current: number;
  opponentCurrent: number;
  onBump: (delta: 1 | -1) => void;
  disabled: boolean;
  hideSets?: boolean;
}) {
  const t = useT();
  // Highlight side that is currently leading the running set.
  const leading = current > opponentCurrent;
  return (
    <div
      className={`flex flex-col bg-surface-container px-5 py-6 ${
        leading ? "ring-2 ring-inset ring-primary/40" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="label-caps text-on-surface-variant">
          {t("teamSide", { side })}
        </span>
        {isDemo && (
          <span className="label-caps border-2 border-tertiary bg-tertiary/15 px-1.5 py-0 text-[10px] text-tertiary">
            {t("demoBadge")}
          </span>
        )}
      </div>
      <p className="mt-1 truncate font-display text-headline-md uppercase text-stadium-white">
        {teamName}
      </p>

      {/* Sets won */}
      {!hideSets && (
        <div className="mt-4 flex items-baseline gap-2">
          <span className="label-caps text-on-surface-variant">
            {t("setsWon")}
          </span>
          <span className="font-display text-headline-md tabular-nums text-secondary">
            {sets}
          </span>
        </div>
      )}

      {/* Big game counter */}
      <div className="mt-2 flex items-center justify-center">
        <span
          className={`font-display tabular-nums leading-none ${
            leading ? "text-primary" : "text-stadium-white"
          }`}
          style={{ fontSize: "clamp(80px, 18vw, 160px)" }}
        >
          {current}
        </span>
      </div>

      {/* +/- buttons */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={() => onBump(-1)}
          disabled={disabled || current === 0}
          className="border-2 border-outline-variant bg-surface-container-high py-3 font-display text-headline-md uppercase text-on-surface-variant transition-colors hover:border-error hover:text-error disabled:opacity-30"
        >
          −1
        </button>
        <button
          onClick={() => onBump(1)}
          disabled={disabled}
          className="border-2 border-primary bg-primary py-3 font-display text-headline-md uppercase text-on-primary-container transition-all hover:-translate-y-0.5 disabled:opacity-30"
        >
          +1
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- Match timer */

/**
 * Synced countdown for timed mode. Remaining time is computed purely from the
 * DB-stored start timestamp + match length, so every device (scorer + beamer)
 * shows the same clock. Ticks locally every 1s just to re-render.
 */
function MatchTimer({
  startedAt,
  matchMinutes,
  busy,
  onStart,
  onFinalize,
}: {
  startedAt: string | null;
  matchMinutes: number;
  busy: boolean;
  onStart: () => void;
  onFinalize: () => void;
}) {
  const t = useT();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  // Not started yet -> show start button.
  if (!startedAt) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-primary/40 bg-deep-void px-5 py-4">
        <div>
          <p className="label-caps text-primary">{t("timerHeading")}</p>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-on-surface-variant">
            {t("timerLengthLabel", { min: matchMinutes })}
          </p>
        </div>
        <button onClick={onStart} disabled={busy} className="btn-sm">
          {busy ? "…" : t("timerStart")}
        </button>
      </div>
    );
  }

  const totalMs = matchMinutes * 60_000;
  const elapsed = now - new Date(startedAt).getTime();
  const remainingMs = Math.max(0, totalMs - elapsed);
  const buzzer = remainingMs <= 0;
  const totalSec = Math.ceil(remainingMs / 1000);
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  const clock = `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;

  return (
    <div
      className={`border-b-2 px-5 py-4 ${
        buzzer ? "border-error bg-error/10" : "border-primary/40 bg-deep-void"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {buzzer && (
            <span className="inline-block h-3 w-3 animate-pulse-glow rounded-full bg-error" />
          )}
          <div>
            <p className={`label-caps ${buzzer ? "text-error" : "text-primary"}`}>
              {buzzer ? t("timerUp") : t("timerHeading")}
            </p>
            <p
              className={`font-display tabular-nums leading-none ${
                buzzer ? "animate-pulse text-error" : "text-stadium-white"
              }`}
              style={{ fontSize: "clamp(40px, 9vw, 72px)" }}
            >
              {clock}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <button onClick={onFinalize} disabled={busy} className="btn-sm">
            {busy ? "…" : buzzer ? t("timerFinalize") : t("timerFinishEarly")}
          </button>
          <button
            onClick={onStart}
            disabled={busy}
            className="label-caps border-2 border-outline-variant px-3 py-1.5 text-on-surface-variant transition-colors hover:border-tertiary hover:text-tertiary disabled:opacity-40"
          >
            {t("timerRestart")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- Mode tab */

function ModeTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`label-caps px-4 py-3 transition-colors ${
        active
          ? "bg-primary text-on-primary-container"
          : "bg-surface-container text-on-surface-variant hover:text-stadium-white"
      }`}
    >
      {children}
    </button>
  );
}

/* ---------------------------------------------------------- Final-score form */

function FinalScoreForm({
  match,
  teamAName,
  teamBName,
  setRule,
  busy,
  onError,
  onSubmit,
}: {
  match: Match;
  teamAName: string;
  teamBName: string;
  setRule: SetRule;
  busy: boolean;
  onError: (err: string | null) => void;
  onSubmit: (sets: SetScore[]) => Promise<void>;
}) {
  const t = useT();
  const setCount = match.best_of === 1 ? 1 : 3;
  // Pre-fill from existing set_history if present (re-correcting an entered final).
  const initial = useMemo<SetScore[]>(() => {
    return Array.from({ length: setCount }, (_, i) => {
      const s = match.set_history[i];
      return s ? { a: s.a, b: s.b } : { a: 0, b: 0 };
    });
  }, [match.set_history, setCount]);
  const [sets, setSets] = useState<SetScore[]>(initial);

  function update(idx: number, side: "a" | "b", value: string) {
    onError(null);
    const n = value === "" ? 0 : Math.max(0, parseInt(value, 10) || 0);
    setSets((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [side]: n } : s)),
    );
  }

  return (
    <div className="px-5 py-5 sm:px-6">
      <div className="mb-4 flex items-baseline justify-between">
        <p className="font-display text-headline-sm uppercase text-stadium-white">
          {t("scoringFinalHeading")}
        </p>
        <p className="label-caps text-on-surface-variant">
          {match.best_of === 3 ? t("bestOf3") : t("bestOf1")}
        </p>
      </div>

      {/* Header row */}
      <div className="grid grid-cols-[40px_1fr_1fr] items-center gap-2 sm:gap-3">
        <span />
        <span className="truncate font-display uppercase text-stadium-white">
          {teamAName}
        </span>
        <span className="truncate font-display uppercase text-stadium-white">
          {teamBName}
        </span>
      </div>

      {/* Set rows */}
      <div className="mt-3 space-y-2">
        {sets.map((s, idx) => (
          <div
            key={idx}
            className="grid grid-cols-[40px_1fr_1fr] items-center gap-2 sm:gap-3"
          >
            <span className="font-mono label-caps text-on-surface-variant">
              S{idx + 1}
              {match.best_of === 3 && idx === 2 && (
                <span className="ml-1 text-[9px] opacity-60">opt.</span>
              )}
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={20}
              value={s.a}
              onChange={(e) => update(idx, "a", e.target.value)}
              className="border-2 border-outline-variant bg-surface-container px-3 py-2 text-center font-display text-headline-md tabular-nums text-stadium-white focus:border-primary focus:outline-none"
            />
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={20}
              value={s.b}
              onChange={(e) => update(idx, "b", e.target.value)}
              className="border-2 border-outline-variant bg-surface-container px-3 py-2 text-center font-display text-headline-md tabular-nums text-stadium-white focus:border-primary focus:outline-none"
            />
          </div>
        ))}
      </div>

      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-on-surface-variant">
        {t("scoringFinalRuleDynamic", {
          target: setRule.target,
          lead: setRule.twoLead ? t("scoringRuleWithLead") : t("scoringRuleNoLead"),
        })}
      </p>

      <button
        onClick={() => onSubmit(sets)}
        disabled={busy}
        className="btn-sm mt-4 w-full"
      >
        {busy ? "…" : t("scoringFinalSubmit")}
      </button>
    </div>
  );
}
