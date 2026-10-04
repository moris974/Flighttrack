import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function POST(request) {
  const { label } = await request.json();

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

  const { data: itinerary, error } = await supabase
    .from("itineraries")
    .insert({ user_id: user.id, label: label || "Nuovo viaggio" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ itinerary });
}
