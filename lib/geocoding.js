// lib/geocoding.js
// Ricerca città -> coordinate/paese, usata per aggiungere manualmente
// un luogo visitato. Nessuna chiave API richiesta.

export async function searchCity(query) {
  if (!query || query.trim().length < 2) return [];

  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    query
  )}&count=5&language=it`;

  const res = await fetch(url);
  if (!res.ok) return [];

  const data = await res.json();
  return (data.results || []).map((r) => ({
    city: r.name,
    country: r.country,
    latitude: r.latitude,
    longitude: r.longitude,
  }));
}
