"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import LiveFlightMap from "@/components/LiveFlightMap";
import { Search } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

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

export default function HomeDashboard() {
  const [nextFlight, setNextFlight] = useState(null);
  const [departureAirport, setDepartureAirport] = useState(null);
  const [arrivalAirport, setArrivalAirport] = useState(null);
  const [stats, setStats] = useState({ total: 0, countries: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const now = new Date().toISOString();

      const { data: flights } = await supabase
        .from("flights")
        .select("*")
        .in("status", ["scheduled", "active", "delayed"])
        .order("scheduled_departure", { ascending: true });

      const upcoming = flights?.[0] || null;
      setNextFlight(upcoming);

      if (upcoming) {
        const iatas = [upcoming.departure_iata, upcoming.arrival_iata].filter(Boolean);
        const { data: airports } = await supabase.from("airports").select("*").in("iata", iatas);
        setDepartureAirport(airports?.find((a) => a.iata === upcoming.departure_iata) || null);
        setArrivalAirport(airports?.find((a) => a.iata === upcoming.arrival_iata) || null);
      }

      const { data: places } = await supabase.from("visited_places").select("country");
      const countries = new Set((places || []).map((p) => p.country).filter(Boolean));
      const { count } = await supabase.from("flights").select("id", { count: "exact", head: true });

      setStats({ total: count || 0, countries: countries.size });
      setLoading(false);
    }
    load();
  }, []);

  return (
    <main className="max-w-2xl mx-auto p-4 pb-24">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <img src="/icon-192.png" alt="SkyTrak" className="w-8 h-8 rounded-lg" />
          <span className="font-semibold text-lg tracking-wide">
            SKY<span className="text-accent-teal">TRAK</span>
          </span>
        </div>
        <div className="flex items-center gap-3 text-gray-400">
          <Link href="/flights"><Search size={20} /></Link>
          <NotificationBell />
        </div>
      </div>

      {loading && <p className="text-gray-500 text-sm">Caricamento...</p>}

      {!loading && !nextFlight && (
        <div className="bg-base-900 border border-base-700 rounded-2xl p-6 text-center">
          <p className="text-gray-400 mb-3">Nessun volo in programma.</p>
          <Link href="/flights" className="text-accent-teal underline text-sm">
            Traccia il tuo prossimo volo
          </Link>
        </div>
      )}

      {nextFlight && (
        <Link href={`/flights/${nextFlight.id}`} className="block mb-5">
          <div className="bg-base-900 border border-base-700 rounded-2xl overflow-hidden">
            {nextFlight.status === "active" && nextFlight.aircraft_icao24 ? (
              <LiveFlightMap
                icao24={nextFlight.aircraft_icao24}
                departureAirport={departureAirport}
                arrivalAirport={arrivalAirport}
              />
            ) : (
              <div className="h-40 bg-gradient-to-br from-base-800 to-base-950 flex items-center justify-center text-gray-500 text-sm">
                In attesa della partenza
              </div>
            )}

            <div className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-semibold">
                    {nextFlight.airline_iata} {nextFlight.flight_number}
                  </p>
                  <p className="text-xs text-gray-400">{nextFlight.flight_date}</p>
                </div>
                <span className="text-xs bg-base-800 px-2 py-1 rounded-full text-accent-teal">
                  {STATUS_LABELS[nextFlight.status] || nextFlight.status}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <div>
                  <p className="text-xl font-semibold">{nextFlight.departure_iata}</p>
                  <p className="text-gray-400">{formatTime(nextFlight.scheduled_departure)}</p>
                </div>
                <div className="flex-1 mx-3 border-t border-dashed border-base-700" />
                <div className="text-right">
                  <p className="text-xl font-semibold">{nextFlight.arrival_iata}</p>
                  <p className="text-gray-400">{formatTime(nextFlight.scheduled_arrival)}</p>
                </div>
              </div>

              {nextFlight.delay_minutes > 0 && (
                <p className="text-amber-400 text-xs mt-2">
                  Ritardo: {nextFlight.delay_minutes} min
                </p>
              )}
            </div>
          </div>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-base-900 border border-base-700 rounded-2xl p-4 text-center">
          <p className="text-2xl font-semibold">{stats.total}</p>
          <p className="text-xs text-gray-400">Voli tracciati</p>
        </div>
        <div className="bg-base-900 border border-base-700 rounded-2xl p-4 text-center">
          <p className="text-2xl font-semibold">{stats.countries}</p>
          <p className="text-xs text-gray-400">Paesi visitati</p>
        </div>
      </div>
    </main>
  );
}
