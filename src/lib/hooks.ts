import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Match, Settings, Team } from "../lib/database.types";

export function useTeams() {
  const [teams, setTeams] = useState<Team[] | null>(null);

  useEffect(() => {
    let active = true;
    supabase
      .from("teams")
      .select("*")
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("teams fetch", error);
          setTeams([]);
          return;
        }
        setTeams(data ?? []);
      });

    const channel = supabase
      .channel("teams-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teams" },
        (payload) => {
          setTeams((prev) => {
            const list = prev ?? [];
            if (payload.eventType === "INSERT") {
              const next = payload.new as Team;
              if (list.some((t) => t.id === next.id)) return list;
              return [...list, next];
            }
            if (payload.eventType === "UPDATE") {
              return list.map((t) =>
                t.id === (payload.new as Team).id ? (payload.new as Team) : t,
              );
            }
            if (payload.eventType === "DELETE") {
              return list.filter((t) => t.id !== (payload.old as Team).id);
            }
            return list;
          });
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return teams;
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    let active = true;
    supabase
      .from("settings")
      .select("*")
      .eq("id", 1)
      .single()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("settings fetch", error);
          return;
        }
        setSettings(data);
      });

    const channel = supabase
      .channel("settings-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "settings" },
        (payload) => setSettings(payload.new as Settings),
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return settings;
}

export function useMatches() {
  const [matches, setMatches] = useState<Match[] | null>(null);

  useEffect(() => {
    let active = true;
    supabase
      .from("matches")
      .select("*")
      .order("round", { ascending: true })
      .order("wave", { ascending: true, nullsFirst: false })
      .order("court", { ascending: true })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("matches fetch", error);
          setMatches([]);
          return;
        }
        setMatches(data ?? []);
      });

    const channel = supabase
      .channel("matches-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        (payload) => {
          setMatches((prev) => {
            const list = prev ?? [];
            if (payload.eventType === "INSERT") {
              const next = payload.new as Match;
              if (list.some((m) => m.id === next.id)) return list;
              return [...list, next];
            }
            if (payload.eventType === "UPDATE") {
              return list.map((m) =>
                m.id === (payload.new as Match).id
                  ? (payload.new as Match)
                  : m,
              );
            }
            if (payload.eventType === "DELETE") {
              return list.filter(
                (m) => m.id !== (payload.old as Match).id,
              );
            }
            return list;
          });
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return matches;
}

