"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { enablePushNotifications } from "@/lib/pushClient";

export default function LiveNotificationToggle({ flightId, initialEnabled }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleToggle() {
    setLoading(true);
    setError(null);
    const nextValue = !enabled;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (nextValue) {
        // Prima attivazione: chiede permesso e registra il dispositivo
        const subscription = await enablePushNotifications();
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ subscription }),
        });
      }

      await fetch(`/api/flights/${flightId}/live`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ enabled: nextValue }),
      });

      setEnabled(nextValue);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`text-sm px-3 py-1 rounded-full border ${
          enabled ? "bg-black text-white" : ""
        }`}
      >
        {loading ? "..." : enabled ? "Banner live attivo" : "Attiva banner live"}
      </button>
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  );
}
