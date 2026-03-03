/**
 * GET /api/cron/confirm-commission
 * Daily cron: checks estimated commission records against QBO invoices.
 * If invoice is paid, confirms the commission with actual pre-tax revenue.
 * Auth: CRON_SECRET (same as other crons)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { calculateConfirmed } from "@/lib/commission";
import { getInvoiceByEstimateNumber, isInvoicePaid, getPreTaxTotal, isQboConnected } from "@/lib/qbo";
import { sendEstimateNotifications } from "@/lib/notifications";
import { fireWebhookEvent } from "@/lib/webhooks";

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const results = { checked: 0, confirmed: 0, skipped: 0, errors: 0 };

  // Check QBO connection
  const qboConnected = await isQboConnected();
  if (!qboConnected) {
    return NextResponse.json({
      success: true,
      message: "QBO not connected — skipping commission confirmation",
      ...results,
      timestamp: new Date().toISOString(),
    });
  }

  // Fetch all estimated (unconfirmed) commission records
  const { data: records, error: fetchError } = await supabase
    .from("commission_records")
    .select(`
      id, estimate_id, user_id,
      estimates!commission_records_estimate_id_fkey (
        estimate_number, customer_id, assigned_to,
        customers ( name )
      )
    `)
    .eq("status", "estimated");

  if (fetchError) {
    console.error("[ConfirmCommission] Failed to fetch records:", fetchError);
    return NextResponse.json({ error: "Failed to fetch records" }, { status: 500 });
  }

  if (!records || records.length === 0) {
    return NextResponse.json({
      success: true,
      message: "No estimated records to check",
      ...results,
      timestamp: new Date().toISOString(),
    });
  }

  for (const record of records) {
    results.checked++;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const estimate = record.estimates as any;
      if (!estimate?.estimate_number) {
        results.skipped++;
        continue;
      }

      // Look up QBO invoice by estimate number
      const invoice = await getInvoiceByEstimateNumber(estimate.estimate_number);
      if (!invoice) {
        results.skipped++;
        continue;
      }

      // Check if invoice is paid
      if (!isInvoicePaid(invoice)) {
        results.skipped++;
        continue;
      }

      // Invoice is paid — confirm commission
      const preTaxRevenue = getPreTaxTotal(invoice);
      const confirmed = await calculateConfirmed(record.id, preTaxRevenue);

      if (confirmed) {
        results.confirmed++;

        // Fire webhook
        fireWebhookEvent({
          event: "commission.confirmed",
          data: {
            record_id: record.id,
            estimate_id: record.estimate_id,
            estimate_number: estimate.estimate_number,
            pre_tax_revenue: preTaxRevenue,
          },
        });

        // Send confirmation notification
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const customerName = (estimate.customers as any)?.name || "Customer";

        try {
          await sendEstimateNotifications(
            {
              type: "commission_confirmed",
              estimateId: record.estimate_id,
              estimateNumber: estimate.estimate_number,
              customerName,
              message: `Commission confirmed for ${customerName} — ${estimate.estimate_number}`,
              amount: preTaxRevenue,
            },
            record.user_id
          );
        } catch (notifyErr) {
          console.error("[ConfirmCommission] Notification failed:", notifyErr);
        }
      } else {
        results.errors++;
      }
    } catch (err) {
      console.error(`[ConfirmCommission] Error processing record ${record.id}:`, err);
      results.errors++;
    }
  }

  console.log("[ConfirmCommission] Run complete:", results);

  return NextResponse.json({
    success: true,
    ...results,
    timestamp: new Date().toISOString(),
  });
}
