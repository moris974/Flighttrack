"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);

  async function load() {
    const { data } = await supabase
      .from("flight_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);
    setNotifications(data || []);
  }

  useEffect(() => {
    load();

    // Aggiorna in tempo reale quando arrivano nuove notifiche
    const channel = supabase
      .channel("flight_notifications_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "flight_notifications" },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function handleOpen() {
    setOpen(!open);
    if (!open && unreadCount > 0) {
      const ids = notifications.filter((n) => !n.read).map((n) => n.id);
      await supabase.from("flight_notifications").update({ read: true }).in("id", ids);
      load();
    }
  }

  return (
    <div className="relative">
      <button onClick={handleOpen} className="relative text-gray-500">
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-white border rounded-xl shadow-lg z-10 max-h-96 overflow-y-auto">
          {!notifications.length && (
            <p className="p-4 text-sm text-gray-500">Nessuna notifica.</p>
          )}
          {notifications.map((n) => (
            <Link
              key={n.id}
              href={`/flights/${n.flight_id}`}
              className="block p-3 border-b text-sm hover:bg-gray-50"
              onClick={() => setOpen(false)}
            >
              {n.message}
              <div className="text-xs text-gray-400 mt-1">
                {new Date(n.created_at).toLocaleString("it-IT")}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
