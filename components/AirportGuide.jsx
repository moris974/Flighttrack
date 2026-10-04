"use client";

import { useEffect, useState } from "react";
import { getAirportWeather, describeWeatherCode, getTransportLinks } from "@/lib/airportGuide";

export default function AirportGuide({ airport, label }) {
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    if (!airport?.latitude) return;
    getAirportWeather(airport.latitude, airport.longitude).then(setWeather);
  }, [airport]);

  if (!airport) return null;

  const links = getTransportLinks(airport);

  return (
    <div className="border border-base-700 bg-base-900 rounded-xl p-4 text-sm">
      <p className="font-medium mb-2">
        {label} — {airport.name || airport.iata}
      </p>

      {weather && (
        <p className="text-gray-400 mb-2">
          {Math.round(weather.temperatureC)}°C, {describeWeatherCode(weather.weatherCode)}
          {weather.windKmh ? ` · vento ${Math.round(weather.windKmh)} km/h` : ""}
        </p>
      )}

      {links && (
        <div className="flex gap-3 text-accent-teal underline">
          <a href={links.directions} target="_blank" rel="noreferrer">
            Come arrivare
          </a>
          <a href={links.taxi} target="_blank" rel="noreferrer">
            Taxi
          </a>
          <a href={links.parking} target="_blank" rel="noreferrer">
            Parcheggi
          </a>
        </div>
      )}
    </div>
  );
}
