"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AirportGuide from "@/components/AirportGuide";

export default function AirportHubPage() {
  const [airports, setAirports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: flights } = await supabase
        .from("flights")
        .select("departure_iata, arrival_iata")
        .in("status", ["scheduled", "active", "delayed"]);

      const iatas = Array.from(
        new Set((flights || []).flatMap((f) => [f.departure_iata, f.arrival_iata]).filter(Boolean))
      );

      if (iatas.length) {
        const { data } = await supabase.from("airports").select("*").in("iata", iatas);
        setAirports(data || []);
      }
      setLoading(false);
    }
    load();
  }, []);

  return (
    <main className="max-w-2xl mx-auto p-4 pb-24">
      <h1 className="text-xl font-semibold mb-4">Aeroporto</h1>

      {loading && <p className="text-gray-500 text-sm">Caricamento...</p>}

      {!loading && !airports.length && (
        <p className="text-gray-400 text-sm">
          Traccia un volo per vedere qui meteo e trasporti dei tuoi aeroporti.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {airports.map((a) => (
          <AirportGuide key={a.iata} airport={a} label={a.iata} />
        ))}
      </div>
    </main>
  );
}
