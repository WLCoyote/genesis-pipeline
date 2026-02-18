import { SupabaseClient } from "@supabase/supabase-js";

const MAX_PAGES = 5;

export interface PollResult {
  new_estimates: number;
  updated: number;
  won: number;
  lost: number;
  skipped: number;
  errors: number;
  pages_fetched: number;
}

export async function pollHcpEstimates(
  supabase: SupabaseClient
): Promise<PollResult> {
  const startTime = Date.now();
  const results: PollResult = {
    new_estimates: 0,
    updated: 0,
    won: 0,
    lost: 0,
    skipped: 0,
    errors: 0,
    pages_fetched: 0,
  };

  const hcpBase = process.env.HCP_API_BASE_URL;
  const hcpToken = process.env.HCP_BEARER_TOKEN;

  if (!hcpBase || !hcpToken) {
    throw new Error("HCP API not configured");
  }

  console.log("[HCP Poll] Starting...");

  // Read auto_decline_days from settings
  const { data: setting } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "auto_decline_days")
    .single();

  const autoDeclineDays = (setting?.value as number) || 60;

  // Cutoff date for filtering estimates by age (in code, not API params)
  // HCP's scheduled_start filters are for appointment date, not creation date
  const today = new Date();
  const cutoffDate = new Date(today);
  cutoffDate.setDate(cutoffDate.getDate() - autoDeclineDays);

  console.log(`[HCP Poll] Cutoff: ${cutoffDate.toISOString().split("T")[0]} (${autoDeclineDays} days back)`);

  // Fetch local users for employee name matching
  const { data: users } = await supabase
    .from("users")
    .select("id, name, email")
    .eq("is_active", true);

  const userByName: Record<string, { id: string; name: string }> = {};
  for (const u of users || []) {
    if (u.name) {
      userByName[u.name.toLowerCase().trim()] = { id: u.id, name: u.name };
    }
  }

  // Fetch default follow-up sequence
  const { data: defaultSequence } = await supabase
    .from("follow_up_sequences")
    .select("id")
    .eq("is_default", true)
    .limit(1)
    .single();

  // Pre-fetch all local estimate IDs for instant matching (1 query, no per-estimate DB call)
  const { data: localEstimatesIndex } = await supabase
    .from("estimates")
    .select("hcp_estimate_id, estimate_number");

  const localByHcpId = new Set<string>();
  const localByEstNumber = new Set<string>();
  for (const e of localEstimatesIndex || []) {
    if (e.hcp_estimate_id) localByHcpId.add(e.hcp_estimate_id);
    if (e.estimate_number) localByEstNumber.add(e.estimate_number);
  }

  console.log(`[HCP Poll] Local index: ${localByHcpId.size} by HCP ID, ${localByEstNumber.size} by est number`);

  // Debug: log first estimate for field name verification (remove after verified)
  let loggedFirst = false;

  // Paginate through HCP estimates with proper date filtering
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages && page <= MAX_PAGES) {
    try {
      const fetchUrl = `${hcpBase}/estimates?page=${page}&page_size=200&sort_direction=desc`;
      console.log(`[HCP Poll] Fetching page ${page}...`);

      const controller = new AbortController();
      const fetchTimeout = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(fetchUrl, {
        headers: {
          Authorization: `Bearer ${hcpToken}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });
      clearTimeout(fetchTimeout);

      if (!response.ok) {
        const errorBody = await response.text();
        console.error("[HCP Poll] API error:", response.status, errorBody);
        throw new Error(`HCP API returned ${response.status}: ${errorBody}`);
      }

      const data = await response.json();
      totalPages = data.total_pages || 1;

      const pageEstimates = (data.estimates || []) as Record<string, unknown>[];
      console.log(`[HCP Poll] Page ${page}/${totalPages}: ${pageEstimates.length} estimates (${Date.now() - startTime}ms)`);
      results.pages_fetched++;

      // Debug: log first estimate structure
      if (!loggedFirst && pageEstimates.length > 0) {
        console.log("[HCP Poll] Sample estimate:", JSON.stringify(pageEstimates[0], null, 2));
        loggedFirst = true;
      }

      // Process each estimate on this page immediately
      let pageAllOld = true;

      for (const hcpEstimate of pageEstimates) {
        try {
          const hcpId = hcpEstimate.id as string;
          const hcpEstNumber = String(hcpEstimate.estimate_number || "");
          const hcpOptions = (hcpEstimate.options || []) as Record<string, unknown>[];

          // Skip estimates older than cutoff (created_at from HCP)
          const createdAt = hcpEstimate.created_at as string | undefined;
          if (createdAt) {
            const estDate = new Date(createdAt);
            if (estDate < cutoffDate) {
              continue; // too old
            }
            pageAllOld = false;
          } else {
            pageAllOld = false; // no date = process it
          }

          // Instant check: do we already have this estimate locally?
          const isLocal = localByHcpId.has(hcpId) || localByEstNumber.has(hcpEstNumber);

          if (isLocal) {
            // --- EXISTING: check for status/price updates ---
            const { data: localEstimate } = await supabase
              .from("estimates")
              .select("id, status, assigned_to, customer_id, online_estimate_url, total_amount")
              .or(`hcp_estimate_id.eq.${hcpId},estimate_number.eq.${hcpEstNumber}`)
              .limit(1)
              .single();

            if (localEstimate) {
              await handleExistingEstimate(supabase, hcpEstimate, hcpOptions, localEstimate, results);
            }
          } else {
            // --- NEW: create if sent to customer ("awaiting response") ---
            const created = await handleNewEstimate(
              supabase, hcpEstimate, hcpId, hcpEstNumber, hcpOptions,
              autoDeclineDays, defaultSequence?.id || null, userByName, results
            );

            // Add to index so we don't re-process on subsequent pages
            if (created) {
              localByHcpId.add(hcpId);
              if (hcpEstNumber) localByEstNumber.add(hcpEstNumber);
            }
          }
        } catch (err) {
          console.error(`[HCP Poll] Error processing estimate ${hcpEstimate.id}:`, err);
          results.errors++;
        }
      }

      // If every estimate on this page was older than cutoff, stop paginating
      if (pageAllOld && pageEstimates.length > 0) {
        console.log(`[HCP Poll] Page ${page} all older than cutoff — stopping`);
        break;
      }

      page++;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        console.error("[HCP Poll] HCP API timed out (30s limit)");
        throw new Error("HCP API request timed out after 30 seconds");
      }
      console.error(`[HCP Poll] Fetch error on page ${page}:`, err);
      throw err;
    }
  }

  if (page > MAX_PAGES && totalPages > MAX_PAGES) {
    console.log(`[HCP Poll] Stopped at page limit (${MAX_PAGES}/${totalPages} pages)`);
  }

  console.log(`[HCP Poll] Complete in ${Date.now() - startTime}ms:`, JSON.stringify(results));
  return results;
}

// --- New estimate detection ---
// Returns true if an estimate was actually created
async function handleNewEstimate(
  supabase: SupabaseClient,
  hcpEstimate: Record<string, unknown>,
  hcpId: string,
  hcpEstNumber: string,
  hcpOptions: Record<string, unknown>[],
  autoDeclineDays: number,
  defaultSequenceId: string | null,
  userByName: Record<string, { id: string; name: string }>,
  results: PollResult
): Promise<boolean> {
  // Check if estimate was sent to customer
  // HCP uses option.status = "submitted for signoff" when sent (not approval_status)
  // Also check approval_status for already-resolved estimates (approved/declined)
  const sentOption = hcpOptions.find((o) => {
    const optStatus = String(o.status || "").toLowerCase();
    const approvalStatus = String(o.approval_status || "").toLowerCase();
    return (
      optStatus === "submitted for signoff" ||
      approvalStatus === "approved" ||
      approvalStatus === "declined"
    );
  });

  if (!sentOption) {
    results.skipped++;
    return false;
  }

  // Determine local estimate status based on HCP option statuses
  const anyApproved = hcpOptions.some(
    (o) => String(o.approval_status || "").toLowerCase() === "approved"
  );
  const allDeclined = hcpOptions.every((o) => {
    const s = String(o.approval_status || "").toLowerCase();
    return s === "declined";
  });
  let localStatus = "active";
  if (anyApproved) localStatus = "won";
  else if (allDeclined && hcpOptions.length > 0) localStatus = "lost";

  // Extract customer data
  const hcpCustomer = (hcpEstimate.customer || {}) as Record<string, unknown>;
  const hcpCustomerId = hcpCustomer.id as string | undefined;
  const fullName = [hcpCustomer.first_name, hcpCustomer.last_name]
    .filter(Boolean)
    .join(" ");
  const customerName =
    (hcpCustomer.company as string) ||
    fullName ||
    "Unknown";

  if (!hcpCustomerId) {
    console.error(`[HCP Poll] Estimate ${hcpId} has no customer ID, skipping`);
    results.errors++;
    return false;
  }

  // Upsert local customer
  let customerId: string;
  const { data: existingCustomer } = await supabase
    .from("customers")
    .select("id")
    .eq("hcp_customer_id", hcpCustomerId)
    .limit(1)
    .single();

  if (existingCustomer) {
    customerId = existingCustomer.id;
    await supabase
      .from("customers")
      .update({
        name: customerName,
        ...(hcpCustomer.email ? { email: hcpCustomer.email } : {}),
        ...(hcpCustomer.mobile_number ? { phone: hcpCustomer.mobile_number } : {}),
      })
      .eq("id", existingCustomer.id);
  } else {
    const { data: newCust, error: custErr } = await supabase
      .from("customers")
      .insert({
        hcp_customer_id: hcpCustomerId,
        name: customerName,
        email: (hcpCustomer.email as string) || null,
        phone: (hcpCustomer.mobile_number as string) || null,
        lead_source: (hcpEstimate.lead_source as string) || null,
      })
      .select("id")
      .single();

    if (custErr || !newCust) {
      console.error(`[HCP Poll] Failed to create customer for estimate ${hcpId}:`, custErr);
      results.errors++;
      return false;
    }
    customerId = newCust.id;
  }

  // Calculate auto_decline_date
  const autoDeclineDate = new Date();
  autoDeclineDate.setDate(autoDeclineDate.getDate() + autoDeclineDays);

  // Match assigned_employees to local user
  let assignedTo: string | null = null;
  const hcpEmployees = (hcpEstimate.assigned_employees || []) as Record<string, unknown>[];
  for (const emp of hcpEmployees) {
    const empName = [emp.first_name, emp.last_name]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .trim();
    if (empName && userByName[empName]) {
      assignedTo = userByName[empName].id;
      break;
    }
  }

  // Estimate URL (may not be in list response — will update later if found)
  const estimateUrl =
    (hcpEstimate.online_estimate_url as string) ||
    (hcpEstimate.customer_url as string) ||
    (hcpEstimate.html_url as string) ||
    null;

  // Use highest option amount (options are alternatives, not additive)
  // HCP sends amounts in cents — divide by 100 for dollars
  const highestOptionAmount = hcpOptions.reduce((max, o) => {
    const amt = (parseFloat(String(o.total_amount || "0")) || 0) / 100;
    return amt > max ? amt : max;
  }, 0) || null;

  // Determine sent_date based on option status:
  // "submitted for signoff" → option.updated_at (when it was sent)
  // approved/declined → estimate.schedule.scheduled_start (original send date)
  let sentDate: string | null = null;

  const submittedOpt = hcpOptions.find(
    (o) => String(o.status || "").toLowerCase() === "submitted for signoff"
  );
  if (submittedOpt && submittedOpt.updated_at) {
    sentDate = (submittedOpt.updated_at as string).split("T")[0];
  } else {
    // Approved/declined — use scheduled_start from estimate
    const schedule = (hcpEstimate.schedule || {}) as Record<string, unknown>;
    const scheduledStart =
      (schedule.scheduled_start as string) ||
      (hcpEstimate.scheduled_start as string) ||
      null;
    if (scheduledStart) {
      sentDate = scheduledStart.split("T")[0];
    }
  }

  // Final fallback to estimate created_at
  if (!sentDate) {
    sentDate =
      (hcpEstimate.created_at as string)?.split("T")[0] ||
      new Date().toISOString().split("T")[0];
  }

  // Create local estimate (upsert on estimate_number for dedup safety)
  const { data: newEstimate, error: estErr } = await supabase
    .from("estimates")
    .upsert(
      {
        estimate_number: hcpEstNumber,
        hcp_estimate_id: hcpId,
        customer_id: customerId,
        assigned_to: assignedTo,
        status: localStatus,
        total_amount: highestOptionAmount,
        sent_date: sentDate,
        sequence_id: localStatus === "active" ? defaultSequenceId : null,
        sequence_step_index: 0,
        auto_decline_date: autoDeclineDate.toISOString().split("T")[0],
        online_estimate_url: estimateUrl,
      },
      { onConflict: "estimate_number" }
    )
    .select("id")
    .single();

  if (estErr || !newEstimate) {
    console.error(`[HCP Poll] Failed to create estimate ${hcpId}:`, estErr);
    results.errors++;
    return false;
  }

  // Create estimate_options
  for (let i = 0; i < hcpOptions.length; i++) {
    const opt = hcpOptions[i];
    const optStatus = String(opt.approval_status || "").toLowerCase();

    await supabase.from("estimate_options").insert({
      estimate_id: newEstimate.id,
      hcp_option_id: String(opt.id),
      option_number: i + 1,
      description: (opt.name as string) || `Option ${i + 1}`,
      amount: (parseFloat(String(opt.total_amount || "0")) || 0) / 100 || null,
      status:
        optStatus === "approved"
          ? "approved"
          : optStatus === "declined"
            ? "declined"
            : "pending",
    });
  }

  // Notify assigned comfort pro
  if (assignedTo) {
    await supabase.from("notifications").insert({
      user_id: assignedTo,
      type: "lead_assigned",
      estimate_id: newEstimate.id,
      message: `New estimate from HCP: ${customerName}`,
    });
  }

  console.log(`[HCP Poll] Created: ${hcpEstNumber} — ${customerName}`);
  results.new_estimates++;
  return true;
}

// --- Existing estimate update ---
async function handleExistingEstimate(
  supabase: SupabaseClient,
  hcpEstimate: Record<string, unknown>,
  hcpOptions: Record<string, unknown>[],
  localEstimate: {
    id: string;
    status: string;
    assigned_to: string | null;
    customer_id: string;
    online_estimate_url: string | null;
    total_amount: number | null;
  },
  results: PollResult
) {
  // --- Always refresh customer info from HCP ---
  const hcpCustomer = (hcpEstimate.customer || {}) as Record<string, unknown>;
  const fullName = [hcpCustomer.first_name, hcpCustomer.last_name]
    .filter(Boolean)
    .join(" ");
  const customerName =
    (hcpCustomer.company as string) ||
    fullName ||
    "Unknown";

  if (localEstimate.customer_id) {
    await supabase
      .from("customers")
      .update({
        name: customerName,
        ...(hcpCustomer.email ? { email: hcpCustomer.email } : {}),
        ...(hcpCustomer.mobile_number ? { phone: hcpCustomer.mobile_number } : {}),
      })
      .eq("id", localEstimate.customer_id);
  }

  // --- Always refresh estimate fields from HCP ---
  const estimateUrl =
    (hcpEstimate.online_estimate_url as string) ||
    (hcpEstimate.customer_url as string) ||
    (hcpEstimate.html_url as string) ||
    null;

  const highestOpt = hcpOptions.reduce((max, o) => {
    const amt = (parseFloat(String(o.total_amount || "0")) || 0) / 100;
    return amt > max ? amt : max;
  }, 0) || null;

  // Recalculate sent_date using same logic as new estimates
  let sentDate: string | null = null;
  const submittedOpt = hcpOptions.find(
    (o) => String(o.status || "").toLowerCase() === "submitted for signoff"
  );
  if (submittedOpt && submittedOpt.updated_at) {
    sentDate = (submittedOpt.updated_at as string).split("T")[0];
  } else {
    const schedule = (hcpEstimate.schedule || {}) as Record<string, unknown>;
    const scheduledStart =
      (schedule.scheduled_start as string) ||
      (hcpEstimate.scheduled_start as string) ||
      null;
    if (scheduledStart) {
      sentDate = scheduledStart.split("T")[0];
    }
  }

  // Fallback to estimate created_at (same as handleNewEstimate)
  if (!sentDate) {
    sentDate =
      (hcpEstimate.created_at as string)?.split("T")[0] || null;
  }

  const estimateUpdates: Record<string, unknown> = {};
  if (estimateUrl) estimateUpdates.online_estimate_url = estimateUrl;
  if (highestOpt) estimateUpdates.total_amount = highestOpt;
  if (sentDate) estimateUpdates.sent_date = sentDate;

  if (Object.keys(estimateUpdates).length > 0) {
    await supabase
      .from("estimates")
      .update(estimateUpdates)
      .eq("id", localEstimate.id);
  }

  // --- Always refresh option amounts and statuses ---
  const { data: localOptions } = await supabase
    .from("estimate_options")
    .select("id, hcp_option_id, status, amount")
    .eq("estimate_id", localEstimate.id);

  let anyApproved = false;
  let allDeclined = true;
  let statusChanged = false;

  for (const hcpOpt of hcpOptions) {
    const hcpOptId = String(hcpOpt.id);
    const hcpApproval = String(hcpOpt.approval_status || "").toLowerCase();
    const hcpAmount = (parseFloat(String(hcpOpt.total_amount || "0")) || 0) / 100;
    const hcpName = (hcpOpt.name as string) || null;

    const localOpt = (localOptions || []).find(
      (lo) => String(lo.hcp_option_id) === hcpOptId
    );

    if (localOpt) {
      // Update existing option: amount, description, status
      const optUpdates: Record<string, unknown> = {};
      if (hcpAmount && hcpAmount !== localOpt.amount) optUpdates.amount = hcpAmount;
      if (hcpApproval === "approved" && localOpt.status !== "approved") {
        optUpdates.status = "approved";
        anyApproved = true;
        statusChanged = true;
      } else if (hcpApproval === "declined" && localOpt.status !== "declined") {
        optUpdates.status = "declined";
        statusChanged = true;
      } else if (localOpt.status !== "declined") {
        allDeclined = false;
      }
      if (hcpName) optUpdates.description = hcpName;

      if (Object.keys(optUpdates).length > 0) {
        await supabase
          .from("estimate_options")
          .update(optUpdates)
          .eq("id", localOpt.id);
      }
    } else {
      // New option added in HCP — create locally
      allDeclined = false;
      await supabase.from("estimate_options").insert({
        estimate_id: localEstimate.id,
        hcp_option_id: hcpOptId,
        option_number: hcpOptions.indexOf(hcpOpt) + 1,
        description: hcpName || `Option`,
        amount: hcpAmount || null,
        status:
          hcpApproval === "approved"
            ? "approved"
            : hcpApproval === "declined"
              ? "declined"
              : "pending",
      });
      if (hcpApproval === "approved") anyApproved = true;
    }
  }

  // --- Update estimate status if options changed (won/lost) ---
  if (statusChanged && localEstimate.status !== "won" && localEstimate.status !== "lost") {
    if (anyApproved) {
      await supabase
        .from("estimates")
        .update({ status: "won" })
        .eq("id", localEstimate.id);

      await supabase
        .from("follow_up_events")
        .update({ status: "skipped" })
        .eq("estimate_id", localEstimate.id)
        .in("status", ["scheduled", "pending_review", "snoozed"]);

      if (localEstimate.assigned_to) {
        await supabase.from("notifications").insert({
          user_id: localEstimate.assigned_to,
          type: "estimate_approved",
          estimate_id: localEstimate.id,
          message: "Estimate approved by customer in Housecall Pro!",
        });
      }
      results.won++;
    } else if (allDeclined && (localOptions || []).length > 0) {
      await supabase
        .from("estimates")
        .update({ status: "lost" })
        .eq("id", localEstimate.id);

      await supabase
        .from("follow_up_events")
        .update({ status: "skipped" })
        .eq("estimate_id", localEstimate.id)
        .in("status", ["scheduled", "pending_review", "snoozed"]);

      if (localEstimate.assigned_to) {
        await supabase.from("notifications").insert({
          user_id: localEstimate.assigned_to,
          type: "estimate_declined",
          estimate_id: localEstimate.id,
          message: "All estimate options declined in Housecall Pro.",
        });
      }
      results.lost++;
    }
  }

  results.updated++;
}
