import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Team, Settings } from "../lib/database.types";

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
              return [...list, payload.new as Team];
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
