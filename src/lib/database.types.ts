export type SkillLevel = "beginner" | "intermediate" | "advanced";

export type TournamentPhase =
  | "registration"
  | "mexicano"
  | "knockout"
  | "league"
  | "final"
  | "finished";

export type BracketPos = "sf1" | "sf2" | "final" | "third";

export type Division = "ober" | "unter";

export type Team = {
  id: string;
  team_name: string;
  player_1: string;
  player_2: string;
  skill_level: SkillLevel;
  status: "active" | "withdrawn";
  division: Division | null;
  is_demo: boolean;
  created_at: string;
};

export type SetScore = { a: number; b: number };

export type Match = {
  id: string;
  round: number;
  court: number;
  wave: number | null;
  phase: "mexicano" | "knockout" | "league" | "final";
  bracket_pos: BracketPos | null;
  division: Division | null;
  is_fun: boolean;
  is_walkover: boolean;
  team_a_id: string | null;
  team_b_id: string | null;
  score_a: number | null;
  score_b: number | null;
  best_of: 1 | 3;
  set_history: SetScore[];
  current_a: number;
  current_b: number;
  sets_a: number;
  sets_b: number;
  status: "scheduled" | "in_progress" | "done";
  played_at: string | null;
  is_demo: boolean;
  created_at: string;
};

export type TournamentMode = "box" | "swiss";

export type Settings = {
  id: number;
  registration_open: boolean;
  tournament_format: string | null;
  tournament_phase: TournamentPhase;
  tournament_mode: TournamentMode;
  public_live: boolean;
  current_round: number;
  total_courts: number;
  set_target: number;
  set_two_game_lead: boolean;
  total_cost: number;
  rounds_per_team: number;
  min_rest_slots: number;
  event_date: string | null;
  start_time: string | null;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      teams: {
        Row: Team;
        Insert: Omit<
          Team,
          "id" | "created_at" | "status" | "is_demo" | "division"
        > & {
          id?: string;
          created_at?: string;
          status?: Team["status"];
          is_demo?: boolean;
          division?: Division | null;
        };
        Update: Partial<Omit<Team, "id" | "created_at">>;
        Relationships: [];
      };
      matches: {
        Row: Match;
        Insert: Omit<
          Match,
          | "id"
          | "created_at"
          | "is_demo"
          | "best_of"
          | "set_history"
          | "current_a"
          | "current_b"
          | "sets_a"
          | "sets_b"
          | "is_fun"
          | "is_walkover"
          | "division"
        > & {
          id?: string;
          created_at?: string;
          is_demo?: boolean;
          best_of?: 1 | 3;
          set_history?: SetScore[];
          current_a?: number;
          current_b?: number;
          sets_a?: number;
          sets_b?: number;
          is_fun?: boolean;
          is_walkover?: boolean;
          division?: Division | null;
        };
        Update: Partial<Omit<Match, "id" | "created_at">>;
        Relationships: [];
      };
      settings: {
        Row: Settings;
        Insert: Omit<
          Settings,
          | "updated_at"
          | "total_cost"
          | "rounds_per_team"
          | "min_rest_slots"
          | "event_date"
          | "start_time"
          | "tournament_mode"
          | "public_live"
        > & {
          updated_at?: string;
          total_cost?: number;
          rounds_per_team?: number;
          min_rest_slots?: number;
          event_date?: string | null;
          start_time?: string | null;
          tournament_mode?: TournamentMode;
          public_live?: boolean;
        };
        Update: Partial<Omit<Settings, "id">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      skill_level: SkillLevel;
      team_status: Team["status"];
      match_status: Match["status"];
    };
    CompositeTypes: Record<string, never>;
  };
};

export const SKILL_LABELS: Record<SkillLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};
