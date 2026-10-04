import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

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

  const { data: flight, error: fetchError } = await supabase
    .from("flights")
    .select("id, user_id, share_token")
    .eq("id", params.id)
    .single();

  if (fetchError || !flight || flight.user_id !== user.id) {
    return NextResponse.json({ error: "Volo non trovato" }, { status: 404 });
  }

  const shareToken = flight.share_token || randomBytes(8).toString("hex");

  if (!flight.share_token) {
    const { error: updateError } = await supabase
      .from("flights")
      .update({ share_token: shareToken })
      .eq("id", flight.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ shareToken });
}
