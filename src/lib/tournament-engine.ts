import type { BracketPos, Division, Match, SkillLevel, Team } from "./database.types";

const SKILL_RANK: Record<SkillLevel, number> = {
  advanced: 0,
  intermediate: 1,
  beginner: 2,
};

export type Pairing = { teamA: string; teamB: string };

export type Standing = {
  teamId: string;
  played: number;
  wins: number;
  losses: number;
  draws: number;
  gamesFor: number;
  gamesAgainst: number;
  gamesDiff: number;
  points: number;
  position: number;
};

function activeTeams(teams: Team[]): Team[] {
  return teams.filter((t) => t.status === "active");
}

/* ---------------------------------------------------------- Box-Liga engine
 * Ported from the verified prototype (/tmp/league_engine.mjs). Generates a
 * complete group-phase (league) schedule split into two divisions, packing
 * each team's counted games across slots (waves) with a minimum rest gap, and
 * filling empty court cells with non-counting fun games.
 */

type EngineTeam = { id: string; skill_level: SkillLevel; status: Team["status"]; created_at: string; division: Division | null };

type EngineMatch = { a: string; b: string; division: Division; isFun: boolean };

export type LeagueSlot = EngineMatch[];

export type LeagueSchedule = {
  divisions: { ober: EngineTeam[]; unter: EngineTeam[] };
  slots: LeagueSlot[];
  divOf: Map<string, Division>;
};

/**
 * Auto-split active teams into two divisions by skill.
 * If EVERY active team already has a division set, respect the manual split.
 * Otherwise sort by skill (advanced < intermediate < beginner) then created_at
 * and put the larger half into 'ober'.
 */
export function splitDivisions(teams: EngineTeam[]): {
  ober: EngineTeam[];
  unter: EngineTeam[];
} {
  const allManual =
    teams.length > 0 &&
    teams.every((t) => t.division === "ober" || t.division === "unter");
  if (allManual) {
    return {
      ober: teams.filter((t) => t.division === "ober"),
      unter: teams.filter((t) => t.division === "unter"),
    };
  }
  const sorted = [...teams].sort(
    (a, b) =>
      SKILL_RANK[a.skill_level] - SKILL_RANK[b.skill_level] ||
      String(a.created_at ?? "").localeCompare(String(b.created_at ?? "")),
  );
  const cut = Math.ceil(sorted.length / 2); // larger half = Ober
  return { ober: sorted.slice(0, cut), unter: sorted.slice(cut) };
}

/** Circulant graph: every node degree K, no double edges. Clean for even K. */
export function circulantPairings(ids: string[], K: number): [string, string][] {
  const n = ids.length;
  const edges: [string, string][] = [];
  const seen = new Set<string>();
  const add = (i: number, j: number) => {
    if (i === j) return;
    const key = i < j ? `${i}-${j}` : `${j}-${i}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push([ids[i], ids[j]]);
  };
  const half = Math.floor(K / 2);
  for (let off = 1; off <= half; off++)
    for (let i = 0; i < n; i++) add(i, (i + off) % n);
  if (K % 2 === 1) {
    const off = Math.floor(n / 2);
    for (let i = 0; i < n; i++) add(i, (i + off) % n);
  }
  return edges;
}

/** Backtracking packer: distributes matches across maxSlots x courts, min rest gap. */
function packBacktrack(
  matches: EngineMatch[],
  courts: number,
  gap: number,
  maxSlots: number,
): EngineMatch[][] | null {
  const slots: EngineMatch[][] = Array.from({ length: maxSlots }, () => []);
  const teamSlots = new Map<string, number[]>();
  let nodes = 0;
  const canPlace = (m: EngineMatch, s: number) => {
    if (slots[s].length >= courts) return false;
    for (const x of slots[s])
      if (x.a === m.a || x.b === m.a || x.a === m.b || x.b === m.b) return false;
    for (const tt of [m.a, m.b])
      for (const os of teamSlots.get(tt) ?? [])
        if (Math.abs(os - s) < gap) return false;
    return true;
  };
  const place = (idx: number): boolean => {
    if (idx === matches.length) return true;
    if (++nodes > 2_000_000) return false; // safety
    const m = matches[idx];
    const cand = [...Array(maxSlots).keys()].sort(
      (p, q) => slots[p].length - slots[q].length || p - q,
    );
    for (const s of cand) {
      if (!canPlace(m, s)) continue;
      slots[s].push(m);
      teamSlots.set(m.a, [...(teamSlots.get(m.a) ?? []), s]);
      teamSlots.set(m.b, [...(teamSlots.get(m.b) ?? []), s]);
      if (place(idx + 1)) return true;
      slots[s].pop();
      teamSlots.set(m.a, (teamSlots.get(m.a) ?? []).filter((x) => x !== s));
      teamSlots.set(m.b, (teamSlots.get(m.b) ?? []).filter((x) => x !== s));
    }
    return false;
  };
  return place(0) ? slots.filter((s) => s.length > 0) : null;
}

/** Finds the best plan: max rest gap (minGap -> 1), minimal slot count. */
export function packSlots(
  matches: EngineMatch[],
  courts: number,
  minGap: number,
): EngineMatch[][] {
  const minSlots = Math.ceil(matches.length / courts);
  for (let gap = minGap; gap >= 1; gap--) {
    for (let maxSlots = minSlots; maxSlots <= minSlots + 4; maxSlots++) {
      const res = packBacktrack(matches, courts, gap, maxSlots);
      if (res) return res;
    }
  }
  return packBacktrack(matches, courts, 1, matches.length) ?? [];
}

/** Order matches so divisions alternate (better distribution). */
function interleave<T>(a: T[], b: T[]): T[] {
  const out: T[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length) out.push(a[i++]);
    if (j < b.length) out.push(b[j++]);
  }
  return out;
}

/** Fill empty court cells per slot with non-counting fun games between resting
 * teams. Prefer same division, each team max 1 fun game overall. */
export function fillFunGames(
  slots: EngineMatch[][],
  allTeams: string[],
  courts: number,
  divOf: Map<string, Division>,
): EngineMatch[][] {
  const teamSlots = new Map<string, number[]>();
  slots.forEach((slot, i) =>
    slot.forEach((m) => {
      teamSlots.set(m.a, [...(teamSlots.get(m.a) ?? []), i]);
      teamSlots.set(m.b, [...(teamSlots.get(m.b) ?? []), i]);
    }),
  );
  const usedFun = new Set<string>();
  slots.forEach((slot, i) => {
    let free = courts - slot.length;
    while (free > 0) {
      const playing = new Set(slot.flatMap((x) => [x.a, x.b]));
      const cands = allTeams.filter(
        (tt) =>
          !playing.has(tt) &&
          !usedFun.has(tt) &&
          !(teamSlots.get(tt) ?? []).some((s) => Math.abs(s - i) <= 1),
      );
      cands.sort((x, y) =>
        (divOf.get(x) ?? "unter").localeCompare(divOf.get(y) ?? "unter"),
      );
      let pair: string[] = [];
      for (const tt of cands) {
        if (!pair.length) pair.push(tt);
        else if (divOf.get(tt) === divOf.get(pair[0])) {
          pair.push(tt);
          break;
        }
      }
      if (pair.length < 2) pair = cands.slice(0, 2);
      if (pair.length < 2) break;
      slot.push({
        a: pair[0],
        b: pair[1],
        division: divOf.get(pair[0]) ?? "unter",
        isFun: true,
      });
      pair.forEach((tt) => usedFun.add(tt));
      free--;
    }
  });
  return slots;
}

/** Build the full Box-Liga group-phase schedule for the given teams. */
export function generateLeagueSchedule(
  teams: Team[],
  {
    courts = 3,
    roundsPerTeam = 4,
    minGap = 2,
  }: { courts?: number; roundsPerTeam?: number; minGap?: number } = {},
): LeagueSchedule {
  const active: EngineTeam[] = teams
    .filter((t) => t.status !== "withdrawn")
    .map((t) => ({
      id: t.id,
      skill_level: t.skill_level,
      status: t.status,
      created_at: t.created_at,
      division: t.division,
    }));
  const { ober, unter } = splitDivisions(active);
  const divOf = new Map<string, Division>();
  ober.forEach((t) => divOf.set(t.id, "ober"));
  unter.forEach((t) => divOf.set(t.id, "unter"));
  const oberM: EngineMatch[] = circulantPairings(
    ober.map((t) => t.id),
    roundsPerTeam,
  ).map(([a, b]) => ({ a, b, division: "ober", isFun: false }));
  const unterM: EngineMatch[] = circulantPairings(
    unter.map((t) => t.id),
    roundsPerTeam,
  ).map(([a, b]) => ({ a, b, division: "unter", isFun: false }));
  const ordered = interleave(oberM, unterM);
  let slots = packSlots(ordered, courts, minGap);
  slots = fillFunGames(slots, active.map((t) => t.id), courts, divOf);
  return { divisions: { ober, unter }, slots, divOf };
}

/* ---------------------------------------------------------- Standings */

function emptyStanding(teamId: string): Standing {
  return {
    teamId,
    played: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    gamesFor: 0,
    gamesAgainst: 0,
    gamesDiff: 0,
    points: 0,
    position: 0,
  };
}

function sortStandings(list: Standing[]): Standing[] {
  const sorted = [...list].sort((x, y) => {
    if (y.points !== x.points) return y.points - x.points;
    if (y.gamesDiff !== x.gamesDiff) return y.gamesDiff - x.gamesDiff;
    if (y.gamesFor !== x.gamesFor) return y.gamesFor - x.gamesFor;
    return x.teamId.localeCompare(y.teamId);
  });
  sorted.forEach((s, i) => (s.position = i + 1));
  return sorted;
}

/**
 * Core accumulator. Counts every DONE, non-fun match in the given phase(s)
 * where both teams are present (or a walkover). Walkover: the present side wins.
 */
function accumulate(
  map: Map<string, Standing>,
  matches: Match[],
  opts: { phases: Match["phase"][]; division?: Division },
): void {
  for (const m of matches) {
    if (!opts.phases.includes(m.phase)) continue;
    if (m.is_fun) continue;
    if (m.status !== "done") continue;
    if (opts.division && m.division !== opts.division) continue;

    // Walkover: exactly one side present -> that side wins, no games counted.
    if (m.is_walkover) {
      const present = m.team_a_id ?? m.team_b_id;
      if (!present) continue;
      const s = map.get(present);
      if (!s) continue;
      s.played++;
      s.wins++;
      s.points += 3;
      continue;
    }

    if (m.score_a == null || m.score_b == null || !m.team_a_id || !m.team_b_id) {
      continue;
    }
    const a = map.get(m.team_a_id);
    const b = map.get(m.team_b_id);
    if (!a || !b) continue;
    a.played++;
    b.played++;
    a.gamesFor += m.score_a;
    a.gamesAgainst += m.score_b;
    b.gamesFor += m.score_b;
    b.gamesAgainst += m.score_a;
    const aWon =
      m.sets_a > m.sets_b || (m.sets_a === m.sets_b && m.score_a > m.score_b);
    const bWon =
      m.sets_b > m.sets_a || (m.sets_a === m.sets_b && m.score_b > m.score_a);
    if (aWon) {
      a.wins++;
      b.losses++;
      a.points += 3;
    } else if (bWon) {
      b.wins++;
      a.losses++;
      b.points += 3;
    } else {
      // Level on sets AND games -> draw (only possible in timed group rounds).
      // 1 point each; neither counts as a win or a loss.
      a.draws++;
      b.draws++;
      a.points += 1;
      b.points += 1;
    }
  }
}

/**
 * Overall standings across the league phase (both divisions). Kept for the
 * public overview. Counts league matches only (non-fun, done).
 */
export function computeStandings(teams: Team[], matches: Match[]): Standing[] {
  const map = new Map<string, Standing>();
  for (const t of activeTeams(teams)) map.set(t.id, emptyStanding(t.id));
  accumulate(map, matches, { phases: ["league"] });
  for (const s of map.values()) s.gamesDiff = s.gamesFor - s.gamesAgainst;
  return sortStandings([...map.values()]);
}

/**
 * Standings for a single division. Only counts non-fun league matches with
 * both teams in that division (walkover: present team wins).
 */
export function computeDivisionStandings(
  teams: Team[],
  matches: Match[],
  division: Division,
): Standing[] {
  const map = new Map<string, Standing>();
  for (const t of activeTeams(teams)) {
    if (t.division === division) map.set(t.id, emptyStanding(t.id));
  }
  // Fall back to match-derived division membership for teams whose division
  // column is null (auto-split) but who played counted matches in this division.
  accumulate(map, matches, { phases: ["league"], division });
  // Ensure teams that only appear via matches (division null on team row) are
  // still represented: add any team_id that shows up in a counted division match.
  for (const m of matches) {
    if (m.phase !== "league" || m.is_fun || m.division !== division) continue;
    for (const id of [m.team_a_id, m.team_b_id]) {
      if (id && !map.has(id) && teams.some((t) => t.id === id && t.status === "active")) {
        map.set(id, emptyStanding(id));
      }
    }
  }
  // Re-accumulate now that late-added teams exist.
  for (const s of map.values()) {
    s.played = 0;
    s.wins = 0;
    s.losses = 0;
    s.draws = 0;
    s.gamesFor = 0;
    s.gamesAgainst = 0;
    s.points = 0;
  }
  accumulate(map, matches, { phases: ["league"], division });
  for (const s of map.values()) s.gamesDiff = s.gamesFor - s.gamesAgainst;
  return sortStandings([...map.values()]);
}

/* ---------------------------------------------------------- Division finals */

export type FinalEntry = Pairing & {
  division: Division;
  bracketPos: "final" | "third";
  court: number;
};

/**
 * Seed the finals for a division from its standings: final = 1 vs 2,
 * third = 3 vs 4. NULL-SAFE: if fewer than 2/4 teams exist, entries are
 * skipped rather than crashing.
 */
export function seedDivisionFinals(
  division: Division,
  standings: Standing[],
): FinalEntry[] {
  const out: FinalEntry[] = [];
  const t1 = standings[0]?.teamId ?? null;
  const t2 = standings[1]?.teamId ?? null;
  const t3 = standings[2]?.teamId ?? null;
  const t4 = standings[3]?.teamId ?? null;
  if (t1 && t2) {
    out.push({ teamA: t1, teamB: t2, division, bracketPos: "final", court: 1 });
  }
  if (t3 && t4) {
    out.push({ teamA: t3, teamB: t4, division, bracketPos: "third", court: 2 });
  }
  return out;
}

/** True if all counted (non-fun) league matches are done. */
export function leagueComplete(matches: Match[]): boolean {
  const league = matches.filter((m) => m.phase === "league" && !m.is_fun);
  if (league.length === 0) return false;
  return league.every((m) => m.status === "done");
}

/**
 * True if any counted, non-walkover league match still has a null team — i.e.
 * a withdrawal has not been resolved. Blocks advancing to finals.
 */
export function hasUnresolvedLeagueMatch(matches: Match[]): boolean {
  return matches.some(
    (m) =>
      m.phase === "league" &&
      !m.is_fun &&
      !m.is_walkover &&
      (m.team_a_id == null || m.team_b_id == null),
  );
}

/** True if final + third are done for both divisions (as far as they exist). */
export function divisionFinalsComplete(matches: Match[]): boolean {
  const finals = matches.filter((m) => m.phase === "final");
  if (finals.length === 0) return false;
  return finals.every((m) => m.status === "done");
}

/* ---------------------------------------------------------- Set scoring */

/** Best-of-N for a given match phase + bracket slot. Final + 3rd place = 3, else 1. */
export function bestOfForBracket(
  phase: Match["phase"],
  bracketPos: BracketPos | null,
): 1 | 3 {
  if (
    phase === "knockout" &&
    (bracketPos === "final" || bracketPos === "third")
  ) {
    return 3;
  }
  return 1;
}

/**
 * Decide if the current set is decided.
 * Default rule: first to 6 games AND at least 2 games ahead. No tiebreak — keep going.
 * Configurable: target + twoLead from settings.
 * Returns "a" / "b" if a side has won, otherwise null.
 */
export function setWon(
  a: number,
  b: number,
  target = 6,
  twoLead = true,
): "a" | "b" | null {
  if (twoLead) {
    if (a >= target && a - b >= 2) return "a";
    if (b >= target && b - a >= 2) return "b";
  } else {
    if (a >= target && a > b) return "a";
    if (b >= target && b > a) return "b";
  }
  return null;
}

/** Convenience type for passing the set-rule around. */
export type SetRule = { target: number; twoLead: boolean };

export const DEFAULT_SET_RULE: SetRule = { target: 6, twoLead: true };

/** Decide if a match is won, given sets won + best_of. */
export function matchWon(
  setsA: number,
  setsB: number,
  bestOf: 1 | 3,
): "a" | "b" | null {
  const need = bestOf === 1 ? 1 : 2;
  if (setsA >= need) return "a";
  if (setsB >= need) return "b";
  return null;
}

/** Sum of all games-for (across completed sets + current set). */
export function totalGames(match: Match): { a: number; b: number } {
  let a = match.current_a;
  let b = match.current_b;
  for (const s of match.set_history ?? []) {
    a += s.a;
    b += s.b;
  }
  return { a, b };
}

/* ============================================================ Swiss mode
 * Resurrected from the old Mexicano engine (git a4c42fd / 99ea121). A single
 * pool: Round 1 is skill-seeded (similar skill plays similar), later rounds are
 * standings-paired ("winners vs winners"). After N group rounds the top 4 go
 * into a KO: semifinals (1v4, 2v3) then final + third place.
 *
 * Phase values used in the DB (allowed by the phase check constraint):
 *   - group rounds  -> phase 'mexicano'
 *   - KO            -> phase 'knockout'
 * These never collide with Box-Liga's 'league' / 'final' matches, so the two
 * modes can share the same tables without cross-contaminating queries.
 *
 * NULL-safety: KO seeding and standings tolerate withdrawn / missing teams and
 * never use non-null assertions on team ids.
 */

export type SwissPairing = { teamA: string; teamB: string };

export type SwissScheduleEntry = SwissPairing & {
  round: number;
  wave: number;
  court: number;
  phase: "mexicano";
};

export type SwissKOEntry = SwissPairing & {
  bracketPos: BracketPos;
  court: number;
  phase: "knockout";
  round: 1 | 2;
};

/** Round 1 — pair adjacent teams after sorting by skill (similar plays similar).
 * The resulting pairings are then reordered by readiness so that matches between
 * two ready teams come first, then those with one ready team, then none. buildSchedule
 * assigns waves by pairing index, so ready-team matches land in the earliest waves.
 * The (skill) order within each readiness group is preserved (stable). */
export function seedRound1(teams: Team[]): SwissPairing[] {
  const active = activeTeams(teams);
  const sorted = [...active].sort((a, b) => {
    const sd = SKILL_RANK[a.skill_level] - SKILL_RANK[b.skill_level];
    if (sd !== 0) return sd;
    return String(a.created_at ?? "").localeCompare(String(b.created_at ?? ""));
  });
  const pairings = pairAdjacent(sorted.map((t) => t.id));

  // Readiness lookup + reorder (stable). Rank: both ready (0) < one ready (1) < none (2).
  const readyById = new Map<string, boolean>();
  for (const t of active) readyById.set(t.id, t.ready === true);
  const rank = (p: SwissPairing): number =>
    2 - (Number(readyById.get(p.teamA) ?? false) + Number(readyById.get(p.teamB) ?? false));
  return pairings
    .map((p, i) => ({ p, i, r: rank(p) }))
    .sort((x, y) => x.r - y.r || x.i - y.i)
    .map((x) => x.p);
}

/** Round 2+ — pair by standings (winners play winners), avoiding rematches.
 * playedPairs = set of "a|b" (sorted) already-played pairings. Greedy: each team
 * (top-down by standing) meets the nearest not-yet-played opponent; only if none
 * is left does it fall back to the nearest available team (rematch as last resort). */
export function seedNextRound(
  standings: Standing[],
  playedPairs?: Set<string>,
): SwissPairing[] {
  const ids = standings.map((s) => s.teamId);
  if (!playedPairs) return pairAdjacent(ids);
  const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const used = new Array(ids.length).fill(false);
  const out: SwissPairing[] = [];
  for (let i = 0; i < ids.length; i++) {
    if (used[i]) continue;
    used[i] = true;
    let j = -1;
    // Prefer the nearest opponent (by standing) not played yet.
    for (let k = i + 1; k < ids.length; k++) {
      if (used[k]) continue;
      if (!playedPairs.has(key(ids[i], ids[k]))) {
        j = k;
        break;
      }
    }
    // Fallback: nearest available team (allow a rematch if unavoidable).
    if (j === -1) {
      for (let k = i + 1; k < ids.length; k++) {
        if (!used[k]) {
          j = k;
          break;
        }
      }
    }
    if (j === -1) break; // odd leftover -> bye
    used[j] = true;
    out.push({ teamA: ids[i], teamB: ids[j] });
  }
  return out;
}

/** Build the set of already-played "a|b" pairings from all matches with 2 teams. */
export function playedPairSet(matches: Match[]): Set<string> {
  const set = new Set<string>();
  for (const m of matches) {
    const a = m.team_a_id;
    const b = m.team_b_id;
    if (a && b) set.add(a < b ? `${a}|${b}` : `${b}|${a}`);
  }
  return set;
}

function pairAdjacent(ids: string[]): SwissPairing[] {
  const out: SwissPairing[] = [];
  for (let i = 0; i + 1 < ids.length; i += 2) {
    out.push({ teamA: ids[i], teamB: ids[i + 1] });
  }
  // Odd team out gets a bye -> not paired this round.
  return out;
}

/** Distribute pairings across waves and courts. Match i -> wave floor(i/courts)+1, court (i%courts)+1. */
export function buildSchedule(
  pairings: SwissPairing[],
  round: number,
  courts: number,
): SwissScheduleEntry[] {
  const c = Math.max(courts, 1);
  return pairings.map((p, i) => ({
    ...p,
    round,
    wave: Math.floor(i / c) + 1,
    court: (i % c) + 1,
    phase: "mexicano",
  }));
}

/** Top 4 -> SF1 (1v4) + SF2 (2v3) on parallel courts. NULL-safe. */
export function seedKOSemis(standings: Standing[]): SwissKOEntry[] {
  if (standings.length < 4) return [];
  const t1 = standings[0]?.teamId ?? null;
  const t2 = standings[1]?.teamId ?? null;
  const t3 = standings[2]?.teamId ?? null;
  const t4 = standings[3]?.teamId ?? null;
  const out: SwissKOEntry[] = [];
  if (t1 && t4) {
    out.push({ teamA: t1, teamB: t4, bracketPos: "sf1", court: 1, phase: "knockout", round: 1 });
  }
  if (t2 && t3) {
    out.push({ teamA: t2, teamB: t3, bracketPos: "sf2", court: 2, phase: "knockout", round: 1 });
  }
  return out;
}

/** After SFs are done: Final (winners) + Third-place (losers), parallel. NULL-safe. */
export function seedKOFinals(matches: Match[]): SwissKOEntry[] {
  const sf1 = matches.find(
    (m) => m.phase === "knockout" && m.bracket_pos === "sf1" && m.status === "done",
  );
  const sf2 = matches.find(
    (m) => m.phase === "knockout" && m.bracket_pos === "sf2" && m.status === "done",
  );
  if (!sf1 || !sf2) return [];
  // Winner/loser prefer sets, fall back to games. Walkover: present side wins.
  const winner = (m: Match): string | null => {
    if (m.is_walkover) return m.team_a_id ?? m.team_b_id ?? null;
    if (m.sets_a > m.sets_b) return m.team_a_id;
    if (m.sets_b > m.sets_a) return m.team_b_id;
    if ((m.score_a ?? 0) > (m.score_b ?? 0)) return m.team_a_id;
    return m.team_b_id;
  };
  const loser = (m: Match): string | null => {
    const w = winner(m);
    if (m.team_a_id && m.team_a_id !== w) return m.team_a_id;
    if (m.team_b_id && m.team_b_id !== w) return m.team_b_id;
    return null;
  };
  const finalA = winner(sf1);
  const finalB = winner(sf2);
  const thirdA = loser(sf1);
  const thirdB = loser(sf2);
  const out: SwissKOEntry[] = [];
  if (finalA && finalB) {
    out.push({ teamA: finalA, teamB: finalB, bracketPos: "final", court: 1, phase: "knockout", round: 2 });
  }
  if (thirdA && thirdB) {
    out.push({ teamA: thirdA, teamB: thirdB, bracketPos: "third", court: 2, phase: "knockout", round: 2 });
  }
  return out;
}

/**
 * Single-pool standings for the Swiss group phase (phase 'mexicano', non-fun).
 * Walkover: the present side wins, no games counted.
 */
export function computeSwissStandings(teams: Team[], matches: Match[]): Standing[] {
  const map = new Map<string, Standing>();
  for (const t of activeTeams(teams)) map.set(t.id, emptyStanding(t.id));
  accumulate(map, matches, { phases: ["mexicano"] });
  for (const s of map.values()) s.gamesDiff = s.gamesFor - s.gamesAgainst;
  return sortStandings([...map.values()]);
}

/** All Swiss group matches in a given round done? (non-empty + all done) */
export function isSwissRoundComplete(matches: Match[], round: number): boolean {
  const inRound = matches.filter((m) => m.phase === "mexicano" && m.round === round);
  if (inRound.length === 0) return false;
  return inRound.every((m) => m.status === "done");
}

/** True if both KO semis exist and are done. */
export function swissSemisComplete(matches: Match[]): boolean {
  const sfs = matches.filter(
    (m) => m.phase === "knockout" && (m.bracket_pos === "sf1" || m.bracket_pos === "sf2"),
  );
  if (sfs.length === 0) return false;
  return sfs.every((m) => m.status === "done");
}

/** True if the KO final + third place both exist and are done. */
export function swissFinalsComplete(matches: Match[]): boolean {
  const fs = matches.filter(
    (m) => m.phase === "knockout" && (m.bracket_pos === "final" || m.bracket_pos === "third"),
  );
  if (fs.length === 0) return false;
  return fs.every((m) => m.status === "done");
}

/** Best-of-N for a Swiss KO slot: final + 3rd place = 3, else 1. */
export function bestOfForSwissKO(bracketPos: BracketPos | null): 1 | 3 {
  return bracketPos === "final" || bracketPos === "third" ? 3 : 1;
}
