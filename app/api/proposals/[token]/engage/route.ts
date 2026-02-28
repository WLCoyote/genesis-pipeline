import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

const VALID_EVENTS = new Set([
  "page_open",
  "option_view",
  "calculator_open",
  "plan_selected",
  "addon_checked",
  "addon_unchecked",
  "signature_started",
  "signed",
]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const supabase = createServiceClient();

  // Validate token → get estimate_id
  const { data: estimate, error: estError } = await supabase
    .from("estimates")
    .select("id")
    .eq("proposal_token", token)
    .single();

  if (estError || !estimate) {
    return NextResponse.json({ error: "Invalid proposal token" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const eventType = body.event_type as string;
  if (!eventType || !VALID_EVENTS.has(eventType)) {
    return NextResponse.json(
      { error: `Invalid event_type. Must be one of: ${[...VALID_EVENTS].join(", ")}` },
      { status: 400 }
    );
  }

  // Detect device type from user agent
  const ua = request.headers.get("user-agent") || "";
  let deviceType = "desktop";
  if (/mobile|android|iphone|ipad/i.test(ua)) {
    deviceType = /ipad|tablet/i.test(ua) ? "tablet" : "mobile";
  }

  const { error: insertError } = await supabase
    .from("proposal_engagement")
    .insert({
      estimate_id: estimate.id,
      event_type: eventType,
      option_group: typeof body.option_group === "number" ? body.option_group : null,
      financing_plan: typeof body.financing_plan === "string" ? body.financing_plan : null,
      session_seconds: typeof body.session_seconds === "number" ? body.session_seconds : null,
      device_type: deviceType,
    });

  if (insertError) {
    console.error("Failed to insert engagement event:", insertError);
    return NextResponse.json({ error: "Failed to record event" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
