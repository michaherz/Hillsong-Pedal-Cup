import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing Supabase env. Lege .env.local mit VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY an.",
  );
}

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    persistSession: true,
    storageKey: "padel-cup-auth",
    autoRefreshToken: true,
  },
  realtime: { params: { eventsPerSecond: 5 } },
});

export const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL ?? "";
