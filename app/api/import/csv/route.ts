import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { createServiceClient } from "@/lib/supabase/server";

interface ColumnMapping {
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  hcp_customer_id?: string;
  estimate_number?: string;
  hcp_estimate_id?: string;
  total_amount?: string;
  sent_date?: string;
  assigned_to_email?: string;
  equipment_type?: string;
  lead_source?: string;
  option_description?: string;
  option_amount?: string;
  option_number?: string;
  hcp_option_id?: string;
}

// Normalize phone to E.164 format for US numbers
function normalizePhone(phone: string | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return phone; // Return as-is if format is unexpected
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const mappingJson = formData.get("mapping") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No CSV file provided" }, { status: 400 });
    }

    if (!mappingJson) {
      return NextResponse.json(
        { error: "No column mapping provided" },
        { status: 400 }
      );
    }

    const mapping: ColumnMapping = JSON.parse(mappingJson);
    const csvText = await file.text();

    // Parse CSV
    const { data: rows, errors: parseErrors } = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
    });

    if (parseErrors.length > 0) {
      console.error("CSV parse errors:", parseErrors);
    }

    const supabase = createServiceClient();

    // Get the default follow-up sequence
    const { data: defaultSequence } = await supabase
      .from("follow_up_sequences")
      .select("id")
      .eq("is_default", true)
      .limit(1)
      .single();

    // Get auto_decline_days for calculating auto_decline_date
    const { data: setting } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "auto_decline_days")
      .single();

    const autoDeclineDays = (setting?.value as number) || 60;

    // Build a lookup of user emails to IDs for comfort pro assignment
    const { data: users } = await supabase
      .from("users")
      .select("id, email, name");

    const userByEmail = Object.fromEntries(
      (users || []).map((u) => [u.email.toLowerCase(), u])
    );
    const userByName = Object.fromEntries(
      (users || []).map((u) => [u.name.toLowerCase(), u])
    );

    const results = {
      customers_created: 0,
      customers_updated: 0,
      estimates_created: 0,
      estimates_updated: 0,
      options_created: 0,
      rows_processed: 0,
      rows_skipped: 0,
      errors: [] as string[],
    };

    for (const row of rows as Record<string, string>[]) {
      results.rows_processed++;

      try {
        // Extract fields using column mapping
        const customerName = row[mapping.customer_name || ""] || "";
        const customerEmail = row[mapping.customer_email || ""] || "";
        const customerPhone = normalizePhone(row[mapping.customer_phone || ""]);
        const customerAddress = row[mapping.customer_address || ""] || "";
        const hcpCustomerId = row[mapping.hcp_customer_id || ""] || "";
        const estimateNumber = row[mapping.estimate_number || ""] || "";
        const hcpEstimateId = row[mapping.hcp_estimate_id || ""] || "";
        const totalAmount = parseFloat(row[mapping.total_amount || ""] || "0") || null;
        const sentDateStr = row[mapping.sent_date || ""] || "";
        const assignedToStr = row[mapping.assigned_to_email || ""] || "";
        const equipmentType = row[mapping.equipment_type || ""] || "";
        const leadSource = row[mapping.lead_source || ""] || "";

        if (!customerName && !estimateNumber) {
          results.rows_skipped++;
          continue;
        }

        // Upsert customer
        let customerId: string;

        if (hcpCustomerId) {
          // Try to match by HCP customer ID
          const { data: existing } = await supabase
            .from("customers")
            .select("id")
            .eq("hcp_customer_id", hcpCustomerId)
            .limit(1)
            .single();

          if (existing) {
            // Update existing customer
            await supabase
              .from("customers")
              .update({
                name: customerName || undefined,
                email: customerEmail || undefined,
                phone: customerPhone || undefined,
                address: customerAddress || undefined,
                equipment_type: equipmentType || undefined,
                lead_source: leadSource || undefined,
              })
              .eq("id", existing.id);

            customerId = existing.id;
            results.customers_updated++;
          } else {
            // Create new customer
            const { data: newCustomer, error: custError } = await supabase
              .from("customers")
              .insert({
                hcp_customer_id: hcpCustomerId,
                name: customerName || "Unknown",
                email: customerEmail || null,
                phone: customerPhone,
                address: customerAddress || null,
                equipment_type: equipmentType || null,
                lead_source: leadSource || null,
              })
              .select("id")
              .single();

            if (custError || !newCustomer) {
              results.errors.push(
                `Row ${results.rows_processed}: Failed to create customer — ${custError?.message}`
              );
              continue;
            }

            customerId = newCustomer.id;
            results.customers_created++;
          }
        } else {
          // No HCP ID — try email match, then create
          let existing = null;
          if (customerEmail) {
            const { data } = await supabase
              .from("customers")
              .select("id")
              .eq("email", customerEmail)
              .limit(1)
              .single();
            existing = data;
          }

          if (existing) {
            customerId = existing.id;
            results.customers_updated++;
          } else {
            const { data: newCustomer, error: custError } = await supabase
              .from("customers")
              .insert({
                name: customerName || "Unknown",
                email: customerEmail || null,
                phone: customerPhone,
                address: customerAddress || null,
                equipment_type: equipmentType || null,
                lead_source: leadSource || null,
              })
              .select("id")
              .single();

            if (custError || !newCustomer) {
              results.errors.push(
                `Row ${results.rows_processed}: Failed to create customer — ${custError?.message}`
              );
              continue;
            }

            customerId = newCustomer.id;
            results.customers_created++;
          }
        }

        // Skip estimate creation if no estimate number
        if (!estimateNumber) continue;

        // Resolve assigned comfort pro
        let assignedTo: string | null = null;
        if (assignedToStr) {
          const lookup =
            userByEmail[assignedToStr.toLowerCase()] ||
            userByName[assignedToStr.toLowerCase()];
          assignedTo = lookup?.id || null;
        }

        // Calculate auto_decline_date from sent_date
        const sentDate = sentDateStr ? new Date(sentDateStr) : new Date();
        const autoDeclineDate = new Date(sentDate);
        autoDeclineDate.setDate(autoDeclineDate.getDate() + autoDeclineDays);

        // Upsert estimate (dedup on estimate_number)
        const { data: existingEstimate } = await supabase
          .from("estimates")
          .select("id")
          .eq("estimate_number", estimateNumber)
          .limit(1)
          .single();

        let estimateId: string;

        if (existingEstimate) {
          // Update existing estimate
          await supabase
            .from("estimates")
            .update({
              hcp_estimate_id: hcpEstimateId || undefined,
              total_amount: totalAmount,
              assigned_to: assignedTo || undefined,
            })
            .eq("id", existingEstimate.id);

          estimateId = existingEstimate.id;
          results.estimates_updated++;
        } else {
          // Create new estimate and enroll in default sequence
          const { data: newEstimate, error: estError } = await supabase
            .from("estimates")
            .insert({
              estimate_number: estimateNumber,
              hcp_estimate_id: hcpEstimateId || null,
              customer_id: customerId,
              assigned_to: assignedTo,
              status: "active",
              total_amount: totalAmount,
              sent_date: sentDate.toISOString().split("T")[0],
              sequence_id: defaultSequence?.id || null,
              sequence_step_index: 0,
              auto_decline_date: autoDeclineDate.toISOString().split("T")[0],
            })
            .select("id")
            .single();

          if (estError || !newEstimate) {
            results.errors.push(
              `Row ${results.rows_processed}: Failed to create estimate ${estimateNumber} — ${estError?.message}`
            );
            continue;
          }

          estimateId = newEstimate.id;
          results.estimates_created++;

          // Notify the assigned comfort pro
          if (assignedTo) {
            await supabase.from("notifications").insert({
              user_id: assignedTo,
              type: "lead_assigned",
              estimate_id: estimateId,
              message: `New estimate assigned: ${customerName} — $${totalAmount || 0}`,
            });
          }
        }

        // Create estimate option if option data is present
        const optionDesc = row[mapping.option_description || ""] || "";
        const optionAmount =
          parseFloat(row[mapping.option_amount || ""] || "0") || null;
        const optionNumber =
          parseInt(row[mapping.option_number || ""] || "1") || 1;
        const hcpOptionId = row[mapping.hcp_option_id || ""] || "";

        if (optionDesc || optionAmount) {
          // Check if option already exists
          const optionQuery = supabase
            .from("estimate_options")
            .select("id")
            .eq("estimate_id", estimateId)
            .eq("option_number", optionNumber);

          const { data: existingOption } = await optionQuery.limit(1).single();

          if (!existingOption) {
            await supabase.from("estimate_options").insert({
              estimate_id: estimateId,
              hcp_option_id: hcpOptionId || null,
              option_number: optionNumber,
              description: optionDesc || null,
              amount: optionAmount,
              status: "pending",
            });

            results.options_created++;
          }
        }
      } catch (rowErr) {
        results.errors.push(
          `Row ${results.rows_processed}: ${rowErr instanceof Error ? rowErr.message : "Unknown error"}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error("CSV import error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
