import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parseBookingEmail } from "@/lib/emailParser";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Estrae lo slug utente dall'indirizzo destinatario, es.
// "import+ab12cd34ef@mail.tuodominio.com" -> "ab12cd34ef"
function extractSlug(toAddress) {
  const match = toAddress.match(/import\+([a-z0-9]+)@/i);
  return match ? match[1] : null;
}

export async function POST(request) {
  // Protezione minima: il provider inbound (Mailgun/Postmark/SendGrid)
  // deve mandare un secret concordato in query string o header.
  const secret = request.headers.get("x-import-secret");
  if (secret !== process.env.EMAIL_IMPORT_SECRET) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const payload = await request.json();
  // Formato atteso, adattabile al provider scelto:
  // { to: "...", subject: "...", text: "..." }
  const { to, subject, text } = payload;

  const slug = extractSlug(to || "");
  if (!slug) {
    return NextResponse.json({ error: "Destinatario non riconosciuto" }, { status: 400 });
  }

  const supabase = getServiceClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("import_email_slug", slug)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
  }

  const { flightNumbers, dates, bestGuess } = parseBookingEmail({
    subject: subject || "",
    text: text || "",
  });

  if (!flightNumbers.length) {
    return NextResponse.json({ message: "Nessun volo riconosciuto nell'email" });
  }

  // Salviamo il miglior candidato individuato; l'utente lo conferma
  // manualmente da /import prima che diventi un volo tracciato.
  const candidate = bestGuess || {
    flightNumber: flightNumbers[0],
    date: dates[0] || null,
  };

  const { error: insertError } = await supabase.from("import_candidates").insert({
    user_id: profile.id,
    flight_number: candidate.flightNumber,
    flight_date: candidate.date,
    source_subject: subject || null,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Candidato di import creato" });
}
