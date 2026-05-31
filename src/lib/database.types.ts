export type SkillLevel = "beginner" | "intermediate" | "advanced";

export type TournamentPhase =
  | "registration"
  | "mexicano"
  | "knockout"
  | "finished";

export type BracketPos = "sf1" | "sf2" | "final" | "third";

export type Team = {
  id: string;
  team_name: string;
  player_1: string;
  player_2: string;
  skill_level: SkillLevel;
  status: "active" | "withdrawn";
  is_demo: boolean;
  created_at: string;
};

export type SetScore = { a: number; b: number };

export type Match = {
  id: string;
  round: number;
  court: number;
  wave: number | null;
  phase: "mexicano" | "knockout";
  bracket_pos: BracketPos | null;
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

export type Settings = {
  id: number;
  registration_open: boolean;
  tournament_format: string | null;
  tournament_phase: TournamentPhase;
  current_round: number;
  total_courts: number;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      teams: {
        Row: Team;
        Insert: Omit<Team, "id" | "created_at" | "status" | "is_demo"> & {
          id?: string;
          created_at?: string;
          status?: Team["status"];
          is_demo?: boolean;
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
        };
        Update: Partial<Omit<Match, "id" | "created_at">>;
        Relationships: [];
      };
      settings: {
        Row: Settings;
        Insert: Omit<Settings, "updated_at"> & {
          updated_at?: string;
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
