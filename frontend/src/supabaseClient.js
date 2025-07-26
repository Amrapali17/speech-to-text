import { createClient } from "@supabase/supabase-js";

// Replace these with your real values:
const SUPABASE_URL = "https://qfefkrzxkqbwnudchbwr.supabase.co"; // Your project URL
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmZWZrcnp4a3Fid251ZGNoYndyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzNTYzMzEsImV4cCI6MjA2ODkzMjMzMX0.pOu76z96868RL9BQEbf7ZSOV08RJVxTRRRLI1GxjXpI"; // Your anon key

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
