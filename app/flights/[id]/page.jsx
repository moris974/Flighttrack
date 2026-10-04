"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AirportGuide from "@/components/AirportGuide";
import ShareFlightButton from "@/components/ShareFlightButton";
import LiveFlightMap from "@/components/LiveFlightMap";
import LiveNotificationToggle from "@/components/LiveNotificationToggle";

const STATUS_LABELS = {
  scheduled: "Programmato",
  active: "In volo",
  landed: "Atterrato",
  delayed: "In ritardo",
  cancelled: "Cancellato",
  diverted: "Dirottato",
};

function formatDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function FlightDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [flight, setFlight] = useState(null);
  const [departureAirport, setDepartureAirport] = useState(null);
  const [arrivalAirport, setArrivalAirport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      const { data: f, error: flightError } = await supabase
        .from("flights")
        .select("*")
        .eq("id", id)
        .single();

      if (flightError || !f) {
        setError("Volo non trovato.");
        setLoading(false);
        return;
      }
      setFlight(f);

      const iatas = [f.departure_iata, f.arrival_iata].filter(Boolean);
      if (iatas.length) {
        const { data: airports } = await supabase
          .from("airports")
          .select("*")
          .in("iata", iatas);

        setDepartureAirport(
          airports?.find((a) => a.iata === f.departure_iata) || null
        );
        setArrivalAirport(
          airports?.find((a) => a.iata === f.arrival_iata) || null
        );
      }

      setLoading(false);
    }

    load();
  }, [id]);

  async function handleDelete() {
    if (!confirm("Rimuovere questo volo dalla lista?")) return;
    await supabase.from("flights").delete().eq("id", id);
    router.push("/");
  }

  if (loading) return <main className="p-6">Caricamento...</main>;
  if (error) return <main className="p-6 text-red-400">{error}</main>;

  const hasCoords = departureAirport?.latitude && arrivalAirport?.latitude;

  return (
    <main className="max-w-2xl mx-auto p-6 pb-24">
      <button
        onClick={() => router.push("/")}
        className="text-sm text-gray-400 underline mb-4"
      >
        ← Torna ai voli
      </button>

      <h1 className="text-2xl font-semibold mb-1">
        {flight.airline_iata} {flight.flight_number}
      </h1>
      <p className="text-gray-400 mb-6">{flight.flight_date}</p>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <p className="text-3xl font-semibold">{flight.departure_iata}</p>
          <p className="text-sm text-gray-400">{departureAirport?.city}</p>
          <p className="mt-2 text-sm">
            Previsto: {formatDateTime(flight.scheduled_departure)}
          </p>
          {flight.estimated_departure && (
            <p className="text-sm text-amber-400">
              Stimato: {formatDateTime(flight.estimated_departure)}
            </p>
          )}
          {flight.departure_terminal && (
            <p className="text-sm text-gray-400">
              Terminal {flight.departure_terminal}
              {flight.departure_gate ? ` · Gate ${flight.departure_gate}` : ""}
            </p>
          )}
        </div>

        <div className="text-right">
          <p className="text-3xl font-semibold">{flight.arrival_iata}</p>
          <p className="text-sm text-gray-400">{arrivalAirport?.city}</p>
          <p className="mt-2 text-sm">
            Previsto: {formatDateTime(flight.scheduled_arrival)}
          </p>
          {flight.estimated_arrival && (
            <p className="text-sm text-amber-400">
              Stimato: {formatDateTime(flight.estimated_arrival)}
            </p>
          )}
          {flight.arrival_terminal && (
            <p className="text-sm text-gray-400">
              Terminal {flight.arrival_terminal}
              {flight.arrival_gate ? ` · Gate ${flight.arrival_gate}` : ""}
            </p>
          )}
        </div>
      </div>

      <div className="mb-6">
        <span className="inline-block bg-base-800 rounded-full px-3 py-1 text-sm">
          Stato: {STATUS_LABELS[flight.status] || flight.status}
        </span>
        {flight.delay_minutes > 0 && (
          <span className="inline-block bg-amber-500/20 text-amber-300 rounded-full px-3 py-1 text-sm ml-2">
            Ritardo: {flight.delay_minutes} min
          </span>
        )}
      </div>

      <div className="mb-6">
        <LiveNotificationToggle flightId={flight.id} initialEnabled={flight.live_notifications} />
      </div>

      {flight.status === "active" && flight.aircraft_icao24 ? (
        <div className="mb-6">
          <LiveFlightMap
            icao24={flight.aircraft_icao24}
            departureAirport={departureAirport}
            arrivalAirport={arrivalAirport}
          />
        </div>
      ) : (
        hasCoords && (
          <div className="mb-6 rounded-xl overflow-hidden border border-base-700">
            <iframe
              title="Percorso volo"
              width="100%"
              height="300"
              style={{ border: 0 }}
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${Math.min(
                departureAirport.longitude,
                arrivalAirport.longitude
              ) - 2}%2C${Math.min(
                departureAirport.latitude,
                arrivalAirport.latitude
              ) - 2}%2C${Math.max(
                departureAirport.longitude,
                arrivalAirport.longitude
              ) + 2}%2C${Math.max(
                departureAirport.latitude,
                arrivalAirport.latitude
              ) + 2}&layer=mapnik`}
            />
          </div>
        )
      )}

      <div className="grid gap-3 mb-6">
        <AirportGuide airport={departureAirport} label="Partenza" />
        <AirportGuide airport={arrivalAirport} label="Arrivo" />
      </div>

      {(flight.aircraft_type || flight.registration) && (
        <div className="mb-6 text-sm text-gray-400">
          <p>Aeromobile: {flight.aircraft_type || "—"}</p>
          <p>Registrazione: {flight.registration || "—"}</p>
        </div>
      )}

      {(flight.booking_reference || flight.seat) && (
        <div className="mb-6 text-sm text-gray-400">
          {flight.booking_reference && (
            <p>Codice prenotazione: {flight.booking_reference}</p>
          )}
          {flight.seat && <p>Posto: {flight.seat}</p>}
        </div>
      )}

      <div className="flex items-center justify-between">
        <ShareFlightButton flightId={flight.id} />
        <button onClick={handleDelete} className="text-red-400 text-sm underline">
          Rimuovi volo
        </button>
      </div>
    </main>
  );
}
