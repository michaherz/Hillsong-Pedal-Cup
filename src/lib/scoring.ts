import { supabase } from "./supabase";
import type { Match, SetScore } from "./database.types";
import { matchWon, setWon } from "./tournament-engine";

/**
 * Update payload for one game-bump action. Computed pure-function-style so
 * it's testable + the modal can preview the next state before saving.
 */
export type ScoringUpdate = {
  set_history: SetScore[];
  current_a: number;
  current_b: number;
  sets_a: number;
  sets_b: number;
  score_a: number;
  score_b: number;
  status: Match["status"];
  played_at: string | null;
};

/** Bump a single game up or down for one side. Side: "a" | "b", delta: +1 | -1. */
export function bumpGame(
  match: Match,
  side: "a" | "b",
  delta: 1 | -1,
): ScoringUpdate {
  let currentA = match.current_a;
  let currentB = match.current_b;
  if (side === "a") currentA = Math.max(0, currentA + delta);
  else currentB = Math.max(0, currentB + delta);

  let setHistory: SetScore[] = [...match.set_history];
  let setsA = match.sets_a;
  let setsB = match.sets_b;
  let status: Match["status"] =
    match.status === "scheduled" ? "in_progress" : match.status;
  let playedAt = match.played_at;

  // Set-transition: when set is decided, push to history + reset current.
  // Only triggers on +1 (delta=1). On -1 we're correcting a mis-tap, no auto-close.
  if (delta === 1) {
    const winner = setWon(currentA, currentB);
    if (winner) {
      setHistory = [...setHistory, { a: currentA, b: currentB }];
      if (winner === "a") setsA++;
      else setsB++;
      currentA = 0;
      currentB = 0;
    }
  }

  // Match completion: when sets-won reaches the threshold for best_of.
  const matchWinner = matchWon(setsA, setsB, match.best_of);
  if (matchWinner) {
    status = "done";
    playedAt = new Date().toISOString();
  }

  // Total games across all completed sets + current set (denormalized).
  const totalA =
    setHistory.reduce((sum, s) => sum + s.a, 0) + currentA;
  const totalB =
    setHistory.reduce((sum, s) => sum + s.b, 0) + currentB;

  return {
    set_history: setHistory,
    current_a: currentA,
    current_b: currentB,
    sets_a: setsA,
    sets_b: setsB,
    score_a: totalA,
    score_b: totalB,
    status,
    played_at: playedAt,
  };
}

/** Persist a ScoringUpdate to Supabase. */
export async function applyScoringUpdate(
  matchId: string,
  update: ScoringUpdate,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("matches")
    .update(update)
    .eq("id", matchId);
  return { error: error?.message ?? null };
}

/** Reset a match's score to fresh (for restart / fix). */
export function resetScoring(): ScoringUpdate {
  return {
    set_history: [],
    current_a: 0,
    current_b: 0,
    sets_a: 0,
    sets_b: 0,
    score_a: 0,
    score_b: 0,
    status: "scheduled",
    played_at: null,
  };
}

/** Format a match's scoring for compact display. */
export function formatScoreLine(match: Match): string {
  if (match.set_history.length === 0 && match.current_a === 0 && match.current_b === 0) {
    return "—";
  }
  const sets = match.set_history.map((s) => `${s.a}-${s.b}`);
  if (match.status !== "done") {
    sets.push(`${match.current_a}-${match.current_b}`);
  }
  return sets.join(", ");
}
