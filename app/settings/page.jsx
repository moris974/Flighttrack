"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// Dominio su cui è configurato il servizio di posta in ingresso
// (Mailgun/Postmark/SendGrid Inbound Parse) collegato al webhook
// /api/import/email.
const IMPORT_DOMAIN = "mail.flighttrackapp.example";

export default function SettingsPage() {
  const [slug, setSlug] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("import_email_slug")
        .eq("id", user.id)
        .single();

      setSlug(data?.import_email_slug || null);
    }
    load();
  }, []);

  const importEmail = slug ? `import+${slug}@${IMPORT_DOMAIN}` : null;

  function handleCopy() {
    if (!importEmail) return;
    navigator.clipboard.writeText(importEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Impostazioni</h1>

      <section className="border rounded-xl p-4">
        <h2 className="font-medium mb-2">Import automatico via email</h2>
        <p className="text-sm text-gray-500 mb-3">
          Inoltra le email di conferma prenotazione a questo indirizzo: verranno riconosciute
          automaticamente e ti compariranno in{" "}
          <a href="/import" className="underline">
            Voli da confermare
          </a>{" "}
          prima di essere aggiunte.
        </p>

        {importEmail ? (
          <div className="flex items-center gap-2">
            <code className="bg-gray-100 rounded px-3 py-2 text-sm flex-1">
              {importEmail}
            </code>
            <button onClick={handleCopy} className="border rounded px-3 py-2 text-sm">
              {copied ? "Copiato!" : "Copia"}
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-400">Caricamento...</p>
        )}
      </section>
    </main>
  );
}
