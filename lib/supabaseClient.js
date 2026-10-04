import { createClient } from "@supabase/supabase-js";

// Durante il build Next.js può prerenderizzare pagine "use client" senza che
// le env var NEXT_PUBLIC_* siano ancora disponibili: usiamo dei placeholder
// in quel caso per non far fallire il build. A runtime, se le variabili vere
// non sono configurate su Vercel, le chiamate a Supabase falliranno con un
// errore di rete (da controllare nei log), non più un crash del build.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
