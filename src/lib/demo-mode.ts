import { supabase } from "./supabase";
import type { Match, SkillLevel, Team } from "./database.types";
import { DEFAULT_SET_RULE, type SetRule } from "./tournament-engine";

/* ---------------------------------------------------------- Demo team roster */

export type DemoTeamSeed = {
  team_name: string;
  player_1: string;
  player_2: string;
  skill_level: SkillLevel;
};

/** 10 fictional teams: 5 beginner, 3 intermediate, 2 advanced. */
export const DEMO_TEAMS: DemoTeamSeed[] = [
  // Advanced (2)
  {
    team_name: "Smash Brothers",
    player_1: "Jonas Weber",
    player_2: "Liam Becker",
    skill_level: "advanced",
  },
  {
    team_name: "Net Ninjas",
    player_1: "Sofia Lopez",
    player_2: "Mia Tanaka",
    skill_level: "advanced",
  },
  // Intermediate (3)
  {
    team_name: "Lob City",
    player_1: "Felix Hartmann",
    player_2: "Noah König",
    skill_level: "intermediate",
  },
  {
    team_name: "Dropshot Divas",
    player_1: "Hannah Roth",
    player_2: "Lara Vogel",
    skill_level: "intermediate",
  },
  {
    team_name: "Volley Vibes",
    player_1: "Tom Richter",
    player_2: "Paul Wagner",
    skill_level: "intermediate",
  },
  // Beginner (5)
  {
    team_name: "Padel Padawans",
    player_1: "Anna Schmid",
    player_2: "Lena Berger",
    skill_level: "beginner",
  },
  {
    team_name: "Rally Rookies",
    player_1: "Max Frank",
    player_2: "Ben Auer",
    skill_level: "beginner",
  },
  {
    team_name: "Bandeja Beginners",
    player_1: "Klara Stein",
    player_2: "Mara Pohl",
    skill_level: "beginner",
  },
  {
    team_name: "Glass Wall Heroes",
    player_1: "Tim Hofer",
    player_2: "Jan Reuter",
    skill_level: "beginner",
  },
  {
    team_name: "Slice & Dice",
    player_1: "Eva Lang",
    player_2: "Nina Kraus",
    skill_level: "beginner",
  },
];

/* ---------------------------------------------------------- Helpers */

export function hasDemoTeams(teams: Team[] | null): boolean {
  if (!teams) return false;
  return teams.some((t) => t.is_demo);
}

export function demoTeamCount(teams: Team[] | null): number {
  if (!teams) return 0;
  return teams.filter((t) => t.is_demo).length;
}

/* ---------------------------------------------------------- Mutations */

/** Insert all 10 demo teams as is_demo=true. Returns count inserted. */
export async function seedDemoTeams(): Promise<{
  count: number;
  error: string | null;
}> {
  const inserts = DEMO_TEAMS.map((d) => ({
    team_name: d.team_name,
    player_1: d.player_1,
    player_2: d.player_2,
    skill_level: d.skill_level,
    is_demo: true,
  }));
  const { data, error } = await supabase.from("teams").insert(inserts).select();
  if (error) return { count: 0, error: error.message };
  return { count: data?.length ?? 0, error: null };
}

/**
 * Random-score every scheduled mexicano match in the given round.
 * Skill-aware: stronger team wins more often, but upsets happen.
 * Generates a single best-of-1 set per match (Mexicano rule), respecting
 * the configured set rule (target + optional 2-game lead).
 */
export async function autoScoreRound(
  matches: Match[],
  teams: Team[],
  round: number,
  rule: SetRule = DEFAULT_SET_RULE,
): Promise<{ count: number; error: string | null }> {
  const open = matches.filter(
    (m) =>
      m.phase === "mexicano" &&
      m.round === round &&
      m.status !== "done" &&
      m.team_a_id &&
      m.team_b_id,
  );
  if (open.length === 0) return { count: 0, error: null };

  const skillRank: Record<SkillLevel, number> = {
    advanced: 3,
    intermediate: 2,
    beginner: 1,
  };

  let count = 0;
  for (const m of open) {
    const teamA = teams.find((t) => t.id === m.team_a_id);
    const teamB = teams.find((t) => t.id === m.team_b_id);
    if (!teamA || !teamB) continue;
    const a = skillRank[teamA.skill_level];
    const b = skillRank[teamB.skill_level];
    // P(A wins) ranges from ~0.25 (much weaker) to ~0.75 (much stronger).
    const diff = a - b;
    const pAwin = 0.5 + diff * 0.13;
    const aWins = Math.random() < pAwin;
    // Loser gets 0..(target-1) games when no lead requirement,
    // or 0..(target-2) when lead-of-2 is required (so winner reaches target with ≥2 lead).
    const loserMax = rule.twoLead ? rule.target - 2 : rule.target - 1;
    const loserScore = Math.floor(Math.random() * (loserMax + 1));
    const setA = aWins ? rule.target : loserScore;
    const setB = aWins ? loserScore : rule.target;
    const { error } = await supabase
      .from("matches")
      .update({
        set_history: [{ a: setA, b: setB }],
        current_a: 0,
        current_b: 0,
        sets_a: aWins ? 1 : 0,
        sets_b: aWins ? 0 : 1,
        score_a: setA,
        score_b: setB,
        status: "done",
        played_at: new Date().toISOString(),
      })
      .eq("id", m.id);
    if (error) return { count, error: error.message };
    count++;
  }
  return { count, error: null };
}

/**
 * Wipes all demo teams + demo matches and resets the tournament back to registration.
 * Reg stays in its current open/closed state — we only touch phase/round/matches/teams.
 */
export async function resetDemo(): Promise<{ error: string | null }> {
  // Order: matches first (no FK to teams via demo, but cleaner), then teams.
  const delMatches = await supabase
    .from("matches")
    .delete()
    .eq("is_demo", true);
  if (delMatches.error) return { error: delMatches.error.message };

  const delTeams = await supabase.from("teams").delete().eq("is_demo", true);
  if (delTeams.error) return { error: delTeams.error.message };

  const updSettings = await supabase
    .from("settings")
    .update({ tournament_phase: "registration", current_round: 0 })
    .eq("id", 1);
  if (updSettings.error) return { error: updSettings.error.message };

  return { error: null };
}
