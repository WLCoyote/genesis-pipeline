/**
 * POST /api/proposals/[token]/sign
 *
 * Public, token-gated sign endpoint. Records signature, updates estimate to "won",
 * then fires post-sign tasks (PDF, HCP writeback, email, notifications) via after().
 */

import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { generateProposalPdf, type ProposalPdfData } from "@/lib/proposal-pdf";
import { sendProposalConfirmationEmail } from "@/lib/proposal-email";
import {
  approveHcpOption,
  declineHcpOptions,
  uploadHcpAttachment,
  addHcpOptionNote,
} from "@/lib/hcp-estimate";
import { getCompanyInfo, getProposalTerms } from "@/lib/company-settings";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const supabase = createServiceClient();

  // --- 1. Parse and validate body ---
  let body: {
    customer_name: string;
    signature_data: string;
    selected_tier: number;
    selected_addon_ids: string[];
    selected_financing_plan_id: string | null;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.customer_name || body.customer_name.trim().length < 2) {
    return NextResponse.json(
      { error: "Customer name must be at least 2 characters" },
      { status: 400 }
    );
  }

  if (!body.signature_data || !body.signature_data.startsWith("data:image")) {
    return NextResponse.json(
      { error: "Valid signature is required" },
      { status: 400 }
    );
  }

  if (![1, 2, 3].includes(body.selected_tier)) {
    return NextResponse.json(
      { error: "Selected tier must be 1, 2, or 3" },
      { status: 400 }
    );
  }

  // --- 2. Validate token → fetch estimate ---
  const { data: estimate, error: estError } = await supabase
    .from("estimates")
    .select(
      `
      id, estimate_number, status, hcp_estimate_id, tax_rate, subtotal,
      proposal_signed_at, auto_decline_date, payment_schedule_type,
      assigned_to, sequence_id, tier_metadata,
      customers ( id, name, email, phone, address ),
      users!estimates_assigned_to_fkey ( id, name ),
      estimate_line_items (
        id, option_group, display_name, spec_line, description,
        quantity, unit_price, line_total, is_addon, is_selected,
        sort_order, hcp_option_id
      )
    `
    )
    .eq("proposal_token", token)
    .single();

  if (estError || !estimate) {
    return NextResponse.json(
      { error: "Invalid proposal token" },
      { status: 404 }
    );
  }

  // --- 3. Guards ---
  if (estimate.proposal_signed_at) {
    return NextResponse.json(
      { error: "This proposal has already been signed" },
      { status: 409 }
    );
  }

  if (
    estimate.auto_decline_date &&
    new Date(estimate.auto_decline_date) < new Date()
  ) {
    return NextResponse.json(
      { error: "This proposal has expired" },
      { status: 410 }
    );
  }

  if (estimate.status === "lost" || estimate.status === "dormant") {
    return NextResponse.json(
      { error: "This proposal is no longer available" },
      { status: 410 }
    );
  }

  // --- 4. Extract client IP ---
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  // --- 5. Normalize FK joins ---
  const customerRaw = estimate.customers as unknown;
  const customer = (
    Array.isArray(customerRaw) ? customerRaw[0] : customerRaw
  ) as {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
  } | null;

  const techRaw = estimate.users as unknown;
  const technician = (Array.isArray(techRaw) ? techRaw[0] : techRaw) as {
    id: string;
    name: string;
  } | null;

  const lineItems = (estimate.estimate_line_items || []) as Array<{
    id: string;
    option_group: number;
    display_name: string;
    spec_line: string | null;
    description: string | null;
    quantity: number;
    unit_price: number;
    line_total: number;
    is_addon: boolean;
    is_selected: boolean;
    sort_order: number;
    hcp_option_id: string | null;
  }>;

  // --- 6. CRITICAL DB WRITE ---

  // 6a. Update addon selections
  const selectedAddonSet = new Set(body.selected_addon_ids || []);
  const addonItems = lineItems.filter((li) => li.is_addon);

  for (const addon of addonItems) {
    const shouldSelect = selectedAddonSet.has(addon.id);
    if (addon.is_selected !== shouldSelect) {
      await supabase
        .from("estimate_line_items")
        .update({ is_selected: shouldSelect })
        .eq("id", addon.id);
    }
  }

  // 6b. Calculate totals
  const selectedTier = body.selected_tier;
  const tierItems = lineItems.filter(
    (li) => li.option_group === selectedTier && !li.is_addon
  );
  const tierSubtotal = tierItems.reduce((sum, li) => sum + li.line_total, 0);

  const selectedAddonTotal = addonItems
    .filter((li) => selectedAddonSet.has(li.id))
    .reduce((sum, li) => sum + li.line_total, 0);

  const subtotal = Math.round((tierSubtotal + selectedAddonTotal) * 100) / 100;
  const taxRate = estimate.tax_rate;
  const taxAmount =
    taxRate != null ? Math.round(subtotal * taxRate * 100) / 100 : null;
  const totalAmount =
    taxAmount != null
      ? Math.round((subtotal + taxAmount) * 100) / 100
      : subtotal;

  // 6c. Fetch financing plan if selected
  let financingPlan: {
    id: string;
    label: string;
    fee_pct: number;
    months: number;
  } | null = null;

  if (body.selected_financing_plan_id) {
    const { data: fp } = await supabase
      .from("financing_plans")
      .select("id, label, fee_pct, months")
      .eq("id", body.selected_financing_plan_id)
      .single();
    financingPlan = fp;
  }

  // 6d. Update estimate
  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("estimates")
    .update({
      proposal_signed_at: now,
      proposal_signed_name: body.customer_name.trim(),
      proposal_signature_data: body.signature_data,
      proposal_signed_ip: clientIp,
      status: "won",
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      selected_tier: selectedTier,
      selected_financing_plan_id: financingPlan?.id || null,
    })
    .eq("id", estimate.id);

  if (updateError) {
    console.error("[Sign] Failed to update estimate:", updateError);
    return NextResponse.json(
      { error: "Failed to record signature. Please try again." },
      { status: 500 }
    );
  }

  // --- 7. Build shared context for post-sign tasks ---
  const postSignCtx = {
    supabase,
    estimateId: estimate.id,
    estimateNumber: estimate.estimate_number,
    hcpEstimateId: estimate.hcp_estimate_id,
    selectedTier,
    lineItems,
    addonItems,
    selectedAddonSet,
    customer,
    technician,
    signedName: body.customer_name.trim(),
    signedAt: now,
    signedIp: clientIp,
    signatureDataUrl: body.signature_data,
    subtotal,
    taxRate,
    taxAmount,
    totalAmount,
    financingPlan,
    paymentScheduleType:
      estimate.payment_schedule_type || "standard",
    assignedTo: estimate.assigned_to,
    sequenceId: estimate.sequence_id,
    proposalToken: token,
    tierMetadata: (estimate as Record<string, unknown>).tier_metadata as Array<{
      tier_number: number;
      tier_name: string;
    }> | null,
  };

  // --- 8. Generate PDF synchronously (so URL is available immediately) ---
  let pdfUrl: string | null = null;
  let pdfBuffer: Buffer | null = null;
  try {
    const result = await generatePdfAndUpload(postSignCtx);
    pdfUrl = result.pdfUrl;
    pdfBuffer = result.pdfBuffer;
  } catch (err) {
    console.error("[Sign] PDF generation before response failed:", err);
  }

  // --- 9. Fire remaining post-sign tasks in after() ---
  after(async () => {
    try {
      await runPostSignTasks(postSignCtx, pdfBuffer);
    } catch (err) {
      console.error("[Sign after()] Unexpected error:", err);
    }
  });

  return NextResponse.json({ ok: true, proposal_pdf_url: pdfUrl });
}

// ---------- PDF Generation (synchronous) ----------

async function generatePdfAndUpload(ctx: {
  supabase: ReturnType<typeof createServiceClient>;
  estimateId: string;
  estimateNumber: string;
  selectedTier: number;
  lineItems: Array<{
    id: string;
    option_group: number;
    display_name: string;
    spec_line: string | null;
    description: string | null;
    quantity: number;
    unit_price: number;
    line_total: number;
    is_addon: boolean;
    is_selected: boolean;
    sort_order: number;
    hcp_option_id: string | null;
  }>;
  addonItems: Array<{
    id: string;
    display_name: string;
    spec_line: string | null;
    quantity: number;
    unit_price: number;
    line_total: number;
    is_addon: boolean;
    is_selected: boolean;
    hcp_option_id: string | null;
  }>;
  selectedAddonSet: Set<string>;
  customer: { id: string; name: string; email: string | null; phone: string | null; address: string | null } | null;
  technician: { id: string; name: string } | null;
  signedName: string;
  signedAt: string;
  signedIp: string;
  signatureDataUrl: string;
  subtotal: number;
  taxRate: number | null;
  taxAmount: number | null;
  totalAmount: number;
  financingPlan: { id: string; label: string; fee_pct: number; months: number } | null;
  paymentScheduleType: string;
  tierMetadata: Array<{ tier_number: number; tier_name: string }> | null;
}): Promise<{ pdfBuffer: Buffer | null; pdfUrl: string | null }> {
  const { supabase } = ctx;

  const defaultTierNames: Record<number, string> = {
    1: "Standard Comfort",
    2: "Enhanced Efficiency",
    3: "Premium Performance",
  };
  const tierNames: Record<number, string> = { ...defaultTierNames };
  if (ctx.tierMetadata) {
    for (const meta of ctx.tierMetadata) {
      tierNames[meta.tier_number] = meta.tier_name;
    }
  }

  const tierItems = ctx.lineItems.filter(
    (li) => li.option_group === ctx.selectedTier && !li.is_addon
  );
  const selectedAddons = ctx.addonItems.filter((li) =>
    ctx.selectedAddonSet.has(li.id)
  );

  let financingMonthly: number | null = null;
  if (ctx.financingPlan) {
    const financed = ctx.totalAmount / (1 - ctx.financingPlan.fee_pct);
    financingMonthly = Math.round((financed / ctx.financingPlan.months) * 100) / 100;
  }

  const [companyInfo, proposalTerms] = await Promise.all([
    getCompanyInfo(),
    getProposalTerms(),
  ]);

  const pdfData: ProposalPdfData = {
    estimateNumber: ctx.estimateNumber,
    customerName: ctx.customer?.name || ctx.signedName,
    customerAddress: ctx.customer?.address || null,
    technicianName: ctx.technician?.name || "Genesis HVAC",
    signedAt: ctx.signedAt,
    signedName: ctx.signedName,
    signedIp: ctx.signedIp,
    signatureDataUrl: ctx.signatureDataUrl,
    selectedTierName: tierNames[ctx.selectedTier] || `Option ${ctx.selectedTier}`,
    tierItems: tierItems.map((li) => ({
      displayName: li.display_name,
      specLine: li.spec_line,
      quantity: li.quantity,
      unitPrice: li.unit_price,
      lineTotal: li.line_total,
    })),
    addonItems: selectedAddons.map((li) => ({
      displayName: li.display_name,
      specLine: li.spec_line,
      quantity: li.quantity,
      unitPrice: li.unit_price,
      lineTotal: li.line_total,
    })),
    subtotal: ctx.subtotal,
    taxRate: ctx.taxRate,
    taxAmount: ctx.taxAmount,
    totalAmount: ctx.totalAmount,
    financingLabel: ctx.financingPlan?.label || null,
    financingMonthly,
    financingMonths: ctx.financingPlan?.months || null,
    paymentScheduleType: ctx.paymentScheduleType,
    companyInfo,
    proposalTerms,
  };

  const pdfBuffer = await generateProposalPdf(pdfData);
  console.log(`[Sign] PDF generated: ${pdfBuffer.length} bytes for ${ctx.estimateNumber}`);

  // Upload to Supabase Storage
  const pdfPath = `${ctx.estimateId}/${ctx.estimateNumber}-signed.pdf`;
  const { error: uploadError } = await supabase.storage
    .from("proposal-pdfs")
    .upload(pdfPath, pdfBuffer, { contentType: "application/pdf", upsert: true });

  let pdfUrl: string | null = null;
  if (uploadError) {
    console.error("[Sign] PDF upload failed:", uploadError);
  } else {
    const { data: urlData } = await supabase.storage
      .from("proposal-pdfs")
      .createSignedUrl(pdfPath, 60 * 60 * 24 * 365 * 10);

    if (urlData?.signedUrl) {
      pdfUrl = urlData.signedUrl;
      await supabase
        .from("estimates")
        .update({ proposal_pdf_url: pdfUrl })
        .eq("id", ctx.estimateId);
      console.log(`[Sign] PDF URL stored for ${ctx.estimateNumber}`);
    }
  }

  return { pdfBuffer, pdfUrl };
}

// ---------- Post-sign tasks (fire-and-forget, PDF already generated) ----------

async function runPostSignTasks(ctx: {
  supabase: ReturnType<typeof createServiceClient>;
  estimateId: string;
  estimateNumber: string;
  hcpEstimateId: string | null;
  selectedTier: number;
  lineItems: Array<{
    id: string;
    option_group: number;
    display_name: string;
    spec_line: string | null;
    description: string | null;
    quantity: number;
    unit_price: number;
    line_total: number;
    is_addon: boolean;
    is_selected: boolean;
    sort_order: number;
    hcp_option_id: string | null;
  }>;
  addonItems: Array<{
    id: string;
    option_group: number;
    display_name: string;
    spec_line: string | null;
    description: string | null;
    quantity: number;
    unit_price: number;
    line_total: number;
    is_addon: boolean;
    is_selected: boolean;
    sort_order: number;
    hcp_option_id: string | null;
  }>;
  selectedAddonSet: Set<string>;
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
  } | null;
  technician: { id: string; name: string } | null;
  signedName: string;
  signedAt: string;
  signedIp: string;
  signatureDataUrl: string;
  subtotal: number;
  taxRate: number | null;
  taxAmount: number | null;
  totalAmount: number;
  financingPlan: {
    id: string;
    label: string;
    fee_pct: number;
    months: number;
  } | null;
  paymentScheduleType: string;
  assignedTo: string | null;
  sequenceId: string | null;
  proposalToken: string;
  tierMetadata: Array<{ tier_number: number; tier_name: string }> | null;
}, pdfBuffer: Buffer | null) {
  const { supabase } = ctx;

  // a. Record 'signed' engagement event
  try {
    await supabase.from("proposal_engagement").insert({
      estimate_id: ctx.estimateId,
      event_type: "signed",
      option_group: ctx.selectedTier,
    });
  } catch (err) {
    console.error("[Sign] Failed to record engagement:", err);
  }

  // Tier names for email/HCP
  const defaultTierNames: Record<number, string> = {
    1: "Standard Comfort",
    2: "Enhanced Efficiency",
    3: "Premium Performance",
  };
  const tierNames: Record<number, string> = { ...defaultTierNames };
  if (ctx.tierMetadata) {
    for (const meta of ctx.tierMetadata) {
      tierNames[meta.tier_number] = meta.tier_name;
    }
  }

  // b. HCP writeback
  if (ctx.hcpEstimateId) {
    // Find hcp_option_id for selected tier
    const selectedTierItem = ctx.lineItems.find(
      (li) =>
        li.option_group === ctx.selectedTier &&
        !li.is_addon &&
        li.hcp_option_id
    );
    const selectedOptionId = selectedTierItem?.hcp_option_id;

    // Collect other option IDs for non-selected tiers
    const otherOptionIds = [
      ...new Set(
        ctx.lineItems
          .filter(
            (li) =>
              !li.is_addon &&
              li.option_group !== ctx.selectedTier &&
              li.hcp_option_id &&
              li.hcp_option_id !== selectedOptionId
          )
          .map((li) => li.hcp_option_id!)
      ),
    ];

    if (selectedOptionId) {
      // Approve selected option
      try {
        const result = await approveHcpOption(selectedOptionId);
        console.log(
          `[Sign] HCP option approved: ${selectedOptionId}`,
          result.jobId ? `→ job ${result.jobId}` : ""
        );
      } catch (err) {
        console.error("[Sign] HCP approve failed:", err);
      }

      // Decline other options
      if (otherOptionIds.length > 0) {
        try {
          await declineHcpOptions(otherOptionIds);
          console.log(
            `[Sign] HCP options declined: ${otherOptionIds.join(", ")}`
          );
        } catch (err) {
          console.error("[Sign] HCP decline failed:", err);
        }
      }

      // Upload PDF attachment
      if (pdfBuffer) {
        try {
          await uploadHcpAttachment(
            ctx.hcpEstimateId,
            selectedOptionId,
            pdfBuffer,
            `Genesis-Proposal-${ctx.estimateNumber}-Signed.pdf`
          );
          console.log(
            `[Sign] HCP PDF attachment uploaded for ${ctx.estimateNumber}`
          );
        } catch (err) {
          console.error("[Sign] HCP attachment upload failed:", err);
        }
      }

      // Add note to approved option
      try {
        const signDate = new Date(ctx.signedAt).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
        await addHcpOptionNote(
          ctx.hcpEstimateId,
          selectedOptionId,
          `Proposal signed by ${ctx.signedName} on ${signDate} via Genesis Pipeline`
        );
        console.log(`[Sign] HCP note added for ${ctx.estimateNumber}`);
      } catch (err) {
        console.error("[Sign] HCP note failed:", err);
      }
    } else {
      console.warn(
        `[Sign] No hcp_option_id found for tier ${ctx.selectedTier} — skipping HCP writeback`
      );
    }
  }

  // d. Send confirmation email
  if (ctx.customer?.email) {
    try {
      const companyInfo = await getCompanyInfo();
      await sendProposalConfirmationEmail({
        customerEmail: ctx.customer.email,
        customerName: ctx.customer.name,
        estimateNumber: ctx.estimateNumber,
        selectedTierName:
          tierNames[ctx.selectedTier] || `Option ${ctx.selectedTier}`,
        totalAmount: ctx.totalAmount,
        pdfBuffer,
        companyInfo,
      });
      console.log(
        `[Sign] Confirmation email sent to ${ctx.customer.email}`
      );
    } catch (err) {
      console.error("[Sign] Email send failed:", err);
    }
  }

  // e. Create notifications
  const notifyUsers = new Set<string>();
  if (ctx.assignedTo) notifyUsers.add(ctx.assignedTo);

  // Also notify admins
  const { data: admins } = await supabase
    .from("users")
    .select("id")
    .eq("role", "admin")
    .eq("is_active", true);

  for (const admin of admins || []) {
    notifyUsers.add(admin.id);
  }

  const notifMessage = `Proposal signed: ${ctx.customer?.name || ctx.signedName} accepted ${tierNames[ctx.selectedTier] || `Option ${ctx.selectedTier}`} — ${ctx.estimateNumber}`;

  for (const userId of notifyUsers) {
    try {
      await supabase.from("notifications").insert({
        user_id: userId,
        type: "estimate_approved",
        estimate_id: ctx.estimateId,
        message: notifMessage,
      });
    } catch (err) {
      console.error(`[Sign] Notification failed for user ${userId}:`, err);
    }
  }

  // f. Skip remaining follow-up sequence steps
  if (ctx.sequenceId) {
    try {
      // Mark any pending/scheduled follow-up events as skipped
      await supabase
        .from("follow_up_events")
        .update({ status: "skipped" })
        .eq("estimate_id", ctx.estimateId)
        .in("status", ["scheduled", "pending_review"]);

      // Advance sequence_step_index past the end
      const { data: seq } = await supabase
        .from("follow_up_sequences")
        .select("steps")
        .eq("id", ctx.sequenceId)
        .single();

      const totalSteps = (seq?.steps as unknown[])?.length || 0;
      if (totalSteps > 0) {
        await supabase
          .from("estimates")
          .update({ sequence_step_index: totalSteps })
          .eq("id", ctx.estimateId);
      }

      console.log(`[Sign] Follow-up sequence skipped for ${ctx.estimateNumber}`);
    } catch (err) {
      console.error("[Sign] Skip sequence failed:", err);
    }
  }

  console.log(`[Sign] Post-sign tasks complete for ${ctx.estimateNumber}`);
}
