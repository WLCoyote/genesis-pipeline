import { SupabaseClient } from "@supabase/supabase-js";

export interface PollResult {
  new_estimates: number;
  updated: number;
  won: number;
  lost: number;
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

  // Calculate date range
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - autoDeclineDays);

  const startDateStr = startDate.toISOString().split("T")[0];
  const endDateStr = today.toISOString().split("T")[0];

  console.log(`[HCP Poll] Date range: ${startDateStr} to ${endDateStr} (${autoDeclineDays} days)`);

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

  // Paginate through HCP estimates
  let page = 1;
  let totalPages = 1;
  const allHcpEstimates: Record<string, unknown>[] = [];

  while (page <= totalPages) {
    try {
      const fetchUrl = `${hcpBase}/estimates?start_date=${startDateStr}&end_date=${endDateStr}&page=${page}`;
      console.log(`[HCP Poll] Fetching page ${page}: ${fetchUrl}`);

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

      console.log(`[HCP Poll] Page ${page} response: ${response.status} (${Date.now() - startTime}ms elapsed)`);

      if (!response.ok) {
        const errorBody = await response.text();
        console.error("HCP API error:", response.status, errorBody);
        throw new Error(`HCP API returned ${response.status}: ${errorBody}`);
      }

      const data = await response.json();
      totalPages = data.total_pages || 1;

      const estimates = data.estimates || data.data || [];
      if (Array.isArray(estimates)) {
        allHcpEstimates.push(...estimates);
      } else {
        allHcpEstimates.push(estimates);
      }

      console.log(`[HCP Poll] Page ${page}/${totalPages}: ${Array.isArray(estimates) ? estimates.length : 1} estimates`);
      results.pages_fetched++;
      page++;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        console.error(`[HCP Poll] HCP API timed out on page ${page} (30s limit)`);
        throw new Error("HCP API request timed out after 30 seconds");
      }
      console.error(`[HCP Poll] Fetch error on page ${page}:`, err);
      throw err;
    }
  }

  console.log(`[HCP Poll] Fetched ${allHcpEstimates.length} total estimates in ${results.pages_fetched} pages (${Date.now() - startTime}ms)`);

  // Log first estimate for debugging field names (remove after verified)
  if (allHcpEstimates.length > 0) {
    console.log(
      "HCP estimate sample (first):",
      JSON.stringify(allHcpEstimates[0], null, 2)
    );
  }

  // Process each HCP estimate
  for (const hcpEstimate of allHcpEstimates) {
    try {
      const hcpId = hcpEstimate.id as string;
      const hcpEstNumber = String(
        hcpEstimate.estimate_number ||
          (hcpEstimate as Record<string, unknown>).number ||
          ""
      );
      const hcpOptions = (hcpEstimate.options || []) as Record<
        string,
        unknown
      >[];

      // Try to find a local match
      const { data: localEstimate } = await supabase
        .from("estimates")
        .select("id, status, assigned_to, customer_id, online_estimate_url, total_amount")
        .or(
          `hcp_estimate_id.eq.${hcpId},estimate_number.eq.${hcpEstNumber}`
        )
        .limit(1)
        .single();

      if (!localEstimate) {
        // --- NEW ESTIMATE DETECTION ---
        await handleNewEstimate(
          supabase,
          hcpEstimate,
          hcpId,
          hcpEstNumber,
          hcpOptions,
          autoDeclineDays,
          defaultSequence?.id || null,
          userByName,
          results
        );
      } else {
        // --- EXISTING ESTIMATE UPDATE ---
        await handleExistingEstimate(
          supabase,
          hcpEstimate,
          hcpOptions,
          localEstimate,
          results
        );
      }
    } catch (err) {
      console.error(
        `Error processing HCP estimate ${hcpEstimate.id}:`,
        err
      );
      results.errors++;
    }
  }

  console.log(`[HCP Poll] Complete in ${Date.now() - startTime}ms:`, JSON.stringify(results));
  return results;
}

// --- New estimate detection ---
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
) {
  // Only create locally if at least one option is "awaiting response" (sent to customer)
  const hasSentOption = hcpOptions.some((o) => {
    const status = String(o.approval_status || o.status || "").toLowerCase();
    return status === "awaiting response";
  });

  if (!hasSentOption) return;

  // Extract customer data
  const hcpCustomer = (hcpEstimate.customer || {}) as Record<string, unknown>;
  const hcpCustomerId = hcpCustomer.id as string | undefined;
  const customerName =
    [hcpCustomer.first_name, hcpCustomer.last_name]
      .filter(Boolean)
      .join(" ") || "Unknown";

  if (!hcpCustomerId) {
    console.error(`HCP estimate ${hcpId} has no customer ID, skipping`);
    results.errors++;
    return;
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
    // Update with latest info from HCP
    await supabase
      .from("customers")
      .update({
        name: customerName,
        ...(hcpCustomer.email ? { email: hcpCustomer.email } : {}),
        ...(hcpCustomer.mobile_number
          ? { phone: hcpCustomer.mobile_number }
          : {}),
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
      console.error(`Failed to create customer for HCP estimate ${hcpId}:`, custErr);
      results.errors++;
      return;
    }
    customerId = newCust.id;
  }

  // Calculate auto_decline_date
  const autoDeclineDate = new Date();
  autoDeclineDate.setDate(autoDeclineDate.getDate() + autoDeclineDays);

  // Match assigned_employees to local user
  let assignedTo: string | null = null;
  const hcpEmployees = (hcpEstimate.assigned_employees || []) as Record<
    string,
    unknown
  >[];
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

  // Get estimate URL
  const estimateUrl =
    (hcpEstimate.online_estimate_url as string) ||
    (hcpEstimate.customer_url as string) ||
    (hcpEstimate.html_url as string) ||
    null;

  // Use HCP's estimate-level total first; fall back to highest option amount
  // Options are alternatives (customer picks one), NOT additive
  const hcpTotal = parseFloat(String(
    hcpEstimate.total_amount || hcpEstimate.total || "0"
  )) || null;

  const highestOptionAmount = hcpOptions.reduce((max, o) => {
    const amt = parseFloat(String(
      o.total_amount || o.amount || o.total || "0"
    )) || 0;
    return amt > max ? amt : max;
  }, 0) || null;

  const totalAmount = hcpTotal || highestOptionAmount;

  // Determine sent_date
  const sentDate =
    (hcpEstimate.sent_date as string) ||
    (hcpEstimate.created_at as string)?.split("T")[0] ||
    new Date().toISOString().split("T")[0];

  // Create local estimate (upsert on estimate_number for safety)
  const { data: newEstimate, error: estErr } = await supabase
    .from("estimates")
    .upsert(
      {
        estimate_number: hcpEstNumber,
        hcp_estimate_id: hcpId,
        customer_id: customerId,
        assigned_to: assignedTo,
        status: "active",
        total_amount: totalAmount,
        sent_date: sentDate,
        sequence_id: defaultSequenceId,
        sequence_step_index: 0,
        auto_decline_date: autoDeclineDate.toISOString().split("T")[0],
        online_estimate_url: estimateUrl,
      },
      { onConflict: "estimate_number" }
    )
    .select("id")
    .single();

  if (estErr || !newEstimate) {
    console.error(`Failed to create estimate for HCP ${hcpId}:`, estErr);
    results.errors++;
    return;
  }

  // Create estimate_options
  for (let i = 0; i < hcpOptions.length; i++) {
    const opt = hcpOptions[i];
    const optStatus = String(opt.approval_status || opt.status || "")
      .toLowerCase();

    await supabase.from("estimate_options").insert({
      estimate_id: newEstimate.id,
      hcp_option_id: String(opt.id),
      option_number: i + 1,
      description: (opt.name as string) || (opt.label as string) || (opt.description as string) || `Option ${i + 1}`,
      amount: parseFloat(String(opt.total_amount || opt.amount || opt.total || "0")) || null,
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

  results.new_estimates++;
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
  // Update estimate URL if missing
  const estimateUrl =
    (hcpEstimate.online_estimate_url as string) ||
    (hcpEstimate.customer_url as string) ||
    (hcpEstimate.html_url as string) ||
    null;

  if (estimateUrl && !localEstimate.online_estimate_url) {
    await supabase
      .from("estimates")
      .update({ online_estimate_url: estimateUrl })
      .eq("id", localEstimate.id);
  }

  // Update total_amount if changed (use estimate total or highest option)
  const estTotal = parseFloat(String(
    hcpEstimate.total_amount || hcpEstimate.total || "0"
  )) || null;
  const highestOpt = hcpOptions.reduce((max, o) => {
    const amt = parseFloat(String(o.total_amount || o.amount || o.total || "0")) || 0;
    return amt > max ? amt : max;
  }, 0) || null;
  const hcpTotal = estTotal || highestOpt;

  if (hcpTotal && hcpTotal !== localEstimate.total_amount) {
    await supabase
      .from("estimates")
      .update({ total_amount: hcpTotal })
      .eq("id", localEstimate.id);
  }

  // Skip already-resolved estimates
  if (localEstimate.status === "won" || localEstimate.status === "lost") {
    return;
  }

  // Get local options
  const { data: localOptions } = await supabase
    .from("estimate_options")
    .select("id, hcp_option_id, status")
    .eq("estimate_id", localEstimate.id);

  if (!localOptions || localOptions.length === 0) return;

  // Compare HCP option statuses against ours
  let anyApproved = false;
  let allDeclined = true;
  let changed = false;

  for (const localOption of localOptions) {
    const hcpOption = hcpOptions.find(
      (o) => String(o.id) === String(localOption.hcp_option_id)
    );

    if (!hcpOption) {
      allDeclined = false;
      continue;
    }

    const hcpStatus = String(
      hcpOption.approval_status || hcpOption.status || ""
    ).toLowerCase();

    if (hcpStatus === "approved" && localOption.status === "pending") {
      await supabase
        .from("estimate_options")
        .update({ status: "approved" })
        .eq("id", localOption.id);
      anyApproved = true;
      changed = true;
    } else if (hcpStatus === "declined" && localOption.status === "pending") {
      await supabase
        .from("estimate_options")
        .update({ status: "declined" })
        .eq("id", localOption.id);
      changed = true;
    } else if (localOption.status !== "declined") {
      allDeclined = false;
    }
  }

  if (!changed) return;

  if (anyApproved) {
    // One option approved = estimate won, stop sequence
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
  } else if (allDeclined) {
    // All options declined = estimate lost
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

  results.updated++;
}
