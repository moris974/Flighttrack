"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { getLivePosition } from "@/lib/livePosition";

// react-leaflet non supporta il rendering server-side
const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), { ssr: false });
const Polyline = dynamic(() => import("react-leaflet").then((m) => m.Polyline), { ssr: false });

const REFRESH_MS = 20000;

export default function LiveFlightMap({ icao24, departureAirport, arrivalAirport }) {
  const [position, setPosition] = useState(null);
  const [L, setL] = useState(null);

  // Carica leaflet solo lato client (usa window)
  useEffect(() => {
    import("leaflet").then((mod) => setL(mod.default || mod));
  }, []);

  useEffect(() => {
    if (!icao24) return;

    let cancelled = false;

    async function poll() {
      const pos = await getLivePosition(icao24);
      if (!cancelled) setPosition(pos);
    }

    poll();
    const interval = setInterval(poll, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [icao24]);

  if (!icao24) {
    return (
      <p className="text-sm text-gray-400 border rounded-xl p-4">
        Posizione live non disponibile per questo volo.
      </p>
    );
  }

  if (!position) {
    return (
      <div className="border rounded-xl p-4 text-sm text-gray-400">
        In attesa del segnale ADS-B dell'aereo...
      </div>
    );
  }

  const planeIcon =
    L &&
    L.divIcon({
      html: `<div style="transform: rotate(${position.headingDeg || 0}deg); font-size: 22px; line-height: 1;">✈️</div>`,
      className: "",
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

  const routePoints = [];
  if (departureAirport?.latitude) {
    routePoints.push([departureAirport.latitude, departureAirport.longitude]);
  }
  routePoints.push([position.latitude, position.longitude]);
  if (arrivalAirport?.latitude) {
    routePoints.push([arrivalAirport.latitude, arrivalAirport.longitude]);
  }

  return (
    <div className="rounded-xl overflow-hidden border">
      <MapContainer
        center={[position.latitude, position.longitude]}
        zoom={5}
        style={{ height: 320, width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        {routePoints.length > 1 && (
          <Polyline positions={routePoints} pathOptions={{ color: "#2563eb", dashArray: "4 6" }} />
        )}
        {planeIcon && <Marker position={[position.latitude, position.longitude]} icon={planeIcon} />}
      </MapContainer>

      <div className="p-3 text-xs text-gray-500 flex gap-4">
        {position.altitudeM != null && <span>Quota: {Math.round(position.altitudeM)} m</span>}
        {position.speedMs != null && (
          <span>Velocità: {Math.round(position.speedMs * 3.6)} km/h</span>
        )}
        <span>{position.onGround ? "A terra" : "In volo"}</span>
      </div>
    </div>
  );
}
