"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabaseClient";
import { searchCity } from "@/lib/geocoding";

const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), { ssr: false });

export default function MyMapPage() {
  const [places, setPlaces] = useState([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);

  async function loadPlaces() {
    const { data } = await supabase
      .from("visited_places")
      .select("*")
      .order("visited_on", { ascending: false });
    setPlaces(data || []);
  }

  useEffect(() => {
    loadPlaces();
  }, []);

  async function handleSearch(e) {
    e.preventDefault();
    setSearching(true);
    setResults(await searchCity(query));
    setSearching(false);
  }

  async function handleAddPlace(result) {
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("visited_places").insert({
      user_id: user.id,
      city: result.city,
      country: result.country,
      latitude: result.latitude,
      longitude: result.longitude,
      visited_on: new Date().toISOString().slice(0, 10),
      source: "manual",
    });

    if (error) {
      setError("Errore nell'aggiungere il luogo (forse è già presente).");
    } else {
      setQuery("");
      setResults([]);
      await loadPlaces();
    }
  }

  async function handleRemove(id) {
    await supabase.from("visited_places").delete().eq("id", id);
    await loadPlaces();
  }

  const countries = new Set(places.map((p) => p.country).filter(Boolean));
  const center = places.length
    ? [places[0].latitude, places[0].longitude]
    : [45, 10];

  return (
    <main className="max-w-3xl mx-auto p-6 pb-24">
      <h1 className="text-2xl font-semibold mb-1">La mia mappa</h1>
      <p className="text-sm text-gray-400 mb-4">
        {places.length} luoghi visitati · {countries.size} paesi
      </p>

      <form onSubmit={handleSearch} className="flex gap-2 mb-3">
        <input
          type="text"
          placeholder="Aggiungi un luogo visitato (es. Lisbona)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border border-base-700 bg-base-900 rounded px-3 py-2 flex-1 text-sm placeholder-gray-500"
        />
        <button type="submit" disabled={searching} className="border border-base-700 rounded px-3 py-2 text-sm">
          {searching ? "Cerco..." : "Cerca"}
        </button>
      </form>

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      {results.length > 0 && (
        <div className="border border-base-700 bg-base-900 rounded-xl mb-4 divide-y divide-base-700">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => handleAddPlace(r)}
              className="w-full text-left p-3 text-sm hover:bg-base-800"
            >
              {r.city}{r.country ? `, ${r.country}` : ""}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-xl overflow-hidden border border-base-700 mb-4">
        <MapContainer center={center} zoom={3} style={{ height: 400, width: "100%" }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          {places.map((p) => (
            <Marker key={p.id} position={[p.latitude, p.longitude]}>
              <Popup>
                <strong>{p.city}</strong>
                {p.country ? `, ${p.country}` : ""}
                <br />
                {p.visited_on}
                {p.source === "flight" ? " · da un volo tracciato" : " · aggiunto a mano"}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div className="flex flex-col gap-2">
        {places.map((p) => (
          <div key={p.id} className="border border-base-700 bg-base-900 rounded-xl p-3 flex items-center justify-between text-sm">
            <div>
              <p className="font-medium">
                {p.city}{p.country ? `, ${p.country}` : ""}
              </p>
              <p className="text-gray-500 text-xs">
                {p.visited_on} · {p.source === "flight" ? "da un volo tracciato" : "aggiunto a mano"}
              </p>
            </div>
            <button onClick={() => handleRemove(p.id)} className="text-red-400 underline text-xs">
              Rimuovi
            </button>
          </div>
        ))}
        {!places.length && (
          <p className="text-gray-400 text-sm">
            Nessun luogo ancora. Traccia un volo fino a destinazione o aggiungine uno a mano qui sopra.
          </p>
        )}
      </div>
    </main>
  );
}
