"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import ItineraryGroup from "@/components/ItineraryGroup";
import FlightCard from "@/components/FlightCard";

export default function HomePage() {
  const [flightNumber, setFlightNumber] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [flights, setFlights] = useState([]);
  const [itineraries, setItineraries] = useState([]);
  const [selectedItinerary, setSelectedItinerary] = useState(""); // "" = nessun itinerario
  const [newItineraryLabel, setNewItineraryLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function loadData() {
    const [{ data: f }, { data: it }] = await Promise.all([
      supabase.from("flights").select("*").order("scheduled_departure", { ascending: true }),
      supabase.from("itineraries").select("*").order("created_at", { ascending: false }),
    ]);
    setFlights(f || []);
    setItineraries(it || []);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function getAuthHeader() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return null;
    return { Authorization: `Bearer ${session.access_token}` };
  }

  async function handleCreateItinerary(e) {
    e.preventDefault();
    const authHeader = await getAuthHeader();
    if (!authHeader) {
      setError("Devi accedere per creare un itinerario.");
      return;
    }

    const res = await fetch("/api/itineraries", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader },
      body: JSON.stringify({ label: newItineraryLabel || "Nuovo viaggio" }),
    });
    const body = await res.json();

    if (res.ok) {
      setNewItineraryLabel("");
      await loadData();
      setSelectedItinerary(body.itinerary.id);
    } else {
      setError(body.error || "Errore nella creazione dell'itinerario");
    }
  }

  async function handleSearch(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const authHeader = await getAuthHeader();
    if (!authHeader) {
      setError("Devi accedere per tracciare un volo.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/flights/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader },
      body: JSON.stringify({
        flightNumber,
        date,
        itineraryId: selectedItinerary || null,
      }),
    });

    const body = await res.json();

    if (!res.ok) {
      setError(body.error || "Errore durante la ricerca del volo");
    } else {
      await loadData();
      setFlightNumber("");
    }

    setLoading(false);
  }

  const flightsWithoutItinerary = flights.filter((f) => !f.itinerary_id);
  const itinerariesWithFlights = itineraries
    .map((it) => ({
      itinerary: it,
      flights: flights.filter((f) => f.itinerary_id === it.id),
    }))
    .filter((group) => group.flights.length > 0);

  return (
    <main className="max-w-2xl mx-auto p-6 pb-24">
      <h1 className="text-2xl font-semibold mb-4">I miei voli</h1>

      <form onSubmit={handleCreateItinerary} className="flex gap-2 mb-3">
        <input
          type="text"
          placeholder="Nome nuovo viaggio (es. Roma - agosto)"
          value={newItineraryLabel}
          onChange={(e) => setNewItineraryLabel(e.target.value)}
          className="border border-base-700 bg-base-900 rounded px-3 py-2 flex-1 text-sm placeholder-gray-500"
        />
        <button type="submit" className="border border-base-700 bg-base-900 rounded px-3 py-2 text-sm">
          + Nuovo viaggio
        </button>
      </form>

      <form onSubmit={handleSearch} className="flex flex-wrap gap-2 mb-6">
        <input
          type="text"
          placeholder="Numero volo (es. FR1234)"
          value={flightNumber}
          onChange={(e) => setFlightNumber(e.target.value)}
          className="border border-base-700 bg-base-900 rounded px-3 py-2 flex-1 placeholder-gray-500"
          required
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border border-base-700 bg-base-900 rounded px-3 py-2"
          required
        />
        <select
          value={selectedItinerary}
          onChange={(e) => setSelectedItinerary(e.target.value)}
          className="border border-base-700 bg-base-900 rounded px-3 py-2"
        >
          <option value="">Nessun viaggio</option>
          {itineraries.map((it) => (
            <option key={it.id} value={it.id}>
              {it.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={loading}
          className="bg-accent-teal text-base-950 font-medium rounded px-4 py-2 disabled:opacity-50"
        >
          {loading ? "Cerco..." : "Traccia"}
        </button>
      </form>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {itinerariesWithFlights.map(({ itinerary, flights }) => (
        <ItineraryGroup key={itinerary.id} itinerary={itinerary} flights={flights} />
      ))}

      {flightsWithoutItinerary.length > 0 && (
        <div>
          {itinerariesWithFlights.length > 0 && (
            <h2 className="text-sm font-semibold text-gray-500 mb-2">
              Voli singoli
            </h2>
          )}
          <div className="flex flex-col gap-3">
            {flightsWithoutItinerary.map((f) => (
              <FlightCard key={f.id} flight={f} />
            ))}
          </div>
        </div>
      )}

      {!flights.length && (
        <p className="text-gray-500">Nessun volo tracciato ancora.</p>
      )}
    </main>
  );
}
