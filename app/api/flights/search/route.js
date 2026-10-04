import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { searchFlightByNumber } from "@/lib/flightProvider";

// Service role: serve per scrivere per conto dell'utente autenticato
// dopo aver verificato il suo JWT.
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function POST(request) {
  const { flightNumber, date, itineraryId } = await request.json();

  if (!flightNumber || !date) {
    return NextResponse.json(
      { error: "flightNumber e date sono obbligatori" },
      { status: 400 }
    );
  }

  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const supabase = getServiceClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json({ error: "Token non valido" }, { status: 401 });
  }

  let results;
  try {
    results = await searchFlightByNumber(flightNumber, date);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }

  if (!results.length) {
    return NextResponse.json(
      { error: "Nessun volo trovato per numero e data indicati" },
      { status: 404 }
    );
  }

  const flightToSave = { ...results[0], user_id: user.id, itinerary_id: itineraryId ?? null };

  const { data: saved, error: insertError } = await supabase
    .from("flights")
    .insert(flightToSave)
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ flight: saved });
}
