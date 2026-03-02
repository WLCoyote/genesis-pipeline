import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const EVENT_TYPES = [
  "estimate_approved",
  "estimate_declined",
  "lead_assigned",
  "declining_soon",
] as const;

// GET: Fetch notification preferences for all users (admin) or current user
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: dbUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const serviceClient = createServiceClient();

  if (dbUser?.role === "admin") {
    // Admin: get all users + their preferences
    const { data: allUsers } = await serviceClient
      .from("users")
      .select("id, name, email, role")
      .eq("is_active", true)
      .order("name");

    const { data: allPrefs } = await serviceClient
      .from("notification_preferences")
      .select("user_id, event_type, email_enabled");

    return NextResponse.json({
      users: allUsers || [],
      preferences: allPrefs || [],
      event_types: EVENT_TYPES,
    });
  }

  // Non-admin: own preferences only
  const { data: prefs } = await serviceClient
    .from("notification_preferences")
    .select("event_type, email_enabled")
    .eq("user_id", user.id);

  return NextResponse.json({
    preferences: prefs || [],
    event_types: EVENT_TYPES,
  });
}

// PUT: Update notification preferences
export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: dbUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const body = await request.json();
  const { user_id, preferences } = body as {
    user_id?: string;
    preferences: { event_type: string; email_enabled: boolean }[];
  };

  // Non-admin can only update own preferences
  const targetUserId = dbUser?.role === "admin" && user_id ? user_id : user.id;

  const serviceClient = createServiceClient();

  for (const pref of preferences) {
    if (!EVENT_TYPES.includes(pref.event_type as typeof EVENT_TYPES[number])) continue;

    await serviceClient
      .from("notification_preferences")
      .upsert(
        {
          user_id: targetUserId,
          event_type: pref.event_type,
          email_enabled: pref.email_enabled,
        },
        { onConflict: "user_id,event_type" }
      );
  }

  return NextResponse.json({ success: true });
}
