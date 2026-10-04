import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function POST(request, { params }) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const supabase = getServiceClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json({ error: "Token non valido" }, { status: 401 });
  }

  const { enabled } = await request.json();

  const { data: flight, error: fetchError } = await supabase
    .from("flights")
    .select("id, user_id")
    .eq("id", params.id)
    .single();

  if (fetchError || !flight || flight.user_id !== user.id) {
    return NextResponse.json({ error: "Volo non trovato" }, { status: 404 });
  }

  const { error } = await supabase
    .from("flights")
    .update({ live_notifications: !!enabled })
    .eq("id", flight.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, enabled: !!enabled });
}
