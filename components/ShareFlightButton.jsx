"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ShareFlightButton({ flightId }) {
  const [shareUrl, setShareUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    if (shareUrl) return;
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const res = await fetch(`/api/flights/${flightId}/share`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const body = await res.json();
    setLoading(false);

    if (res.ok) {
      setShareUrl(`${window.location.origin}/share/${body.shareToken}`);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!shareUrl) {
    return (
      <button onClick={handleShare} disabled={loading} className="text-sm underline">
        {loading ? "Genero link..." : "Condividi volo"}
      </button>
    );
  }

  const encodedUrl = encodeURIComponent(shareUrl);

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <code className="bg-gray-100 rounded px-2 py-1">{shareUrl}</code>
      <button onClick={handleCopy} className="underline">
        {copied ? "Copiato!" : "Copia"}
      </button>
      <a
        href={`https://wa.me/?text=${encodedUrl}`}
        target="_blank"
        rel="noreferrer"
        className="underline"
      >
        WhatsApp
      </a>
      <a
        href={`https://t.me/share/url?url=${encodedUrl}`}
        target="_blank"
        rel="noreferrer"
        className="underline"
      >
        Telegram
      </a>
    </div>
  );
}
