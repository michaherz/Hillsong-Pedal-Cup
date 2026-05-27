export type SkillLevel = "beginner" | "intermediate" | "advanced";

export type Team = {
  id: string;
  team_name: string;
  player_1: string;
  player_2: string;
  skill_level: SkillLevel;
  status: "active" | "withdrawn";
  created_at: string;
};

export type Match = {
  id: string;
  round: number;
  court: number;
  team_a_id: string | null;
  team_b_id: string | null;
  score_a: number | null;
  score_b: number | null;
  status: "scheduled" | "in_progress" | "done";
  played_at: string | null;
  created_at: string;
};

export type Settings = {
  id: number;
  registration_open: boolean;
  tournament_format: string | null;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      teams: {
        Row: Team;
        Insert: Omit<Team, "id" | "created_at" | "status"> & {
          id?: string;
          created_at?: string;
          status?: Team["status"];
        };
        Update: Partial<Omit<Team, "id" | "created_at">>;
        Relationships: [];
      };
      matches: {
        Row: Match;
        Insert: Omit<Match, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
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
