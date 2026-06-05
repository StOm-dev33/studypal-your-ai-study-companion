import process from "node:process";

export function getServerConfig() {
  return {
    nodeEnv: process.env.NODE_ENV,
    groqApiKey: process.env.GROQ_API_KEY,
    aethexApiKey: process.env.AETHEX_API_KEY,
    aethexBaseUrl: process.env.AETHEX_BASE_URL ?? "https://api.aethexai.com/api/v1",
    supabaseUrl: process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}
