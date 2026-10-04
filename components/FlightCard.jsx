import Link from "next/link";

const STATUS_LABELS = {
  scheduled: "Programmato",
  active: "In volo",
  landed: "Atterrato",
  delayed: "In ritardo",
  cancelled: "Cancellato",
  diverted: "Dirottato",
};

const STATUS_COLORS = {
  scheduled: "bg-base-800 text-gray-300",
  active: "bg-blue-500/20 text-blue-300",
  landed: "bg-green-500/20 text-green-300",
  delayed: "bg-amber-500/20 text-amber-300",
  cancelled: "bg-red-500/20 text-red-300",
  diverted: "bg-purple-500/20 text-purple-300",
};

function formatTime(iso) {
  if (!iso) return "--:--";
  return new Date(iso).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function FlightCard({ flight }) {
  const statusLabel = STATUS_LABELS[flight.status] || flight.status;
  const statusColor = STATUS_COLORS[flight.status] || "bg-base-800 text-gray-300";

  return (
    <Link
      href={`/flights/${flight.id}`}
      className="border border-base-700 bg-base-900 rounded-xl p-4 flex items-center justify-between hover:bg-base-800"
    >
      <div>
        <div className="font-medium">
          {flight.airline_iata} {flight.flight_number} · {flight.flight_date}
        </div>
        <div className="text-sm text-gray-400">
          {flight.departure_iata} {formatTime(flight.scheduled_departure)} →{" "}
          {flight.arrival_iata} {formatTime(flight.scheduled_arrival)}
        </div>
        {flight.departure_gate && (
          <div className="text-xs text-gray-500">
            Gate {flight.departure_gate}
            {flight.departure_terminal ? ` · Terminal ${flight.departure_terminal}` : ""}
          </div>
        )}
      </div>

      <span className={`text-xs px-2 py-1 rounded-full ${statusColor}`}>
        {statusLabel}
      </span>
    </Link>
  );
}
