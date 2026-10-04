import { createBrowserClient } from "@supabase/ssr";

// Durante il build Next.js può prerenderizzare pagine "use client" senza che
// le env var NEXT_PUBLIC_* siano ancora disponibili: usiamo dei placeholder
// in quel caso per non far fallire il build. A runtime, se le variabili vere
// non sono configurate su Vercel, le chiamate a Supabase falliranno con un
// errore di rete (da controllare nei log), non più un crash del build.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

// Usiamo createBrowserClient (da @supabase/ssr) invece del client "semplice":
// salva la sessione nei cookie anziché in localStorage, così il middleware
// (che legge i cookie lato server) vede correttamente l'utente loggato dopo
// il login via email o Google. Con il client semplice la sessione restava
// invisibile al middleware e si veniva rimbalzati di nuovo al login.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
