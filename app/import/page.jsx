"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function ImportReviewPage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);

  async function load() {
    const { data } = await supabase
      .from("import_candidates")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    setCandidates(data || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleConfirm(candidate) {
    setBusyId(candidate.id);
    setError(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const res = await fetch("/api/flights/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        flightNumber: candidate.flight_number,
        date: candidate.flight_date,
      }),
    });
    const body = await res.json();

    if (!res.ok) {
      setError(body.error || "Errore nel tracciare il volo");
      setBusyId(null);
      return;
    }

    await supabase
      .from("import_candidates")
      .update({ status: "confirmed" })
      .eq("id", candidate.id);

    setBusyId(null);
    await load();
    router.push(`/flights/${body.flight.id}`);
  }

  async function handleDismiss(id) {
    await supabase.from("import_candidates").update({ status: "dismissed" }).eq("id", id);
    await load();
  }

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Voli da confermare</h1>
      <p className="text-sm text-gray-500 mb-6">
        Voli individuati automaticamente nelle email che hai inoltrato. Controlla e conferma
        prima che vengano aggiunti ai tuoi voli tracciati.
      </p>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {!candidates.length && (
        <p className="text-gray-500">Nessun volo in attesa di conferma.</p>
      )}

      <div className="flex flex-col gap-3">
        {candidates.map((c) => (
          <div key={c.id} className="border rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">
                {c.flight_number || "Numero volo non riconosciuto"}
              </p>
              <p className="text-sm text-gray-500">
                {c.flight_date || "Data non riconosciuta"}
              </p>
              {c.source_subject && (
                <p className="text-xs text-gray-400 mt-1">
                  Da: {c.source_subject}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleDismiss(c.id)}
                className="text-sm text-gray-500 underline"
              >
                Ignora
              </button>
              <button
                onClick={() => handleConfirm(c)}
                disabled={busyId === c.id || !c.flight_date}
                className="bg-black text-white rounded px-3 py-1 text-sm disabled:opacity-50"
              >
                {busyId === c.id ? "..." : "Conferma"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
