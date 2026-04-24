import credentials from "../config/supabase.credentials.json" with { type: "json" };

let client;

export async function getSupabaseClient() {
  if (client) return client;
  if (!credentials.supabaseUrl || !credentials.supabaseAnonKey) {
    throw new Error("Supabase Credentials fehlen in assets/js/config/supabase.credentials.json");
  }

  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  client = createClient(credentials.supabaseUrl, credentials.supabaseAnonKey);
  return client;
}
