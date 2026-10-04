import FlightCard from "@/components/FlightCard";

export default function ItineraryGroup({ itinerary, flights }) {
  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-gray-400 mb-2">
        {itinerary.label}
      </h2>
      <div className="flex flex-col gap-3">
        {flights.map((f) => (
          <FlightCard key={f.id} flight={f} />
        ))}
      </div>
    </div>
  );
}
