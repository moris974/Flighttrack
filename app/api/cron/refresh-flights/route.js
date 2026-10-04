import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { searchFlightByNumber } from "@/lib/flightProvider";
import { sendPush } from "@/lib/webpush";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function formatCountdown(scheduledIso) {
  if (!scheduledIso) return null;
  const diffMs = new Date(scheduledIso).getTime() - Date.now();
  if (diffMs <= 0) return null;
  const totalMinutes = Math.round(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
}

async function notifyLiveFlight(supabase, flight) {
  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", flight.user_id);

  if (!subscriptions?.length) return;

  const countdown = formatCountdown(flight.estimated_departure || flight.scheduled_departure);
  const delayText = flight.delay_minutes > 0 ? ` · ritardo ${flight.delay_minutes} min` : "";
  const label = `${flight.airline_iata || ""}${flight.flight_number}`;

  const body = countdown
    ? `Partenza tra ${countdown}${delayText} · Gate ${flight.departure_gate || "da confermare"}`
    : `Stato: ${flight.status}${delayText}`;

  const payload = {
    title: `Volo ${label}`,
    body,
    tag: `flight-${flight.id}`, // stesso tag = aggiorna il banner invece di accumulare notifiche
    url: `/flights/${flight.id}`,
  };

  for (const sub of subscriptions) {
    const result = await sendPush(sub, payload);
    if (result.expired) {
      await supabase.from("push_subscriptions").delete().eq("id", sub.id);
    }
  }
}

// Chiamato da un cron esterno (es. Vercel Cron) ogni 10-15 minuti.
// Protetto da un secret condiviso, non da sessione utente.
export async function GET(request) {
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const supabase = getServiceClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: flights, error } = await supabase
    .from("flights")
    .select("id, user_id, flight_number, airline_iata, flight_date, status, live_notifications")
    .gte("flight_date", today)
    .not("status", "in", "(landed,cancelled,diverted)");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let updated = 0;
  let failed = 0;
  let notified = 0;

  for (const flight of flights || []) {
    try {
      const [fresh] = await searchFlightByNumber(flight.flight_number, flight.flight_date);
      if (!fresh) continue;

      // Il trigger flights_notify_change genera la notifica se status/gate cambiano
      const { data: updatedFlight } = await supabase
        .from("flights")
        .update({
          status: fresh.status,
          delay_minutes: fresh.delay_minutes ?? 0,
          estimated_departure: fresh.estimated_departure,
          estimated_arrival: fresh.estimated_arrival,
          actual_departure: fresh.actual_departure,
          actual_arrival: fresh.actual_arrival,
          departure_gate: fresh.departure_gate,
          departure_terminal: fresh.departure_terminal,
          arrival_gate: fresh.arrival_gate,
          arrival_terminal: fresh.arrival_terminal,
        })
        .eq("id", flight.id)
        .select()
        .single();

      updated++;

      if (flight.live_notifications && updatedFlight) {
        await notifyLiveFlight(supabase, updatedFlight);
        notified++;
      }
    } catch (err) {
      failed++;
    }
  }

  return NextResponse.json({ checked: flights?.length || 0, updated, failed, notified });
}
