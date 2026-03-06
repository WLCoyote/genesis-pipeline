// Segment filter → Supabase query builder
// Converts campaign audience segment filters into Supabase .filter() chains

import { SupabaseClient } from "@supabase/supabase-js";
import { SegmentFilter, SegmentRule } from "./campaign-types";

/**
 * Build a Supabase query for customers matching a segment filter.
 * Always excludes do_not_contact and marketing_unsubscribed.
 * Caller can further filter by channel (email not null, phone not null).
 */
export function buildSegmentQuery(
  supabase: SupabaseClient,
  filter: SegmentFilter,
  channelType: "email" | "sms"
) {
  let query = supabase
    .from("customers")
    .select("id, name, email, phone, city, zip, state, tags, equipment_type, last_service_date, lead_source, do_not_contact, marketing_unsubscribed, hcp_customer_id")
    .eq("do_not_contact", false)
    .eq("marketing_unsubscribed", false);

  // Channel filter: must have email for email campaigns, phone for SMS
  if (channelType === "email") {
    query = query.not("email", "is", null);
  } else {
    query = query.not("phone", "is", null);
  }

  // Apply segment rules
  if (filter.rules && filter.rules.length > 0) {
    for (const rule of filter.rules) {
      query = applyRule(query, rule);
    }
  }

  return query;
}

/**
 * Count customers matching a segment filter.
 */
export async function countSegmentAudience(
  supabase: SupabaseClient,
  filter: SegmentFilter,
  channelType: "email" | "sms",
  excludeActivePipeline: boolean,
  excludeRecentContactDays: number | null
): Promise<number> {
  let query = supabase
    .from("customers")
    .select("id", { count: "exact", head: true })
    .eq("do_not_contact", false)
    .eq("marketing_unsubscribed", false);

  if (channelType === "email") {
    query = query.not("email", "is", null);
  } else {
    query = query.not("phone", "is", null);
  }

  if (filter.rules && filter.rules.length > 0) {
    for (const rule of filter.rules) {
      query = applyRule(query, rule);
    }
  }

  // Exclude customers with active pipeline estimates
  if (excludeActivePipeline) {
    // Get customer IDs with active estimates
    const { data: activeCustomerIds } = await supabase
      .from("estimates")
      .select("customer_id")
      .in("status", ["active", "sent", "snoozed"]);

    if (activeCustomerIds && activeCustomerIds.length > 0) {
      const ids = [...new Set(activeCustomerIds.map((e) => e.customer_id))];
      query = query.not("id", "in", `(${ids.join(",")})`);
    }
  }

  // Exclude recently contacted customers
  if (excludeRecentContactDays && excludeRecentContactDays > 0) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - excludeRecentContactDays);
    // Exclude customers who have messages within the cutoff
    const { data: recentCustomerIds } = await supabase
      .from("messages")
      .select("customer_id")
      .gte("created_at", cutoff.toISOString())
      .not("customer_id", "is", null);

    if (recentCustomerIds && recentCustomerIds.length > 0) {
      const ids = [...new Set(recentCustomerIds.map((m) => m.customer_id).filter(Boolean))];
      if (ids.length > 0) {
        query = query.not("id", "in", `(${ids.join(",")})`);
      }
    }
  }

  const { count, error } = await query;
  if (error) {
    console.error("[Segment] Count error:", error);
    return 0;
  }
  return count || 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyRule(query: any, rule: SegmentRule) {
  const { field, operator, value } = rule;

  switch (field) {
    case "tags":
      if (operator === "contains_any" && Array.isArray(value)) {
        // Customer tags overlap with any of the filter values
        query = query.overlaps("tags", value);
      } else if (operator === "contains_all" && Array.isArray(value)) {
        query = query.contains("tags", value);
      } else if (operator === "not_contains" && Array.isArray(value)) {
        // No overlap — negate
        for (const v of value) {
          query = query.not("tags", "cs", `{${v}}`);
        }
      }
      break;

    case "equipment_type":
    case "city":
    case "state":
    case "lead_source":
      if (operator === "equals") {
        query = query.eq(field, value);
      } else if (operator === "not_equals") {
        query = query.neq(field, value);
      } else if (operator === "is_empty") {
        query = query.is(field, null);
      } else if (operator === "is_not_empty") {
        query = query.not(field, "is", null);
      }
      break;

    case "zip":
      if (operator === "equals") {
        query = query.eq("zip", value);
      } else if (operator === "in" && Array.isArray(value)) {
        query = query.in("zip", value);
      } else if (operator === "is_empty") {
        query = query.is("zip", null);
      }
      break;

    case "last_service_date":
      if (operator === "older_than_days" && typeof value === "number") {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - value);
        query = query.lt("last_service_date", cutoff.toISOString().split("T")[0]);
      } else if (operator === "newer_than_days" && typeof value === "number") {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - value);
        query = query.gte("last_service_date", cutoff.toISOString().split("T")[0]);
      } else if (operator === "is_empty") {
        query = query.is("last_service_date", null);
      }
      break;

    case "has_estimate":
      // This requires a subquery approach — handled separately
      // For now, skip (audience count handles this via join)
      break;

    case "estimate_status":
      // Handled via join in audience building, not direct filter
      break;
  }

  return query;
}
