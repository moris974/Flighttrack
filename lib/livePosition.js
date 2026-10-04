// lib/livePosition.js
// Posizione ADS-B in tempo reale via OpenSky Network (API pubblica,
// nessuna chiave richiesta per un uso leggero come questo).

export async function getLivePosition(icao24) {
  if (!icao24) return null;

  const url = `https://opensky-network.org/api/states/all?icao24=${icao24.toLowerCase()}`;
  const res = await fetch(url, { next: { revalidate: 20 } });
  if (!res.ok) return null;

  const data = await res.json();
  const state = data.states?.[0];
  if (!state) return null;

  // Formato array documentato da OpenSky: vedi indici sotto
  const [
    ,            // 0 icao24
    callsign,    // 1
    ,            // 2 origin_country
    ,            // 3 time_position
    ,            // 4 last_contact
    longitude,   // 5
    latitude,    // 6
    baroAltitude,// 7
    onGround,    // 8
    velocity,    // 9
    trueTrack,   // 10 direzione in gradi (0 = nord)
  ] = state;

  if (latitude == null || longitude == null) return null;

  return {
    latitude,
    longitude,
    altitudeM: baroAltitude,
    speedMs: velocity,
    headingDeg: trueTrack,
    onGround: Boolean(onGround),
    callsign: callsign?.trim() || null,
  };
}
