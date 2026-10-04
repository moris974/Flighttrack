// lib/airportGuide.js
// Dati "guida aeroportuale": meteo attuale (Open-Meteo, senza chiave API)
// e link utili per i trasporti verso/dall'aeroporto.

export async function getAirportWeather(latitude, longitude) {
  if (!latitude || !longitude) return null;

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m`;

  const res = await fetch(url, { next: { revalidate: 900 } });
  if (!res.ok) return null;

  const data = await res.json();
  return {
    temperatureC: data.current?.temperature_2m ?? null,
    windKmh: data.current?.wind_speed_10m ?? null,
    weatherCode: data.current?.weather_code ?? null,
  };
}

// Mappa semplificata dei weather code Open-Meteo (standard WMO) in descrizioni brevi
const WEATHER_DESCRIPTIONS = {
  0: "Sereno",
  1: "Prevalentemente sereno",
  2: "Parzialmente nuvoloso",
  3: "Nuvoloso",
  45: "Nebbia",
  48: "Nebbia con brina",
  51: "Pioviggine leggera",
  61: "Pioggia leggera",
  63: "Pioggia moderata",
  65: "Pioggia forte",
  71: "Neve leggera",
  75: "Neve forte",
  80: "Rovesci leggeri",
  95: "Temporale",
};

export function describeWeatherCode(code) {
  return WEATHER_DESCRIPTIONS[code] || "—";
}

/**
 * Costruisce link utili per raggiungere/lasciare l'aeroporto:
 * indicazioni stradali e ricerca trasporto pubblico su Google Maps
 * (non richiede chiavi API, apre semplicemente Maps).
 */
export function getTransportLinks(airport) {
  if (!airport?.latitude || !airport?.longitude) return null;
  const coords = `${airport.latitude},${airport.longitude}`;

  return {
    directions: `https://www.google.com/maps/dir/?api=1&destination=${coords}&travelmode=transit`,
    taxi: `https://www.google.com/maps/search/taxi/@${coords},15z`,
    parking: `https://www.google.com/maps/search/parcheggio+aeroporto/@${coords},15z`,
  };
}
