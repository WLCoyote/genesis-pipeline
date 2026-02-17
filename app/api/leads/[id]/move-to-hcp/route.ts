import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  if (!dbUser || !["admin", "csr"].includes(dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch the lead
  const { data: lead, error: leadErr } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .single();

  if (leadErr || !lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  if (lead.status === "moved_to_hcp") {
    return NextResponse.json(
      { error: "Lead has already been moved to HCP" },
      { status: 400 }
    );
  }

  const hcpBase = process.env.HCP_API_BASE_URL;
  const hcpToken = process.env.HCP_BEARER_TOKEN;

  if (!hcpBase || !hcpToken) {
    return NextResponse.json(
      { error: "HCP API not configured" },
      { status: 500 }
    );
  }

  // Step 1: Create customer in HCP
  const customerPayload: Record<string, any> = {
    first_name: lead.first_name,
    last_name: lead.last_name || "",
    notifications_enabled: true,
  };

  if (lead.email) customerPayload.email = lead.email;
  if (lead.phone) customerPayload.mobile_number = lead.phone;
  if (lead.lead_source) customerPayload.lead_source = lead.lead_source;

  if (lead.address || lead.city || lead.state || lead.zip) {
    customerPayload.addresses = [
      {
        street: lead.address || "",
        city: lead.city || "",
        state: lead.state || "WA",
        zip: lead.zip || "",
        country: "US",
      },
    ];
  }

  let hcpCustomerId: string;
  let hcpAddressId: string | null = null;

  try {
    const custRes = await fetch(`${hcpBase}/customers`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hcpToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(customerPayload),
    });

    if (!custRes.ok) {
      const errText = await custRes.text();
      console.error("HCP create customer error:", custRes.status, errText);
      return NextResponse.json(
        { error: `HCP customer creation failed: ${custRes.status}` },
        { status: 502 }
      );
    }

    const custData = await custRes.json();
    hcpCustomerId = custData.id;

    // Grab address ID if returned
    if (custData.addresses?.length > 0) {
      hcpAddressId = custData.addresses[0].id;
    }
  } catch (err) {
    console.error("HCP create customer exception:", err);
    return NextResponse.json(
      { error: "Failed to connect to HCP API" },
      { status: 502 }
    );
  }

  // Step 2: Create estimate in HCP
  // HCP requires at least one option with a line item
  const estimatePayload: Record<string, any> = {
    customer_id: hcpCustomerId,
    options: [
      {
        name: "Option 1",
        line_items: [
          {
            name: "Service Estimate",
            description: lead.notes || "Estimate from lead",
            unit_price: 0,
            quantity: 1,
          },
        ],
      },
    ],
  };

  if (lead.notes) estimatePayload.note = lead.notes;
  if (lead.lead_source) estimatePayload.lead_source = lead.lead_source;
  if (hcpAddressId) estimatePayload.address_id = hcpAddressId;

  let hcpEstimateId: string;

  try {
    const estRes = await fetch(`${hcpBase}/estimates`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hcpToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(estimatePayload),
    });

    if (!estRes.ok) {
      const errText = await estRes.text();
      console.error("HCP create estimate error:", estRes.status, errText);
      return NextResponse.json(
        { error: `HCP estimate creation failed: ${estRes.status}` },
        { status: 502 }
      );
    }

    const estData = await estRes.json();
    hcpEstimateId = estData.id;
  } catch (err) {
    console.error("HCP create estimate exception:", err);
    return NextResponse.json(
      { error: "Failed to connect to HCP API for estimate" },
      { status: 502 }
    );
  }

  // Step 3: Update lead status (NO local customer/estimate creation)
  // The estimate will enter the pipeline when the HCP polling cron
  // detects it has been sent to the customer (approval_status = "awaiting response")
  await supabase
    .from("leads")
    .update({
      status: "moved_to_hcp",
      hcp_customer_id: hcpCustomerId,
    })
    .eq("id", id);

  return NextResponse.json({
    success: true,
    hcp_customer_id: hcpCustomerId,
    hcp_estimate_id: hcpEstimateId,
  });
}
