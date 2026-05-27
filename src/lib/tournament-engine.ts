import type { BracketPos, Match, SkillLevel, Team } from "./database.types";

const SKILL_RANK: Record<SkillLevel, number> = {
  advanced: 0,
  intermediate: 1,
  beginner: 2,
};

export type Pairing = { teamA: string; teamB: string };

export type ScheduleEntry = Pairing & {
  round: number;
  wave: number;
  court: number;
  phase: "mexicano";
};

export type KOEntry = Pairing & {
  bracketPos: BracketPos;
  court: number;
  phase: "knockout";
  round: 1 | 2;
};

export type Standing = {
  teamId: string;
  played: number;
  wins: number;
  losses: number;
  gamesFor: number;
  gamesAgainst: number;
  gamesDiff: number;
  points: number;
  position: number;
};

function activeTeams(teams: Team[]): Team[] {
  return teams.filter((t) => t.status === "active");
}

/** Round 1 — pair adjacent teams after sorting by skill (similar skill plays similar). */
export function seedRound1(teams: Team[]): Pairing[] {
  const sorted = [...activeTeams(teams)].sort((a, b) => {
    const sd = SKILL_RANK[a.skill_level] - SKILL_RANK[b.skill_level];
    if (sd !== 0) return sd;
    return a.created_at.localeCompare(b.created_at);
  });
  return pairAdjacent(sorted.map((t) => t.id));
}

/** Round 2+ — pair by current standings (winners play winners). */
export function seedNextRound(standings: Standing[]): Pairing[] {
  return pairAdjacent(standings.map((s) => s.teamId));
}

function pairAdjacent(ids: string[]): Pairing[] {
  const out: Pairing[] = [];
  for (let i = 0; i + 1 < ids.length; i += 2) {
    out.push({ teamA: ids[i], teamB: ids[i + 1] });
  }
  // odd team gets a bye → not paired this round
  return out;
}

/** Distribute pairings across waves and courts. Match i → wave floor(i/courts)+1, court (i%courts)+1. */
export function buildSchedule(
  pairings: Pairing[],
  round: number,
  courts: number,
): ScheduleEntry[] {
  return pairings.map((p, i) => ({
    ...p,
    round,
    wave: Math.floor(i / courts) + 1,
    court: (i % courts) + 1,
    phase: "mexicano",
  }));
}

/** Top 4 → SF1 (1v4) + SF2 (2v3) on parallel courts. */
export function seedKOSemis(standings: Standing[]): KOEntry[] {
  if (standings.length < 4) return [];
  const [t1, t2, t3, t4] = standings.slice(0, 4).map((s) => s.teamId);
  return [
    { teamA: t1, teamB: t4, bracketPos: "sf1", court: 1, phase: "knockout", round: 1 },
    { teamA: t2, teamB: t3, bracketPos: "sf2", court: 2, phase: "knockout", round: 1 },
  ];
}

/** After SFs are done: Final (winners) + Third-place (losers), parallel. */
export function seedKOFinals(matches: Match[]): KOEntry[] {
  const sf1 = matches.find((m) => m.bracket_pos === "sf1" && m.status === "done");
  const sf2 = matches.find((m) => m.bracket_pos === "sf2" && m.status === "done");
  if (!sf1 || !sf2) return [];
  const w = (m: Match) => (m.score_a! > m.score_b! ? m.team_a_id : m.team_b_id);
  const l = (m: Match) => (m.score_a! > m.score_b! ? m.team_b_id : m.team_a_id);
  const finalA = w(sf1)!;
  const finalB = w(sf2)!;
  const thirdA = l(sf1)!;
  const thirdB = l(sf2)!;
  return [
    { teamA: finalA, teamB: finalB, bracketPos: "final", court: 1, phase: "knockout", round: 2 },
    { teamA: thirdA, teamB: thirdB, bracketPos: "third", court: 2, phase: "knockout", round: 2 },
  ];
}

/** Compute standings from completed Mexicano matches. Sorted by points desc, gamesDiff desc, gamesFor desc. */
export function computeStandings(teams: Team[], matches: Match[]): Standing[] {
  const map = new Map<string, Standing>();
  for (const t of activeTeams(teams)) {
    map.set(t.id, {
      teamId: t.id,
      played: 0,
      wins: 0,
      losses: 0,
      gamesFor: 0,
      gamesAgainst: 0,
      gamesDiff: 0,
      points: 0,
      position: 0,
    });
  }
  for (const m of matches) {
    if (
      m.phase !== "mexicano" ||
      m.status !== "done" ||
      m.score_a == null ||
      m.score_b == null ||
      !m.team_a_id ||
      !m.team_b_id
    ) {
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
    if (m.score_a > m.score_b) {
      a.wins++;
      b.losses++;
      a.points += 3;
    } else if (m.score_b > m.score_a) {
      b.wins++;
      a.losses++;
      b.points += 3;
    }
  }
  for (const s of map.values()) s.gamesDiff = s.gamesFor - s.gamesAgainst;
  const sorted = [...map.values()].sort((x, y) => {
    if (y.points !== x.points) return y.points - x.points;
    if (y.gamesDiff !== x.gamesDiff) return y.gamesDiff - x.gamesDiff;
    if (y.gamesFor !== x.gamesFor) return y.gamesFor - x.gamesFor;
    return x.teamId.localeCompare(y.teamId);
  });
  sorted.forEach((s, i) => (s.position = i + 1));
  return sorted;
}

/** All Mexicano matches in a round done? */
export function isRoundComplete(matches: Match[], round: number): boolean {
  const inRound = matches.filter(
    (m) => m.phase === "mexicano" && m.round === round,
  );
  if (inRound.length === 0) return false;
  return inRound.every((m) => m.status === "done");
}

/** True if all KO semis are done (means we can start finals). */
export function semisComplete(matches: Match[]): boolean {
  const sfs = matches.filter(
    (m) => m.phase === "knockout" && (m.bracket_pos === "sf1" || m.bracket_pos === "sf2"),
  );
  return sfs.length === 2 && sfs.every((m) => m.status === "done");
}

/** True if final + third place are both done. */
export function finalsComplete(matches: Match[]): boolean {
  const fs = matches.filter(
    (m) => m.phase === "knockout" && (m.bracket_pos === "final" || m.bracket_pos === "third"),
  );
  return fs.length === 2 && fs.every((m) => m.status === "done");
}

export const TOTAL_MEXICANO_ROUNDS = 3;
