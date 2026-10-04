// lib/flightProvider.js
// Livello di astrazione sopra il provider di dati voli.
// Oggi usa AeroDataBox (via RapidAPI); domani si potrà cambiare
// provider modificando solo questo file, senza toccare il resto dell'app.

const AERODATABOX_HOST = "aerodatabox.p.rapidapi.com";
const API_KEY = process.env.AERODATABOX_API_KEY;

async function callAeroDataBox(path) {
  if (!API_KEY) {
    throw new Error(
      "AERODATABOX_API_KEY mancante nelle variabili d'ambiente"
    );
  }

  const res = await fetch(`https://${AERODATABOX_HOST}${path}`, {
    headers: {
      "X-RapidAPI-Key": API_KEY,
      "X-RapidAPI-Host": AERODATABOX_HOST,
    },
    // cache breve: i dati di volo cambiano spesso
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`AeroDataBox error ${res.status}: ${body}`);
  }

  return res.json();
}

/**
 * Cerca un volo per numero + data (es. "FR1234", "2026-09-10").
 * Ritorna un array normalizzato nel formato interno dell'app.
 */
export async function searchFlightByNumber(flightNumber, date) {
  const clean = flightNumber.replace(/\s+/g, "").toUpperCase();
  const data = await callAeroDataBox(
    `/flights/number/${clean}/${date}`
  );

  return (Array.isArray(data) ? data : [data]).map(normalizeFlight);
}

/**
 * Normalizza la risposta del provider nella forma usata
 * dalla tabella public.flights.
 */
function normalizeFlight(raw) {
  return {
    flight_number: raw.number,
    airline_iata: raw.airline?.iata ?? null,
    flight_date: raw.departure?.scheduledTime?.local?.slice(0, 10) ?? null,

    departure_iata: raw.departure?.airport?.iata ?? null,
    arrival_iata: raw.arrival?.airport?.iata ?? null,

    scheduled_departure: raw.departure?.scheduledTime?.utc ?? null,
    scheduled_arrival: raw.arrival?.scheduledTime?.utc ?? null,
    estimated_departure: raw.departure?.predictedTime?.utc ?? null,
    estimated_arrival: raw.arrival?.predictedTime?.utc ?? null,
    actual_departure: raw.departure?.actualTime?.utc ?? null,
    actual_arrival: raw.arrival?.actualTime?.utc ?? null,

    departure_terminal: raw.departure?.terminal ?? null,
    departure_gate: raw.departure?.gate ?? null,
    arrival_terminal: raw.arrival?.terminal ?? null,
    arrival_gate: raw.arrival?.gate ?? null,

    status: mapStatus(raw.status),
    aircraft_type: raw.aircraft?.model ?? null,
    registration: raw.aircraft?.reg ?? null,
    aircraft_icao24: raw.aircraft?.modeS ?? null,

    source: "manual",
    external_ref: raw.number,
  };
}

function mapStatus(providerStatus) {
  const s = (providerStatus || "").toLowerCase();
  if (s.includes("cancel")) return "cancelled";
  if (s.includes("divert")) return "diverted";
  if (s.includes("land")) return "landed";
  if (s.includes("delay")) return "delayed";
  if (s.includes("active") || s.includes("en-route")) return "active";
  return "scheduled";
}
