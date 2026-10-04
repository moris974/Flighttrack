"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const STATUS_LABELS = {
  scheduled: "Programmato",
  active: "In volo",
  landed: "Atterrato",
  delayed: "In ritardo",
  cancelled: "Cancellato",
  diverted: "Dirottato",
};

function formatTime(iso) {
  if (!iso) return "--:--";
  return new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

export default function PublicSharePage() {
  const { token } = useParams();
  const [flight, setFlight] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("flights")
        .select(
          "flight_number, airline_iata, flight_date, departure_iata, arrival_iata, scheduled_departure, scheduled_arrival, estimated_departure, estimated_arrival, status, departure_gate, departure_terminal"
        )
        .eq("share_token", token)
        .single();

      if (error || !data) {
        setError("Link non valido o volo non trovato.");
        return;
      }
      setFlight(data);
    }
    load();
  }, [token]);

  if (error) return <main className="p-6 text-red-600">{error}</main>;
  if (!flight) return <main className="p-6">Caricamento...</main>;

  return (
    <main className="max-w-md mx-auto p-6">
      <p className="text-sm text-gray-400 mb-2">Stato volo condiviso</p>
      <h1 className="text-2xl font-semibold mb-1">
        {flight.airline_iata} {flight.flight_number}
      </h1>
      <p className="text-gray-500 mb-6">{flight.flight_date}</p>

      <div className="flex justify-between mb-4">
        <div>
          <p className="text-3xl font-semibold">{flight.departure_iata}</p>
          <p className="text-sm">{formatTime(flight.scheduled_departure)}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-semibold">{flight.arrival_iata}</p>
          <p className="text-sm">{formatTime(flight.scheduled_arrival)}</p>
        </div>
      </div>

      {flight.departure_gate && (
        <p className="text-sm text-gray-500 mb-2">
          Gate {flight.departure_gate}
          {flight.departure_terminal ? ` · Terminal ${flight.departure_terminal}` : ""}
        </p>
      )}

      <span className="inline-block bg-gray-100 rounded-full px-3 py-1 text-sm">
        {STATUS_LABELS[flight.status] || flight.status}
      </span>
    </main>
  );
}
