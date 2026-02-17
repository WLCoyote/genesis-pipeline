import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// Public webhook for receiving leads from Zapier, Facebook, Google, website forms, etc.
// Secured with LEADS_WEBHOOK_SECRET API key passed as Bearer token or query param.
//
// Usage:
//   POST /api/leads/inbound
//   Authorization: Bearer <LEADS_WEBHOOK_SECRET>
//   Content-Type: application/json
//
//   {
//     "first_name": "Jane",
//     "last_name": "Doe",
//     "email": "jane@example.com",
//     "phone": "4255551234",
//     "address": "123 Main St",
//     "city": "Monroe",
//     "state": "WA",
//     "zip": "98272",
//     "lead_source": "facebook",
//     "notes": "Interested in AC replacement"
//   }
//
// All fields except first_name are optional.
// Returns: { success: true, lead_id: "..." }

function normalizePhone(phone: string | undefined | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return phone;
}

export async function POST(request: NextRequest) {
  // Verify API key — accept as Bearer token or ?key= query param
  const secret = process.env.LEADS_WEBHOOK_SECRET;
  if (!secret) {
    console.error("LEADS_WEBHOOK_SECRET not configured");
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization");
  const queryKey = request.nextUrl.searchParams.get("key");
  const providedKey =
    authHeader?.replace("Bearer ", "") || queryKey;

  if (providedKey !== secret) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  // Extract and normalize fields — flexible to handle different source formats
  const firstName =
    body.first_name ||
    body.firstName ||
    body.name?.split(" ")[0] ||
    body.full_name?.split(" ")[0] ||
    "";
  const lastName =
    body.last_name ||
    body.lastName ||
    body.name?.split(" ").slice(1).join(" ") ||
    body.full_name?.split(" ").slice(1).join(" ") ||
    "";

  if (!firstName.trim()) {
    return NextResponse.json(
      { error: "first_name (or name) is required" },
      { status: 400 }
    );
  }

  const email = body.email || body.email_address || null;
  const phone = normalizePhone(
    body.phone || body.phone_number || body.mobile || body.mobile_number
  );
  const address = body.address || body.street || body.street_address || null;
  const city = body.city || null;
  const state = body.state || "WA";
  const zip = body.zip || body.zip_code || body.postal_code || null;
  const leadSource =
    body.lead_source || body.source || body.utm_source || null;
  const notes = body.notes || body.message || body.comments || null;

  const supabase = createServiceClient();

  // Check for duplicate by email (skip if lead with same email exists and isn't moved)
  if (email) {
    const { data: existing } = await supabase
      .from("leads")
      .select("id")
      .eq("email", email)
      .neq("status", "moved_to_hcp")
      .limit(1)
      .single();

    if (existing) {
      return NextResponse.json({
        success: true,
        lead_id: existing.id,
        duplicate: true,
        message: "Lead with this email already exists",
      });
    }
  }

  // Create the lead
  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email,
      phone,
      address,
      city,
      state,
      zip,
      lead_source: leadSource,
      notes,
      status: "new",
    })
    .select("id")
    .single();

  if (error) {
    console.error("Lead creation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Notify all admins + CSRs about the new lead
  const { data: staffUsers } = await supabase
    .from("users")
    .select("id")
    .in("role", ["admin", "csr"])
    .eq("is_active", true);

  if (staffUsers && staffUsers.length > 0) {
    const notifications = staffUsers.map((u) => ({
      user_id: u.id,
      type: "lead_assigned" as const,
      message: `New lead: ${firstName} ${lastName}${leadSource ? ` via ${leadSource}` : ""}`,
    }));

    await supabase.from("notifications").insert(notifications);
  }

  return NextResponse.json({ success: true, lead_id: lead.id });
}
