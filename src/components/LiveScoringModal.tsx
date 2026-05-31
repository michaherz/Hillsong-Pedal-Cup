import { useEffect, useMemo, useState } from "react";
import type { Match, SetScore, Team } from "../lib/database.types";
import { useT } from "../lib/i18n";
import {
  applyScoringUpdate,
  buildFinalScore,
  bumpGame,
  resetScoring,
  formatScoreLine,
} from "../lib/scoring";

type Props = {
  match: Match;
  teams: Team[];
  onClose: () => void;
};

type Mode = "live" | "final";

export default function LiveScoringModal({ match, teams, onClose }: Props) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("live");

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
    const update = bumpGame(match, side, delta);
    const { error: e } = await applyScoringUpdate(match.id, update);
    setBusy(false);
    if (e) setError(e);
  }

  async function reset() {
    if (!confirm(t("scoringConfirmReset"))) return;
    setBusy(true);
    setError(null);
    const { error: e } = await applyScoringUpdate(match.id, resetScoring());
    setBusy(false);
    if (e) setError(e);
  }

  const phaseLabel =
    match.phase === "mexicano"
      ? `Mexicano R${match.round}${match.wave ? ` · W${match.wave}` : ""}`
      : match.bracket_pos === "sf1"
        ? "Halbfinale 1"
        : match.bracket_pos === "sf2"
          ? "Halbfinale 2"
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
          <div className="border-b-2 border-secondary bg-secondary/10 px-5 py-2 label-caps text-secondary">
            {t("matchDone")} · {formatScoreLine(match)}
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

        {/* Mode tabs */}
        {match.status !== "done" && (
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

        {mode === "live" || match.status === "done" ? (
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
            busy={busy}
            onError={setError}
            onSubmit={async (sets) => {
              setBusy(true);
              setError(null);
              const { update, error: validationError } = buildFinalScore(
                match.best_of,
                sets,
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
}: {
  side: "A" | "B";
  teamName: string;
  isDemo: boolean;
  sets: number;
  current: number;
  opponentCurrent: number;
  onBump: (delta: 1 | -1) => void;
  disabled: boolean;
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
      <div className="mt-4 flex items-baseline gap-2">
        <span className="label-caps text-on-surface-variant">
          {t("setsWon")}
        </span>
        <span className="font-display text-headline-md tabular-nums text-secondary">
          {sets}
        </span>
      </div>

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
  busy,
  onError,
  onSubmit,
}: {
  match: Match;
  teamAName: string;
  teamBName: string;
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
        {t("scoringFinalRule")}
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
