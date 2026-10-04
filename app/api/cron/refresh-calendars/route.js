import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parseIcsEvents } from "@/lib/icsParser";
import { parseBookingEmail } from "@/lib/emailParser";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Chiamato periodicamente (es. una volta al giorno) da un cron esterno.
export async function GET(request) {
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const supabase = getServiceClient();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, calendar_ics_url")
    .not("calendar_ics_url", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let created = 0;
  let usersChecked = 0;

  for (const profile of profiles || []) {
    usersChecked++;
    try {
      const icsRes = await fetch(profile.calendar_ics_url);
      if (!icsRes.ok) continue;
      const icsText = await icsRes.text();

      const events = parseIcsEvents(icsText);

      for (const event of events) {
        const { bestGuess } = parseBookingEmail({
          subject: event.summary,
          text: event.description,
        });
        if (!bestGuess) continue;

        // Evita duplicati: stesso utente, stesso numero volo, stessa data
        const { data: existing } = await supabase
          .from("import_candidates")
          .select("id")
          .eq("user_id", profile.id)
          .eq("flight_number", bestGuess.flightNumber)
          .eq("flight_date", bestGuess.date)
          .maybeSingle();

        if (existing) continue;

        await supabase.from("import_candidates").insert({
          user_id: profile.id,
          flight_number: bestGuess.flightNumber,
          flight_date: bestGuess.date,
          source_subject: event.summary,
        });
        created++;
      }
    } catch (err) {
      // Un feed calendario non raggiungibile non deve bloccare gli altri utenti
      continue;
    }
  }

  return NextResponse.json({ usersChecked, candidatesCreated: created });
}
